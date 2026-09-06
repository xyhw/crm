import { logger } from '../services/logger.js';
import { query } from '../db.js';

export const migrateWaffoChannel = async () => {
  await query(`
    ALTER TABLE payment_orders
    MODIFY COLUMN channel ENUM('mock','wechat','alipay','stripe','waffo') NOT NULL
  `);
  logger.info('[migration] payment_orders.channel +waffo');
};