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
// PostgreSQL (Prisma) with connection pooling
exports.prisma = new client_1.PrismaClient({
    log: process.env.NODE_ENV === 'production' ? ['error', 'warn'] : ['query', 'error', 'warn'],
    datasources: {
        db: {
            url: process.env.DATABASE_URL,
        },
    },
});
// MongoDB
let mongooseConnection = null;
async function connectMongoDB() {
    try {
        const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/grc_documents';
        mongooseConnection = await mongoose_1.default.connect(mongoUri, {
            maxPoolSize: 10,
            minPoolSize: 2,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        });
        logger_1.default.info('✅ MongoDB connected successfully');
    }
    catch (error) {
        logger_1.default.error('❌ MongoDB connection error:', error);
        throw error;
    }
}
// Redis with optimized configuration
exports.redisClient = (0, redis_1.createClient)({
    url: process.env.REDIS_URL || 'redis://localhost:6380',
    password: process.env.REDIS_PASSWORD,
    socket: {
        reconnectStrategy: (retries) => {
            if (retries > 10) {
                logger_1.default.error('Redis: Max reconnection attempts reached');
                return new Error('Max reconnection attempts reached');
            }
            return Math.min(retries * 100, 3000);
        },
        connectTimeout: 10000,
    },
    pingInterval: 30000,
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
// Connect all databases with retry logic
async function connectDatabase(retries = 5, delay = 3000) {
    for (let i = 0; i < retries; i++) {
        try {
            // Test PostgreSQL connection
            await exports.prisma.$connect();
            logger_1.default.info('✅ PostgreSQL connected successfully');
            // MongoDB is optional for Railway
            if (process.env.MONGODB_URI) {
                try {
                    await connectMongoDB();
                }
                catch (mongoError) {
                    logger_1.default.warn('⚠️  MongoDB connection failed (optional):', mongoError);
                }
            }
            // Redis is optional for Railway
            if (process.env.REDIS_URL) {
                try {
                    await connectRedis();
                }
                catch (redisError) {
                    logger_1.default.warn('⚠️  Redis connection failed (optional):', redisError);
                }
            }
            logger_1.default.info('🎉 Database connections established');
            return;
        }
        catch (error) {
            logger_1.default.error(`❌ Database connection attempt ${i + 1}/${retries} failed:`, error);
            if (i < retries - 1) {
                logger_1.default.info(`Retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
            else {
                logger_1.default.error('❌ All database connection attempts failed');
                throw error;
            }
        }
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