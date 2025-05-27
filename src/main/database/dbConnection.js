"use strict";
/**
 * Database connection utilities
 * Provides functions for creating and managing database connections
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createConnection = createConnection;
exports.createConnectionPool = createConnectionPool;
exports.getPoolConnection = getPoolConnection;
exports.withConnection = withConnection;
exports.withTransaction = withTransaction;
exports.displayAllTables = displayAllTables;
var mysql = require('mysql2/promise');
var dbConfig_1 = require("./dbConfig");
/**
 * Create a single database connection
 * @param options Optional connection options to override defaults
 * @returns Promise resolving to a database connection
 */
function createConnection() {
    return __awaiter(this, arguments, void 0, function (options) {
        var config;
        if (options === void 0) { options = {}; }
        return __generator(this, function (_a) {
            config = (0, dbConfig_1.createDbConfig)(options);
            return [2 /*return*/, mysql.createConnection(config)];
        });
    });
}
/**
 * Create a connection pool for efficient database connections
 * @param options Optional pool options to override defaults
 * @returns A database connection pool
 */
function createConnectionPool(options) {
    if (options === void 0) { options = {}; }
    var config = (0, dbConfig_1.createDbConfig)(options);
    return mysql.createPool(config);
}
// Default connection pool for application-wide use
var defaultPool = createConnectionPool();
/**
 * Get a connection from the default pool
 * @returns Promise resolving to a pooled connection
 */
function getPoolConnection() {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, defaultPool.getConnection()];
        });
    });
}
/**
 * Execute a database operation with a connection from the pool
 * Automatically releases the connection back to the pool when done
 *
 * @param callback Function that performs database operations with the provided connection
 * @returns Promise resolving to the result of the callback
 */
function withConnection(callback) {
    return __awaiter(this, void 0, void 0, function () {
        var connection;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, defaultPool.getConnection()];
                case 1:
                    connection = _a.sent();
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, , 4, 5]);
                    return [4 /*yield*/, callback(connection)];
                case 3: return [2 /*return*/, _a.sent()];
                case 4:
                    connection.release();
                    return [7 /*endfinally*/];
                case 5: return [2 /*return*/];
            }
        });
    });
}
/**
 * Execute a database transaction with automatic commit/rollback
 *
 * @param callback Function that performs database operations within the transaction
 * @returns Promise resolving to the result of the callback
 */
function withTransaction(callback) {
    return __awaiter(this, void 0, void 0, function () {
        var connection, result, error_1, rollbackError_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, defaultPool.getConnection()];
                case 1:
                    connection = _a.sent();
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, 6, 11, 12]);
                    return [4 /*yield*/, connection.beginTransaction()];
                case 3:
                    _a.sent();
                    return [4 /*yield*/, callback(connection)];
                case 4:
                    result = _a.sent();
                    return [4 /*yield*/, connection.commit()];
                case 5:
                    _a.sent();
                    return [2 /*return*/, result];
                case 6:
                    error_1 = _a.sent();
                    _a.label = 7;
                case 7:
                    _a.trys.push([7, 9, , 10]);
                    return [4 /*yield*/, connection.rollback()];
                case 8:
                    _a.sent();
                    return [3 /*break*/, 10];
                case 9:
                    rollbackError_1 = _a.sent();
                    console.error('Error rolling back transaction:', rollbackError_1);
                    return [3 /*break*/, 10];
                case 10: throw error_1;
                case 11:
                    connection.release();
                    return [7 /*endfinally*/];
                case 12: return [2 /*return*/];
            }
        });
    });
}
/**
 * Fetches and displays all table names from the database
 * @returns {Promise<string[]>} Array of table names
 */
function displayAllTables() {
    return __awaiter(this, void 0, void 0, function () {
        var rows, tableNames, error_2;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, withConnection(function (connection) { return __awaiter(_this, void 0, void 0, function () {
                            return __generator(this, function (_a) {
                                // This query works for MySQL to get all table names in the current database
                                return [2 /*return*/, connection.query('SHOW TABLES')];
                            });
                        }); })];
                case 1:
                    rows = (_a.sent())[0];
                    tableNames = rows.map(function (row) { return Object.values(row)[0]; });
                    console.log('========================================');
                    console.log('DATABASE TABLES:');
                    console.log('========================================');
                    tableNames.forEach(function (tableName, index) {
                        console.log("".concat(index + 1, ". ").concat(tableName));
                    });
                    console.log('========================================');
                    console.log("Total tables: ".concat(tableNames.length));
                    console.log('========================================');
                    return [2 /*return*/, tableNames];
                case 2:
                    error_2 = _a.sent();
                    console.error('Error fetching database tables:', error_2);
                    throw error_2;
                case 3: return [2 /*return*/];
            }
        });
    });
}
