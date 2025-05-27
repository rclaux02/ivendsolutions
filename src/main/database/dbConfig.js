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
var dotenv = require('dotenv');
// Load environment variables from .env file
dotenv.config();
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
    password: process.env.DEV_DB_PASSWORD || '',
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
    user: process.env.PROD_DB_USER || 'entitype_mago',
    password: process.env.PROD_DB_PASSWORD || '', // Empty default for security
    waitForConnections: true,
    connectionLimit: 20, // Higher connection limit for production
    queueLimit: 0
};
/**
 * Standard MySQL connection configuration
 * Uses either production or development settings based on NODE_ENV
 */
exports.dbConfig = isProduction ? prodConfig : devConfig;
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
