/**
 * Database connection utilities
 * Provides functions for creating and managing database connections
 */

const mysql = require('mysql2/promise');
import { Connection, ConnectionOptions, Pool, PoolConnection, RowDataPacket } from 'mysql2/promise';
import { dbConfig, createDbConfig } from './dbConfig';

/**
 * Create a single database connection
 * @param options Optional connection options to override defaults
 * @returns Promise resolving to a database connection
 */
export async function createConnection(options: Partial<ConnectionOptions> = {}): Promise<Connection> {
  const config = createDbConfig(options);
  const connection = await mysql.createConnection(config);
  console.log(`✅ Successfully connected to database at host: ${config.host}`);
  return connection;
}

/**
 * Create a connection pool for efficient database connections
 * @param options Optional pool options to override defaults
 * @returns A database connection pool
 */
export function createConnectionPool(options: Partial<ConnectionOptions> = {}): Pool {
  const config = createDbConfig(options);
  const pool = mysql.createPool(config);
  console.log(`✅ Successfully created database pool at host: ${config.host}`);
  return pool;
}

// Default connection pool for application-wide use
const defaultPool = createConnectionPool();

// Set up a keepalive ping to prevent connection timeouts
// This runs every 30 seconds (30000 ms) and ensures connections stay warm
let keepaliveInterval: NodeJS.Timeout;

export function startConnectionKeepalive(intervalMs = 30000): void {
  // Clear any existing interval
  if (keepaliveInterval) {
    clearInterval(keepaliveInterval);
  }
  
  console.log(`Starting database connection keepalive (interval: ${intervalMs}ms)`);
  
  // Set up the new interval
  keepaliveInterval = setInterval(async () => {
    try {
      await withConnection(async (conn) => {
        // Simple query that keeps the connection alive
        await conn.query('SELECT 1');
        // console.log(`[DB] Keepalive ping successful at ${new Date().toISOString()}`);
      });
    } catch (error) {
      console.error('[DB] Keepalive ping failed:', error);
    }
  }, intervalMs);
}

export function stopConnectionKeepalive(): void {
  if (keepaliveInterval) {
    clearInterval(keepaliveInterval);
    console.log('Database connection keepalive stopped');
  }
}

/**
 * Get a connection from the default pool
 * @returns Promise resolving to a pooled connection
 */
export async function getPoolConnection(): Promise<PoolConnection> {
  return defaultPool.getConnection();
}

/**
 * Execute a database operation with a connection from the pool
 * Automatically releases the connection back to the pool when done
 * 
 * @param callback Function that performs database operations with the provided connection
 * @returns Promise resolving to the result of the callback
 */
export async function withConnection<T>(callback: (connection: PoolConnection) => Promise<T>): Promise<T> {
  const connection = await defaultPool.getConnection();
  try {
    return await callback(connection);
  } finally {
    connection.release();
  }
}

/**
 * Execute a database transaction with automatic commit/rollback
 * 
 * @param callback Function that performs database operations within the transaction
 * @returns Promise resolving to the result of the callback
 */
export async function withTransaction<T>(callback: (connection: PoolConnection) => Promise<T>): Promise<T> {
  const connection = await defaultPool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    try {
      await connection.rollback();
    } catch (rollbackError) {
      console.error('Error rolling back transaction:', rollbackError);
    }
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Fetches and displays all table names from the database
 * @returns {Promise<string[]>} Array of table names
 */
export async function displayAllTables(): Promise<string[]> {
  try {
    // Using the withConnection utility to handle connection management
    const [rows] = await withConnection<[RowDataPacket[], any]>(async (connection) => {
      // This query works for MySQL to get all table names in the current database
      return connection.query('SHOW TABLES');
    });
    
    // Extract table names from result and display them in terminal
    const tableNames = rows.map((row) => Object.values(row)[0] as string);
    
    console.log('========================================');
    console.log('DATABASE TABLES:');
    console.log('========================================');
    tableNames.forEach((tableName: string, index: number) => {
      console.log(`${index + 1}. ${tableName}`);
    });
    console.log('========================================');
    console.log(`Total tables: ${tableNames.length}`);
    console.log('========================================');
    
    return tableNames;
  } catch (error) {
    console.error('Error fetching database tables:', error);
    throw error;
  }
} 