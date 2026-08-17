import mysql from 'mysql2/promise';

const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'hof_user',
  password: process.env.DB_PASS || 'hof_pass_2026',
  database: process.env.DB_NAME || 'hotel_order_follow',
  charset: 'utf8mb4',
};

const FOLLOW_UP_STATUS_ENUM = ['call_no_answer', 'added_wechat', 'interested', 'quoting', 'negotiating', 'closed', 'abandoned'];

async function columnExists(conn, table, column) {
  const [rows] = await conn.execute(
    `SELECT COUNT(*) AS cnt FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [DB_CONFIG.database, table, column]
  );
  return rows[0].cnt > 0;
}

async function addColumnIfMissing(conn, table, column, definition) {
  if (await columnExists(conn, table, column)) {
    console.log(`[migration] ${table}.${column} already exists, skip`);
    return;
  }
  await conn.execute(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  console.log(`[migration] ${table}.${column} added`);
}

async function migrateFollowUpStatusEnums(conn) {
  const tables = ['follow_ups', 'follow_up_shares'];

  for (const table of tables) {
    // 第一步：先扩为临时枚举（新7值 + 旧值），避免严格模式下写入越界值
    const tempEnum = ['call_no_answer', 'added_wechat', 'interested', 'quoting', 'negotiating', 'closed', 'abandoned', 'initial_contact', 'invalid'];
    const tempEnumSql = tempEnum.map((s) => `'${s}'`).join(', ');
    await conn.execute(`ALTER TABLE ${table} MODIFY COLUMN status ENUM(${tempEnumSql}) NOT NULL`);

    // 第二步：映射旧值 -> 新值
    await conn.execute(`UPDATE ${table} SET status = 'call_no_answer' WHERE status = 'initial_contact'`);
    await conn.execute(`UPDATE ${table} SET status = 'abandoned' WHERE status = 'invalid'`);

    // 第三步：收缩为最终 7 值枚举
    const enumSql = FOLLOW_UP_STATUS_ENUM.map((s) => `'${s}'`).join(', ');
    if (table === 'follow_ups') {
      await conn.execute(
        `ALTER TABLE ${table} MODIFY COLUMN status ENUM(${enumSql}) NOT NULL DEFAULT 'call_no_answer'`
      );
    } else {
      await conn.execute(
        `ALTER TABLE ${table} MODIFY COLUMN status ENUM(${enumSql}) NOT NULL`
      );
    }
    console.log(`[migration] ${table}.status enum expanded to 7 values`);
  }
}

async function seedDefaultAgreements(conn) {
  const agreements = {
    agreement: {
      title: '用户协议',
      sections: [
        { h: '一、服务说明', p: '欢迎使用酒店供应链商机互助平台。本平台为用户提供酒店商机信息发布、购买、分享及分佣服务。使用本平台即表示您已阅读并同意本协议。' },
        { h: '二、账号管理', p: '您应妥善保管账号及密码，对以您账号进行的全部操作负责。注册信息须真实有效，不得冒用他人身份。' },
        { h: '三、信息发布规范', p: '发布商机信息须真实、合法，不得发布虚假、侵权或违反法律法规的内容。平台有权对违规信息进行下架处理。' },
        { h: '四、积分与交易', p: '积分是本平台的虚拟交易凭证，可通过充值、邀请奖励、分佣等途径获得。购买商机后积分即时扣除，退款按平台规则处理。' },
        { h: '五、信用分管理', p: '平台根据用户行为动态调整信用分。信用分过低时将限制投稿、购买等功能，严重违规将封禁账号。' },
        { h: '六、分佣规则', p: '商机信息被购买后，发布者可获得订单分佣。分佣比例根据会员等级确定，平台保留调整规则的权力并会提前公示。' },
        { h: '七、免责声明', p: '平台信息由用户自行发布，交易风险由双方自行承担。因不可抗力或第三方原因导致的服务中断，平台不承担责任。' },
        { h: '八、协议变更', p: '平台可随时更新本协议，变更后将在站内公示。继续使用服务即视为接受更新后的协议。' },
      ],
    },
    privacy: {
      title: '隐私政策',
      sections: [
        { h: '一、信息收集', p: '我们仅收集提供服务所必需的信息，包括手机号、昵称等注册信息，以及您主动发布的内容。' },
        { h: '二、信息使用', p: '您的信息仅用于账号认证、订单交易、通知提醒等服务目的，不会用于与服务无关的用途。' },
        { h: '三、信息保护', p: '我们采取加密存储、访问控制等安全措施保护您的个人信息，防止未经授权的访问与泄露。' },
        { h: '四、信息共享', p: '未经您的同意，我们不会向第三方共享您的个人信息，法律法规另有规定的除外。' },
        { h: '五、您的权利', p: '您可以随时查阅、更正您的个人信息，也可以联系我们注销账号，注销后我们将删除相关数据。' },
        { h: '六、政策更新', p: '本政策可能适时更新，重大变更将通过站内通知等方式告知。' },
        { h: '七、联系我们', p: '如对本政策有任何疑问，可通过平台内的联系方式与我们取得联系。' },
      ],
    },
    summary: {
      title: '平台须知',
      sections: [
        { h: '账号安全', p: '请妥善保管手机号及密码，不对他人透露验证码，避免账号被盗。' },
        { h: '信息真实性', p: '发布的商机信息须真实合法，不得虚假夸大或误导他人。平台有权下架违规信息并扣除信用分。' },
        { h: '交易风险', p: '商机交易涉及商业谈判，平台仅提供信息撮合，成果及风险由交易双方自行承担。' },
        { h: '积分使用', p: '积分为平台虚拟货币，可用于购买商机，购买后不可退还，仅在协议允许情况下可申请退款。' },
        { h: '信用分影响', p: '信用分根据交易行为动态调整，过低将限制发布、购买等功能，严重违规将封禁账号。' },
        { h: '分佣规则', p: '发布者可获得分佣，比例根据会员等级，平台保留调整权力并会提前公示。' },
        { h: '禁止行为', p: '禁止发布虚假信息、恶意差评、刷单等行为，一经查实将依据严肃性处理。' },
      ],
    },
  };

  for (const [type, content] of Object.entries(agreements)) {
    await conn.execute(
      `INSERT IGNORE INTO system_configs (config_key, config_value, config_type, description)
       VALUES (?, ?, 'json', ?)`,
      [`agreement_${type}`, JSON.stringify(content), `${content.title}（动态配置，可后台修改）`]
    );
  }
  console.log('[migration] Default agreements seeded');
}

export async function migrateP0Fields() {
  const conn = await mysql.createConnection(DB_CONFIG);
  try {
    // users: email / qualifications / cases
    await addColumnIfMissing(conn, 'users', 'email', `VARCHAR(100) NULL`);
    await addColumnIfMissing(conn, 'users', 'qualifications', `TEXT NULL COMMENT '专业资质，换行分隔'`);
    await addColumnIfMissing(conn, 'users', 'cases', `TEXT NULL COMMENT '典型案例，换行分隔'`);

    // opportunities: brand / attachments
    await addColumnIfMissing(conn, 'opportunities', 'brand', `VARCHAR(100) NULL COMMENT '品牌/酒店名称'`);
    await addColumnIfMissing(conn, 'opportunities', 'attachments', `TEXT NULL COMMENT '图纸附件 URL 数组(JSON)'`);

    // follow_ups / follow_up_shares: status 7 枚举
    await migrateFollowUpStatusEnums(conn);

    // 默认协议动态配置
    await seedDefaultAgreements(conn);

    console.log('[migration] 002_p0_fields applied successfully');
  } finally {
    await conn.end();
  }
}

// 如果直接运行此文件，执行迁移
if (process.argv[1]?.endsWith('002_p0_fields.js')) {
  migrateP0Fields().catch(console.error);
}
