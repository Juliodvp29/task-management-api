// src/config/database.ts
import mysql from 'mysql2/promise';
import type { DatabaseConfig } from '../types/config/database.js';

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
    max: 10,
    acquire: 30000,
    idle: 10000,
  }
};

// Crear pool de conexiones
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
  multipleStatements: false
});

// Función para probar la conexión
export const testConnection = async (): Promise<boolean> => {
  try {
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    console.log('✅ Conexión a la base de datos establecida correctamente');
    return true;
  } catch (error) {
    console.error('❌ Error conectando a la base de datos:', error);
    return false;
  }
};

// Función para ejecutar queries
export const query = async <T = any>(sql: string, params: any[] = []): Promise<T[]> => {
  try {
    const [rows] = await pool.execute(sql, params);
    return rows as T[];
  } catch (error) {
    console.error('Error ejecutando query:', error);
    throw error;
  }
};

// Función para ejecutar una query que devuelve un solo resultado
export const queryOne = async <T = any>(
  sql: string,
  params: any[] = []
): Promise<T | null> => {
  const results = await query<T>(sql, params);
  if (results.length === 0) return null;        // ✅ explícito
  return results[0] as T;                       // ✅ ahora TS sabe que no es undefined
};

// Función para ejecutar inserts y obtener el ID
export const insert = async (sql: string, params: any[] = []): Promise<number> => {
  try {
    const [result] = await pool.execute(sql, params);
    return (result as any).insertId;
  } catch (error) {
    console.error('Error ejecutando insert:', error);
    throw error;
  }
};

// Función para iniciar transacción
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

export { pool };
export default pool;