"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.redisClient = exports.prisma = exports.mongoose = void 0;
exports.connectMongoDB = connectMongoDB;
exports.connectRedis = connectRedis;
exports.connectDatabase = connectDatabase;
exports.disconnectDatabase = disconnectDatabase;
const client_1 = require("@prisma/client");
const mongoose_1 = __importDefault(require("mongoose"));
exports.mongoose = mongoose_1.default;
const redis_1 = require("redis");
const logger_1 = __importDefault(require("./logger"));
// PostgreSQL (Prisma)
exports.prisma = new client_1.PrismaClient({
    log: ['query', 'error', 'warn'],
});
// MongoDB
let mongooseConnection = null;
async function connectMongoDB() {
    try {
        const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/grc_documents';
        mongooseConnection = await mongoose_1.default.connect(mongoUri);
        logger_1.default.info('✅ MongoDB connected successfully');
    }
    catch (error) {
        logger_1.default.error('❌ MongoDB connection error:', error);
        throw error;
    }
}
// Redis
exports.redisClient = (0, redis_1.createClient)({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
});
exports.redisClient.on('error', (err) => logger_1.default.error('Redis Client Error', err));
exports.redisClient.on('connect', () => logger_1.default.info('✅ Redis connected successfully'));
async function connectRedis() {
    try {
        await exports.redisClient.connect();
    }
    catch (error) {
        logger_1.default.error('❌ Redis connection error:', error);
        throw error;
    }
}
// Connect all databases
async function connectDatabase() {
    try {
        // Test PostgreSQL connection
        await exports.prisma.$connect();
        logger_1.default.info('✅ PostgreSQL connected successfully');
        await connectMongoDB();
        await connectRedis();
        logger_1.default.info('🎉 All databases connected successfully');
    }
    catch (error) {
        logger_1.default.error('❌ Database connection failed:', error);
        throw error;
    }
}
// Disconnect all databases
async function disconnectDatabase() {
    try {
        await exports.prisma.$disconnect();
        await mongoose_1.default.disconnect();
        await exports.redisClient.quit();
        logger_1.default.info('✅ All databases disconnected');
    }
    catch (error) {
        logger_1.default.error('❌ Database disconnection error:', error);
    }
}
//# sourceMappingURL=database.js.map