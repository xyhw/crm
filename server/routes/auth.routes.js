import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { nanoid } from 'nanoid';
import { query, queryOne, insert, update, transaction } from '../db.js';
import { signToken, signRefreshToken, verifyRefreshToken, authRequired } from '../auth.js';
import { loginLimiter } from '../middleware/rate-limit.js';
import { sendResetCodeEmail } from '../services/mail.service.js';
import { isAccountLocked, recordLoginFailure, clearLoginFailures } from '../services/account-lock.service.js';
import { isWechatConfigured, code2Session, getPhoneByCode } from '../services/wechat.service.js';

const router = Router();

const RESET_CODE_TTL = 5 * 60; // 验证码有效期 5 分钟
const RESET_CODE_MAX_ATTEMPTS = 5; // 验证码最多尝试 5 次，超限作废需重新获取

// 微信小程序登录链路真实实现（凭据 WX_MINIAPP_APPID / WX_MINIAPP_SECRET 未配置时优雅降级为提示）。
// 数据库字段已就绪：users.wechat_openid / wechat_unionid（migration 014，openid 唯一索引）。

/**
 * 登录态响应的统一 user 结构（与 login/register 保持一致）
 */
function buildUserPayload(user) {
  return {
    id: user.id,
    phone: user.phone,
    nickname: user.nickname,
    avatar: user.avatar,
    email: user.email,
    company: user.company,
    category: user.category,
    inviteCode: user.invite_code,
    wechatBound: Boolean(user.wechat_openid),
  };
}

function issueSession(user) {
  return {
    token: signToken(user),
    refreshToken: signRefreshToken(user),
    user: buildUserPayload(user),
  };
}

/**
 * 在事务中创建新用户并发放注册赠送积分、邀请奖励。
 * 被 register 与 bind-wechat（新用户路径）共用，保证行为一致。
 * @returns {number} 新用户 id
 */
