import mysql from 'mysql2/promise';
import { config } from './config.js';

const DB_CONFIG = {
  host: config.db.host,
  user: config.db.user,
  password: config.db.password,
  database: config.db.database,
  charset: config.db.charset,
};

let pool = null;

export async function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      ...DB_CONFIG,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });
  }
  return pool;
}

export async function query(sql, params = []) {
  const p = await getPool();
  // 使用文本协议 query 而非 execute（预处理）：MySQL 8.0 对预处理协议中
  // LIMIT/OFFSET 的参数类型极严，字符串绑定直接报 Incorrect arguments to
  // mysqld_stmt_execute；文本协议在客户端转义内联，对列表分页参数完全免疫。
  const [rows] = await p.query(sql, params);
  return rows;
}

export async function queryOne(sql, params = []) {
  const rows = await query(sql, params);
  return rows[0] || null;
}

export async function insert(table, data) {
  const keys = Object.keys(data);
  const values = Object.values(data);
  const placeholders = keys.map(() => '?').join(', ');
  const sql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`;
  const p = await getPool();
  const [result] = await p.query(sql, values);
  return { insertId: result.insertId, id: result.insertId, ...data };
}

export async function update(table, data, where, whereParams = []) {
  const keys = Object.keys(data);
  const values = Object.values(data);
  const setClause = keys.map(k => `${k} = ?`).join(', ');
  const sql = `UPDATE ${table} SET ${setClause} WHERE ${where}`;
  const p = await getPool();
  const [result] = await p.query(sql, [...values, ...whereParams]);
  return result.affectedRows;
}

export async function del(table, where, whereParams = []) {
  const sql = `DELETE FROM ${table} WHERE ${where}`;
  const p = await getPool();
  const [result] = await p.query(sql, whereParams);
  return result.affectedRows;
}

export async function transaction(fn) {
  const p = await getPool();
  const conn = await p.getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function getConnection() {
  const p = await getPool();
  return p.getConnection();
}

export async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
