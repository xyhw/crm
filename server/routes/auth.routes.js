import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { nanoid } from 'nanoid';
import { query, queryOne, insert, update, transaction } from '../db.js';
import { signToken, signRefreshToken, verifyRefreshToken, authRequired } from '../auth.js';
import { loginLimiter } from '../middleware/rate-limit.js';
import { sendResetCodeEmail } from '../services/mail.service.js';

const router = Router();

const RESET_CODE_TTL = 5 * 60; // 验证码有效期 5 分钟

// 注册
router.post('/register', async (req, res) => {
  try {
    const { phone, password, nickname, email, company, category, inviteCode } = req.body || {};
    
    if (!phone || !password || !nickname) {
      return res.json({ code: 400, message: '请完善必填信息' });
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

    // 生成唯一邀请码
    const userInviteCode = nanoid(8).toUpperCase();
    const passwordHash = await bcrypt.hash(password, 10);

    await transaction(async (conn) => {
      // 创建用户
      const [userResult] = await conn.execute(
        `INSERT INTO users (phone, password_hash, nickname, email, company, category, invite_code, invited_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [phone, passwordHash, nickname, email || null, company || null, category || null, userInviteCode, invitedBy]
      );
      const userId = userResult.insertId;

      // 创建积分账户
      await conn.execute(
        'INSERT INTO points_accounts (user_id, balance) VALUES (?, 0)',
        [userId]
      );

      // 创建等级统计
      await conn.execute(
        'INSERT INTO user_level_stats (user_id, level) VALUES (?, ?)',
        [userId, 'normal']
      );

      // 注册赠送积分
      const [configRow] = await conn.execute(
        "SELECT config_value FROM system_configs WHERE config_key = 'register_gift_points'"
      );
      const giftPoints = parseInt(configRow[0]?.config_value || '10');
      
      if (giftPoints > 0) {
        await conn.execute(
          'UPDATE points_accounts SET balance = balance + ? WHERE user_id = ?',
          [giftPoints, userId]
        );
        await conn.execute(
          `INSERT INTO points_logs (user_id, delta, balance_after, source_type, source_title)
           VALUES (?, ?, ?, 'register_gift', '注册赠送')`,
          [userId, giftPoints, giftPoints]
        );
      }

      // 处理邀请奖励
      if (invitedBy) {
        const [inviteConfig] = await conn.execute(
          "SELECT config_value FROM system_configs WHERE config_key = 'invite_reward_points'"
        );
        const rewardPoints = parseInt(inviteConfig[0]?.config_value || '5');
        
        if (rewardPoints > 0) {
          // 给邀请人加积分
          await conn.execute(
            'UPDATE points_accounts SET balance = balance + ? WHERE user_id = ?',
            [rewardPoints, invitedBy]
          );
          const [inviterAccount] = await conn.execute(
            'SELECT balance FROM points_accounts WHERE user_id = ?',
            [invitedBy]
          );
          await conn.execute(
            `INSERT INTO points_logs (user_id, delta, balance_after, source_type, source_title)
             VALUES (?, ?, ?, 'invite_gift', ?)`,
            [invitedBy, rewardPoints, inviterAccount[0].balance, `邀请 ${nickname} 注册`]
          );

          // 给被邀请人加积分
          await conn.execute(
            'UPDATE points_accounts SET balance = balance + ? WHERE user_id = ?',
            [rewardPoints, userId]
          );
          await conn.execute(
            `INSERT INTO points_logs (user_id, delta, balance_after, source_type, source_title)
             VALUES (?, ?, ?, 'invite_gift', '邀请注册奖励')`,
            [userId, rewardPoints, giftPoints + rewardPoints]
          );

          // 记录邀请
          await conn.execute(
            `INSERT INTO invitations (inviter_id, invitee_id, invite_code, status, inviter_reward, invitee_reward, completed_at)
             VALUES (?, ?, ?, 'completed', ?, ?, NOW())`,
            [invitedBy, userId, inviteCode, rewardPoints, rewardPoints]
          );
        }
      }
    });

    // 查询用户信息返回
    const user = await queryOne('SELECT * FROM users WHERE phone = ?', [phone]);
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
          email: user.email,
          company: user.company,
          category: user.category,
          inviteCode: user.invite_code,
        },
      },
      message: '注册成功',
    });
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

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.json({ code: 400, message: '密码错误' });
    }

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

// 发送找回密码验证码（按邮箱查询，发到该邮箱）
router.post('/send-reset-code', loginLimiter, async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.json({ code: 400, message: '请输入正确的邮箱' });
    }

    const user = await queryOne('SELECT id, email FROM users WHERE email = ? AND deleted_at IS NULL', [email]);
    if (!user) {
      return res.json({ code: 404, message: '该邮箱未注册' });
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
router.post('/reset-password', async (req, res) => {
  try {
    const { email, code, newPassword } = req.body || {};
    if (!email || !code) {
      return res.json({ code: 400, message: '请输入邮箱和验证码' });
    }
    if (!newPassword || newPassword.length < 6) {
      return res.json({ code: 400, message: '新密码长度至少 6 位' });
    }

    const user = await queryOne('SELECT id FROM users WHERE email = ? AND deleted_at IS NULL', [email]);
    if (!user) {
      return res.json({ code: 404, message: '该邮箱未注册' });
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

    const codeHash = crypto.createHash('sha256').update(String(code)).digest('hex');
    if (record.code_hash !== codeHash) {
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
    if (newPassword.length < 6) {
      return res.json({ code: 400, message: '新密码长度至少 6 位' });
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
