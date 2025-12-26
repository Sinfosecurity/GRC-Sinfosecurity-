"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.redisClient = exports.prisma = void 0;
exports.connectDatabase = connectDatabase;
exports.disconnectDatabase = disconnectDatabase;
exports.checkDatabaseHealth = checkDatabaseHealth;
const client_1 = require("@prisma/client");
const mongoose_1 = __importDefault(require("mongoose"));
const redis_1 = require("redis");
const logger_1 = __importDefault(require("./logger"));
// Prisma Client (PostgreSQL)
exports.prisma = new client_1.PrismaClient({
    log: process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
});
// Redis Client (optional, for caching)
let redisClient = null;
exports.redisClient = redisClient;
async function connectDatabase() {
    try {
        // Connect to PostgreSQL via Prisma
        await exports.prisma.$connect();
        logger_1.default.info('✅ PostgreSQL connected via Prisma');
        // Test the connection
        await exports.prisma.$queryRaw `SELECT 1`;
        logger_1.default.info('✅ PostgreSQL connection verified');
        // Connect to Redis if URL provided
        if (process.env.REDIS_URL) {
            exports.redisClient = redisClient = (0, redis_1.createClient)({
                url: process.env.REDIS_URL,
            });
            redisClient.on('error', (err) => {
                logger_1.default.error('Redis Client Error:', err);
            });
            await redisClient.connect();
            logger_1.default.info('✅ Redis connected');
        }
        // Connect to MongoDB if URL provided (optional)
        if (process.env.MONGODB_URL) {
            await mongoose_1.default.connect(process.env.MONGODB_URL);
            logger_1.default.info('✅ MongoDB connected');
        }
    }
    catch (error) {
        logger_1.default.error('❌ Database connection failed:', error);
        throw error;
    }
}
async function disconnectDatabase() {
    try {
        await exports.prisma.$disconnect();
        logger_1.default.info('PostgreSQL disconnected');
        if (redisClient) {
            await redisClient.quit();
            logger_1.default.info('Redis disconnected');
        }
        if (mongoose_1.default.connection.readyState === 1) {
            await mongoose_1.default.disconnect();
            logger_1.default.info('MongoDB disconnected');
        }
    }
    catch (error) {
        logger_1.default.error('Error disconnecting databases:', error);
    }
}
// Health check function
async function checkDatabaseHealth() {
    const health = {
        postgres: false,
        redis: undefined,
        mongodb: undefined,
    };
    try {
        await exports.prisma.$queryRaw `SELECT 1`;
        health.postgres = true;
    }
    catch (error) {
        logger_1.default.error('PostgreSQL health check failed:', error);
    }
    if (redisClient) {
        try {
            await redisClient.ping();
            health.redis = true;
        }
        catch (error) {
            logger_1.default.error('Redis health check failed:', error);
            health.redis = false;
        }
    }
    if (mongoose_1.default.connection.readyState === 1) {
        health.mongodb = true;
    }
    else if (process.env.MONGODB_URL) {
        health.mongodb = false;
    }
    return health;
}
exports.default = exports.prisma;
//# sourceMappingURL=database.js.map