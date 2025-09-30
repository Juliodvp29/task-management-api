import mysql from 'mysql2/promise';
import type { DatabaseConfig } from '../types/config/database.js';

// Database configuration object with defaults and environment variable overrides
const dbConfig: DatabaseConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  database: process.env.DB_NAME || 'task_management_api',
  username: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  charset: 'utf8mb4',
  timezone: '+00:00',
  pool: {
    min: 0,
    max: 10,       // Maximum number of connections in the pool
    acquire: 30000, // Connection timeout in ms
    idle: 10000,   // Idle timeout in ms
  }
};

// Create a MySQL connection pool using the configuration above
const pool = mysql.createPool({
  host: dbConfig.host,
  port: dbConfig.port,
  user: dbConfig.username,
  password: dbConfig.password,
  database: dbConfig.database,
  charset: dbConfig.charset,
  timezone: dbConfig.timezone,
  connectionLimit: dbConfig.pool.max,
  connectTimeout: dbConfig.pool.acquire,
  multipleStatements: false // Prevent execution of multiple statements for security
});

// Test database connection by pinging the server
export const testConnection = async (): Promise<boolean> => {
  try {
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    return true;
  } catch (error) {
    return false;
  }
};

// Execute a query that returns multiple rows
export const query = async <T = any>(sql: string, params: any[] = []): Promise<T[]> => {
  try {
    const safeParams = Array.isArray(params) ? params : [];
    const [rows] = await pool.query(sql, safeParams);
    return rows as T[];
  } catch (error) {
    console.error('Error executing query:', error);
    throw error;
  }
};

// Execute a query that returns only one row (or null if none found)
export const queryOne = async <T = any>(
  sql: string,
  params: any[] = []
): Promise<T | null> => {
  const results = await query<T>(sql, params);
  if (results.length === 0) return null;
  return results[0] as T;
};

// Execute an INSERT statement and return the inserted record ID
export const insert = async (sql: string, params: any[] = []): Promise<number> => {
  try {
    const safeParams = Array.isArray(params) ? params : [];
    const [result] = await pool.query(sql, safeParams);
    return (result as any).insertId;
  } catch (error) {
    console.error('Error executing insert:', error);
    throw error;
  }
};

// Execute a transaction with automatic commit/rollback
export const transaction = async <T>(callback: (connection: mysql.PoolConnection) => Promise<T>): Promise<T> => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

// Export pool for direct access
export { pool };
export default pool;
