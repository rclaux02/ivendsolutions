"use strict";
/**
 * Database configuration for MySQL connections
 * Centralizes database connection parameters for consistent usage across the application
 */
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.dbConfig = void 0;
exports.createDbConfig = createDbConfig;
exports.getProductionDbConfig = getProductionDbConfig;
exports.getDevelopmentDbConfig = getDevelopmentDbConfig;
exports.getSmartDbConfig = getSmartDbConfig;
var path = require('path');
var dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config({
    path: path.join(__dirname, '.env')
});

// Load environment variables from root .env file as fallback
dotenv.config({
    path: path.join(__dirname, '../../../../.env')
});

// Determine environment
var isProduction = process.env.NODE_ENV === 'production';

/**
 * Development configuration - used when running locally
 */
var devConfig = {
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
var prodConfig = {
    host: process.env.PROD_DB_HOST || 'entity.pe',
    port: parseInt(process.env.PROD_DB_PORT || '3306', 10),
    database: process.env.PROD_DB_NAME || 'entitype_RFEnterprises',
    user: process.env.PROD_DB_USER || 'entitype_Gerencia77',
    password: process.env.PROD_DB_PASSWORD || 'Elbillon123$', // Password for entitype_Gerencia77
    waitForConnections: true,
    connectionLimit: 20, // Higher connection limit for production
    queueLimit: 0
};

/**
 * Force production database for both environments to ensure consistency
 * Development and production will use the same database configuration
 */
exports.dbConfig = prodConfig; // Always use production config

/**
 * Create a database connection configuration with custom options
 * @param options Additional or override options for the connection
 * @returns ConnectionOptions with defaults merged with provided options
 */
function createDbConfig(options) {
    if (options === void 0) { options = {}; }
    return __assign(__assign({}, exports.dbConfig), options);
}

/**
 * Force use of production database regardless of environment
 * Useful for specific operations that need to access production data
 */
function getProductionDbConfig(options) {
    if (options === void 0) { options = {}; }
    return __assign(__assign({}, prodConfig), options);
}

/**
 * Force use of development database regardless of environment
 * Useful for testing or development-specific operations
 */
function getDevelopmentDbConfig(options) {
    if (options === void 0) { options = {}; }
    return __assign(__assign({}, devConfig), options);
}

/**
 * Smart configuration that tries production if development fails
 * This is useful for license validation when local DB is not available
 */
function getSmartDbConfig(options) {
    if (options === void 0) { options = {}; }
    // If we're in production mode, use production config
    if (isProduction) {
        return getProductionDbConfig(options);
    }
    
    // For development, try to use production config as fallback
    // This helps when local MySQL is not installed
    return getProductionDbConfig(options);
}
