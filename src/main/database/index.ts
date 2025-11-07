/**
 * Database module exports
 * Centralizes all database-related utilities for easy importing
 */

// Export database configuration
export { dbConfig, createDbConfig } from './dbConfig';

// Export connection utilities
export {
  createConnection,
  createConnectionPool,
  getPoolConnection,
  withConnection,
  withTransaction
} from './dbConnection';

// Export types for convenience
export type { ConnectionOptions, Connection, Pool, PoolConnection } from 'mysql2/promise';

 