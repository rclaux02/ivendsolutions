/**
 * Database configuration for MySQL connections
 * Centralizes database connection parameters for consistent usage across the application
 */

import { ConnectionOptions } from 'mysql2/promise';
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config({
  path: path.join(__dirname, '.env')
});
// Determine environment
const isProduction = process.env.NODE_ENV === 'production';

/**
 * Development configuration - used when running locally
 */
const devConfig: ConnectionOptions = {
  host: process.env.DEV_DB_HOST || 'localhost',
  port: parseInt(process.env.DEV_DB_PORT || '3306', 10),
  database: process.env.DEV_DB_NAME || 'vapebox',
  user: process.env.DEV_DB_USER || 'root',
  password: process.env.DEV_DB_PASSWORD || 'Asdf1234!',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

/**
 * Production configuration - used in deployed environment
 */
// const prodConfig: ConnectionOptions = {
//   host: process.env.PROD_DB_HOST || 'entity.pe',
//   port: parseInt(process.env.PROD_DB_PORT || '3306', 10),
//   database: process.env.PROD_DB_NAME || 'entitype_RFEnterprises',
//   user: process.env.PROD_DB_USER || 'entitype_mago',
//   password: process.env.PROD_DB_PASSWORD || '',  // Empty default for security
//   waitForConnections: true,
//   connectionLimit: 20, // Higher connection limit for production
//   queueLimit: 0
// };

const prodConfig: ConnectionOptions = {
  host: 'entity.pe',
  port: 3306,
  database: 'entitype_RFEnterprises',
  user: 'entitype_Gerencia77',
  password: 'Elbillon123$',  // Empty default for security
  waitForConnections: true,
  connectionLimit: 20, // Higher connection limit for production
  queueLimit: 0
};

/**
 * Standard MySQL connection configuration
 * Uses either production or development settings based on NODE_ENV
 */
export const dbConfig: ConnectionOptions = prodConfig;

/**
 * Create a database connection configuration with custom options
 * @param options Additional or override options for the connection
 * @returns ConnectionOptions with defaults merged with provided options
 */
export function createDbConfig(options: Partial<ConnectionOptions> = {}): ConnectionOptions {
  return {
    ...dbConfig,
    ...options
  };
}

/**
 * Force use of production database regardless of environment
 * Useful for specific operations that need to access production data
 */
export function getProductionDbConfig(options: Partial<ConnectionOptions> = {}): ConnectionOptions {
  return {
    ...prodConfig,
    ...options
  };
}

/**
 * Force use of development database regardless of environment
 * Useful for testing or development-specific operations
 */
export function getDevelopmentDbConfig(options: Partial<ConnectionOptions> = {}): ConnectionOptions {
  return {
    ...devConfig,
    ...options
  };
} 