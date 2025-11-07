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

// Load environment variables from root .env file as fallback
dotenv.config({
  path: path.join(__dirname, '../../../../.env')
});

// Force consistent behavior between development and production
// Always use production database for consistency
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
const prodConfig: ConnectionOptions = {
  host: process.env.PROD_DB_HOST || 'entity.pe',
  port: parseInt(process.env.PROD_DB_PORT || '3306', 10),
  database: process.env.PROD_DB_NAME || 'entitype_RFEnterprises',
  user: process.env.PROD_DB_USER || 'entitype_Gerencia77',
  password: process.env.PROD_DB_PASSWORD || 'Elbillon123$',  // Password for entitype_Gerencia77
  waitForConnections: true,
  connectionLimit: 20, // Higher connection limit for production
  queueLimit: 0
};

/**
 * Force production database for both environments to ensure consistency
 * Development and production will use the same database configuration
 */
export const dbConfig: ConnectionOptions = prodConfig; // Always use production config

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

/**
 * Smart configuration that always uses production config for consistency
 * Both development and production will behave identically
 */
export function getSmartDbConfig(options: Partial<ConnectionOptions> = {}): ConnectionOptions {
  // Always use production config for both environments
  return getProductionDbConfig(options);
} 