async function createUserWithGifts(conn, { phone, passwordHash, nickname, email, company, category, invitedBy, inviteCode }) {
  const userInviteCode = nanoid(8).toUpperCase();
  const [userResult] = await conn.execute(
    `INSERT INTO users (phone, password_hash, nickname, email, company, category, invite_code, invited_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [phone, passwordHash, nickname, email || null, company || null, category || null, userInviteCode, invitedBy]
  );
  const userId = userResult.insertId;

  await conn.execute('INSERT INTO points_accounts (user_id, balance) VALUES (?, 0)', [userId]);
  await conn.execute("INSERT INTO user_level_stats (user_id, level) VALUES (?, 'normal')", [userId]);

  // 注册赠送积分
  const [configRow] = await conn.execute(
    "SELECT config_value FROM system_configs WHERE config_key = 'register_gift_points'"
  );
  const giftPoints = parseInt(configRow[0]?.config_value || '10');

  if (giftPoints > 0) {
    await conn.execute('UPDATE points_accounts SET balance = balance + ? WHERE user_id = ?', [
      giftPoints,
      userId,
    ]);
    await conn.execute(
      `INSERT INTO points_logs (user_id, delta, balance_after, source_type, source_title)
       VALUES (?, ?, ?, 'register_gift', '注册赠送')`,
      [userId, giftPoints, giftPoints]
    );
  }

  // 邀请奖励
  if (invitedBy) {
    const [inviteConfig] = await conn.execute(
      "SELECT config_value FROM system_configs WHERE config_key = 'invite_reward_points'"
    );
    const rewardPoints = parseInt(inviteConfig[0]?.config_value || '5');

    if (rewardPoints > 0) {
      await conn.execute('UPDATE points_accounts SET balance = balance + ? WHERE user_id = ?', [
        rewardPoints,
        invitedBy,
      ]);
      const [inviterAccount] = await conn.execute(
        'SELECT balance FROM points_accounts WHERE user_id = ?',
        [invitedBy]
      );
      await conn.execute(
        `INSERT INTO points_logs (user_id, delta, balance_after, source_type, source_title)
         VALUES (?, ?, ?, 'invite_gift', ?)`,
        [invitedBy, rewardPoints, inviterAccount[0].balance, `邀请 ${nickname} 注册`]
      );

      await conn.execute('UPDATE points_accounts SET balance = balance + ? WHERE user_id = ?', [
        rewardPoints,
        userId,
      ]);
      await conn.execute(
        `INSERT INTO points_logs (user_id, delta, balance_after, source_type, source_title)
         VALUES (?, ?, ?, 'invite_gift', '邀请注册奖励')`,
        [userId, rewardPoints, giftPoints + rewardPoints]
      );

      await conn.execute(
        `INSERT INTO invitations (inviter_id, invitee_id, invite_code, status, inviter_reward, invitee_reward, completed_at)
         VALUES (?, ?, ?, 'completed', ?, ?, NOW())`,
        [invitedBy, userId, inviteCode || null, rewardPoints, rewardPoints]
      );
    }
  }

  return userId;
}

// 微信登录：wx.login code -> openid -> 已绑定直接登录 / 未绑定返回待绑定标识
router.post('/wechat-login', async (req, res) => {
  try {
    if (!isWechatConfigured()) {
      return res.json({ code: 40401, message: '微信登录暂未配置，请使用手机号登录' });
    }
    const { code } = req.body || {};
    if (!code) {
      return res.json({ code: 400, message: '缺少微信登录凭证' });
    }

    const session = await code2Session(code);
    const user = await queryOne('SELECT * FROM users WHERE wechat_openid = ?', [session.openid]);

    if (!user) {
      // 未绑定任何账号，交给前端引导手机号验证绑定
      return res.json({ code: 0, data: { bound: false, openid: session.openid, unionid: session.unionid || null } });
    }
    if (user.status === 'banned' || user.deleted_at) {
      return res.json({ code: 400, message: '账号已被禁用' });
    }
    if (session.unionid && !user.wechat_unionid) {
      await update('users', { wechat_unionid: session.unionid }, 'id = ?', [user.id]);
    }
    return res.json({ code: 0, data: { bound: true, ...issueSession(user) } });
  } catch (err) {
    console.error('Wechat login error:', err);
    return res.json({ code: 500, message: err.message || '微信登录失败' });
  }
});

// 绑定微信：openid + 手机号（存在则绑定已有账号，不存在则自动注册）
router.post('/bind-wechat', async (req, res) => {
  try {
    if (!isWechatConfigured()) {
      return res.json({ code: 40401, message: '微信登录暂未配置，请使用手机号登录' });
    }
    const { openid, unionid, phone, nickname, inviteCode } = req.body || {};
    if (!openid || !/^1\d{10}$/.test(phone || '')) {
      return res.json({ code: 400, message: '缺少微信标识或手机号无效' });
    }

    // openid 已被其他账号占用（理论上前端不会走到这里，防御性校验）
    const conflict = await queryOne('SELECT id FROM users WHERE wechat_openid = ?', [openid]);
    if (conflict) {
      return res.json({ code: 400, message: '该微信已绑定其他账号，请直接用微信登录' });
    }

    // 解析邀请码
    let invitedBy = null;
    if (inviteCode) {
      const inviter = await queryOne('SELECT id FROM users WHERE invite_code = ?', [inviteCode]);
      if (!inviter) {
        return res.json({ code: 400, message: '邀请码无效' });
      }
      invitedBy = inviter.id;
    }

    const existingUser = await queryOne('SELECT * FROM users WHERE phone = ?', [phone]);
    let user;

    if (existingUser) {
      // 已有账号：绑定微信后直接登录
      if (existingUser.status === 'banned' || existingUser.deleted_at) {
        return res.json({ code: 400, message: '账号已被禁用' });
      }
      await update('users', {
        wechat_openid: openid,
        ...(unionid && !existingUser.wechat_unionid ? { wechat_unionid: unionid } : {}),
      }, 'id = ?', [existingUser.id]);
      user = await queryOne('SELECT * FROM users WHERE id = ?', [existingUser.id]);
    } else {
      // 新用户：随机强密码占位（用户可后续通过找回密码重置），昵称默认「微信用户」截尾
      const randomPassword = nanoid(24);
      const passwordHash = await bcrypt.hash(randomPassword, 10);
      const defaultNickname =
        (nickname || `微信用户${phone.slice(-4)}`).trim().slice(0, 50) || `微信用户${phone.slice(-4)}`;

      await transaction(async (conn) => {
        const userId = await createUserWithGifts(conn, {
          phone,
          passwordHash,
          nickname: defaultNickname,
          invitedBy,
          inviteCode,
        });
        // 补充微信绑定信息
        await conn.execute('UPDATE users SET wechat_openid = ?, wechat_unionid = ? WHERE id = ?', [
          openid,
          unionid || null,
          userId,
        ]);
      });
      user = await queryOne('SELECT * FROM users WHERE wechat_openid = ?', [openid]);
    }

    return res.json({ code: 0, data: issueSession(user), message: existingUser ? '绑定成功' : '注册成功' });
  } catch (err) {
    console.error('Bind wechat error:', err);
    return res.json({ code: 500, message: err.message || '微信绑定失败' });
  }
});

// 微信手机号解密：button open-type="getPhoneNumber" 的动态 code -> 手机号
router.post('/phone', async (req, res) => {
  try {
    if (!isWechatConfigured()) {
      return res.json({ code: 40401, message: '微信能力暂未配置，请手动输入手机号' });
    }
    const { code } = req.body || {};
    if (!code) {
      return res.json({ code: 400, message: '缺少手机号获取凭证' });
    }
    const phone = await getPhoneByCode(code);
    return res.json({ code: 0, data: { phone } });
  } catch (err) {
    console.error('Wechat phone error:', err);
    return res.json({ code: 500, message: err.message || '手机号获取失败' });
  }
});

// 注册
router.post('/register', async (req, res) => {
  try {
    const { phone, password, nickname, email, company, category, inviteCode } = req.body || {};
    
    if (!phone || !password || !nickname) {
      return res.json({ code: 400, message: '请完善必填信息' });
    }

    if (!/^.{8,}$/.test(password) || !/[a-zA-Z]/.test(password) || !/\d/.test(password)) {
      return res.json({ code: 400, message: '密码至少 8 位，且必须包含字母和数字' });
    }

    if (email !== undefined && email !== '' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.json({ code: 400, message: '邮箱格式不正确' });
    }

    // 检查手机号是否已注册
    const existing = await queryOne('SELECT id FROM users WHERE phone = ?', [phone]);
    if (existing) {
      return res.json({ code: 400, message: '该手机号已注册' });
    }

    // 检查邀请码
    let invitedBy = null;
    if (inviteCode) {
      const inviter = await queryOne('SELECT id FROM users WHERE invite_code = ?', [inviteCode]);
      if (!inviter) {
        return res.json({ code: 400, message: '邀请码无效' });
      }
      invitedBy = inviter.id;
    }

    // 生成唯一邀请码由 helper 内部处理
    const passwordHash = await bcrypt.hash(password, 10);

    await transaction(async (conn) => {
      await createUserWithGifts(conn, {
        phone,
        passwordHash,
        nickname,
        email,
        company,
        category,
        invitedBy,
        inviteCode,
      });
    });

    // 查询用户信息返回
    const user = await queryOne('SELECT * FROM users WHERE phone = ?', [phone]);
    res.json({ code: 0, data: issueSession(user), message: '注册成功' });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ code: 500, message: '注册失败' });
  }
});

// 登录
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { phone, password } = req.body || {};
    
    if (!phone || !password) {
      return res.json({ code: 400, message: '请输入手机号和密码' });
    }

    const user = await queryOne('SELECT * FROM users WHERE phone = ? AND deleted_at IS NULL', [phone]);
    if (!user) {
      return res.json({ code: 400, message: '手机号未注册' });
    }

    if (user.status === 'banned') {
      return res.json({ code: 400, message: '账号已被禁用' });
    }

    // 账号级连续失败锁定（防分布式 IP 暴力破解）
    if (await isAccountLocked(user.id)) {
      return res.json({ code: 429, message: '尝试次数过多，请 15 分钟后再试' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      await recordLoginFailure(user.id);
      return res.json({ code: 400, message: '密码错误' });
    }
    await clearLoginFailures(user.id);

    const token = signToken(user);
    const refreshToken = signRefreshToken(user);

    res.json({
      code: 0,
      data: {
        token,
        refreshToken,
        user: {
          id: user.id,
          phone: user.phone,
          nickname: user.nickname,
          avatar: user.avatar,
          company: user.company,
          inviteCode: user.invite_code,
        },
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ code: 500, message: '登录失败' });
  }
});

// 刷新 Token
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body || {};
    if (!refreshToken) {
      return res.status(401).json({ code: 401, message: 'refreshToken 不能为空' });
    }

    const payload = verifyRefreshToken(refreshToken);
    if (!payload || payload.type !== 'user') {
      return res.status(401).json({ code: 401, message: 'refreshToken 无效' });
    }

    const user = await queryOne('SELECT * FROM users WHERE id = ? AND deleted_at IS NULL', [payload.id]);
    if (!user || user.status === 'banned') {
      return res.status(401).json({ code: 401, message: '用户不存在或已禁用' });
    }

    // token_version 不匹配（改密码/重置密码后已作废），拒绝续期
    if (payload.tok_version !== user.token_version) {
      return res.status(401).json({ code: 401, message: '登录已失效，请重新登录' });
    }

    const newToken = signToken(user);
    const newRefreshToken = signRefreshToken(user);

    res.json({
      code: 0,
      data: { token: newToken, refreshToken: newRefreshToken },
    });
  } catch (err) {
    console.error('Refresh error:', err);
    res.status(500).json({ code: 500, message: '刷新失败' });
  }
});

// 获取当前用户信息
router.get('/me', authRequired, async (req, res) => {
  try {
    const user = await queryOne(
      `SELECT u.*, pa.balance as points_balance, uls.level 
       FROM users u
       LEFT JOIN points_accounts pa ON u.id = pa.user_id
       LEFT JOIN user_level_stats uls ON u.id = uls.user_id
       WHERE u.id = ? AND u.deleted_at IS NULL`,
      [req.userId]
    );
    
    if (!user) {
      return res.json({ code: 404, message: '用户不存在' });
    }

    res.json({
      code: 0,
      data: {
        id: user.id,
        phone: user.phone,
        nickname: user.nickname,
        avatar: user.avatar,
        email: user.email,
        company: user.company,
        category: user.category,
        bio: user.bio,
        qualifications: user.qualifications,
        cases: user.cases,
        inviteCode: user.invite_code,
        creditScore: user.credit_score,
        pointsBalance: user.points_balance || 0,
        level: user.level || 'normal',
        createdAt: user.created_at,
      },
    });
  } catch (err) {
    console.error('Get me error:', err);
    res.status(500).json({ code: 500, message: '获取用户信息失败' });
  }
});

// 更新用户信息
router.put('/me', authRequired, async (req, res) => {
  try {
    const { nickname, avatar, company, category, bio, qualifications, cases } = req.body || {};
    
    const updates = {};
    if (nickname !== undefined) updates.nickname = nickname;
    if (avatar !== undefined) updates.avatar = avatar;
    if (company !== undefined) updates.company = company;
    if (category !== undefined) updates.category = category;
    if (bio !== undefined) updates.bio = bio;
    if (qualifications !== undefined) updates.qualifications = qualifications;
    if (cases !== undefined) updates.cases = cases;

    if (Object.keys(updates).length === 0) {
      return res.json({ code: 400, message: '没有需要更新的信息' });
    }

    await update('users', updates, 'id = ?', [req.userId]);

    const user = await queryOne('SELECT * FROM users WHERE id = ?', [req.userId]);
    res.json({
      code: 0,
      data: {
        id: user.id,
        phone: user.phone,
        nickname: user.nickname,
        avatar: user.avatar,
        email: user.email,
        company: user.company,
        category: user.category,
        bio: user.bio,
        qualifications: user.qualifications,
        cases: user.cases,
      },
      message: '更新成功',
    });
  } catch (err) {
    console.error('Update me error:', err);
    res.status(500).json({ code: 500, message: '更新失败' });
  }
});

// 发送找回密码验证码（按邮箱查询，防账号枚举：未注册也返回统一成功文案）
router.post('/send-reset-code', loginLimiter, async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.json({ code: 400, message: '请输入正确的邮箱' });
    }

    const user = await queryOne('SELECT id, email FROM users WHERE email = ? AND deleted_at IS NULL', [email]);
    // 未注册邮箱不返回区分提示，统一成功，防止枚举
    if (!user) {
      return res.json({ code: 0, message: '验证码已发送至绑定邮箱，5 分钟内有效' });
    }

    // 作废该用户之前未使用的验证码，避免旧码残留
    await update('password_reset_codes', { used_at: new Date() }, 'user_id = ? AND used_at IS NULL', [user.id]);

    const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
    const codeHash = crypto.createHash('sha256').update(code).digest('hex');
    const expiresAt = new Date(Date.now() + RESET_CODE_TTL * 1000);

    await insert('password_reset_codes', {
      user_id: user.id,
      code_hash: codeHash,
      expires_at: expiresAt,
    });

    await sendResetCodeEmail(user.email, code);

    res.json({ code: 0, message: '验证码已发送至绑定邮箱，5 分钟内有效' });
  } catch (err) {
    console.error('Send reset code error:', err);
    if (err.message && err.message.includes('未绑定邮箱')) {
      return res.status(400).json({ code: 400, message: err.message });
    }
    res.status(500).json({ code: 500, message: '发送验证码失败' });
  }
});

// 忘记密码 - 邮箱 + 验证码 + 用户自设新密码
// 限流 + 验证码尝试次数上限，防止 6 位数字验证码被暴力枚举
router.post('/reset-password', loginLimiter, async (req, res) => {
  try {
    const { email, code, newPassword } = req.body || {};
    if (!email || !code) {
      return res.json({ code: 400, message: '请输入邮箱和验证码' });
    }
    if (!/^.{8,}$/.test(newPassword) || !/[a-zA-Z]/.test(newPassword) || !/\d/.test(newPassword)) {
      return res.json({ code: 400, message: '新密码至少 8 位，且必须包含字母和数字' });
    }

    const user = await queryOne('SELECT id FROM users WHERE email = ? AND deleted_at IS NULL', [email]);
    if (!user) {
      return res.json({ code: 400, message: '验证码无效或已过期' });
    }

    // 校验验证码（未使用且未过期）
    const record = await queryOne(
      `SELECT * FROM password_reset_codes
       WHERE user_id = ? AND used_at IS NULL AND expires_at > NOW()
       ORDER BY id DESC LIMIT 1`,
      [user.id]
    );
    if (!record) {
      return res.json({ code: 400, message: '验证码无效或已过期' });
    }

    // 尝试次数超限，作废验证码，要求重新获取
    if (record.attempts >= RESET_CODE_MAX_ATTEMPTS) {
      await query('UPDATE password_reset_codes SET used_at = NOW() WHERE id = ?', [record.id]);
      return res.json({ code: 400, message: '验证码尝试次数过多，请重新获取' });
    }

    const codeHash = crypto.createHash('sha256').update(String(code)).digest('hex');
    if (record.code_hash !== codeHash) {
      await query('UPDATE password_reset_codes SET attempts = attempts + 1 WHERE id = ?', [record.id]);
      return res.json({ code: 400, message: '验证码不正确' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await transaction(async (conn) => {
      await conn.execute(
        'UPDATE users SET password_hash = ?, token_version = token_version + 1 WHERE id = ?',
        [passwordHash, user.id]
      );
      await conn.execute(
        'UPDATE password_reset_codes SET used_at = NOW() WHERE id = ?',
        [record.id]
      );
    });

    res.json({ code: 0, message: '密码重置成功，请使用新密码登录' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ code: 500, message: '重置失败' });
  }
});

// 修改密码（登录状态下，需校验旧密码）
router.put('/change-password', authRequired, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body || {};
    if (!oldPassword || !newPassword) {
      return res.json({ code: 400, message: '请输入旧密码和新密码' });
    }
    if (!/^.{8,}$/.test(newPassword) || !/[a-zA-Z]/.test(newPassword) || !/\d/.test(newPassword)) {
      return res.json({ code: 400, message: '新密码至少 8 位，且必须包含字母和数字' });
    }

    const user = await queryOne('SELECT password_hash FROM users WHERE id = ?', [req.userId]);
    if (!user) {
      return res.json({ code: 404, message: '用户不存在' });
    }

    const valid = await bcrypt.compare(oldPassword, user.password_hash);
    if (!valid) {
      return res.json({ code: 400, message: '旧密码不正确' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await update('users', { password_hash: passwordHash }, 'id = ?', [req.userId]);
    // 使所有已签发 Token 失效，需重新登录（或前端刷新 Token）
    await query('UPDATE users SET token_version = token_version + 1 WHERE id = ?', [req.userId]);

    res.json({ code: 0, message: '密码修改成功，请重新登录' });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ code: 500, message: '修改失败' });
  }
});

export default router;
