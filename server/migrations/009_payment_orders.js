import { query } from '../db.js';

export const migratePaymentOrders = async () => {
  await query(`
    CREATE TABLE IF NOT EXISTS payment_orders (
      id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
      order_no VARCHAR(32) NOT NULL UNIQUE,
      user_id BIGINT UNSIGNED NOT NULL,
      amount INT NOT NULL COMMENT '充值积分数',
      price INT NOT NULL COMMENT '支付金额，单位分',
      channel ENUM('mock','wechat','alipay','stripe') NOT NULL,
      status ENUM('pending','paid','failed','expired','refunded') NOT NULL DEFAULT 'pending',
      pay_channel_order_no VARCHAR(64) COMMENT '渠道方订单号',
      pay_method VARCHAR(32) COMMENT '支付方式 JSAPI/Native/H5/App',
      prepaid_id VARCHAR(128) COMMENT '预支付ID 微信prepay_id等',
      pay_url VARCHAR(512) COMMENT '支付跳转URL或二维码链接',
      paid_at TIMESTAMP NULL,
      expire_at TIMESTAMP NULL,
      refund_amount INT NULL COMMENT '退款金额 单位分',
      refunded_at TIMESTAMP NULL,
      raw_notify TEXT COMMENT '渠道回调原始数据',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_user (user_id),
      INDEX idx_status (status),
      INDEX idx_channel (channel),
      INDEX idx_expire (expire_at)
    ) ENGINE=InnoDB
  `);

  await query(`
    ALTER TABLE points_logs
    MODIFY COLUMN source_type ENUM(
      'register_gift','invite_gift','purchase_income','commission',
      'reward','consume','expire','recharge','admin_adjust','refund','penalty'
    ) NOT NULL
  `);

  console.log('[migration] payment_orders table ready, points_logs.source_type +penalty');
};
