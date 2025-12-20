import { PrismaClient } from '@prisma/client';
import mongoose from 'mongoose';
import { createClient } from 'redis';
import logger from './logger';

export { mongoose };

// PostgreSQL (Prisma) with connection pooling
export const prisma = new PrismaClient({
    log: process.env.NODE_ENV === 'production' ? ['error', 'warn'] : ['query', 'error', 'warn'],
    datasources: {
        db: {
            url: process.env.DATABASE_URL,
        },
    },
});

// MongoDB
let mongooseConnection: typeof mongoose | null = null;

export async function connectMongoDB() {
    try {
        const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/grc_documents';
        mongooseConnection = await mongoose.connect(mongoUri, {
            maxPoolSize: 10,
            minPoolSize: 2,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        });
        logger.info('✅ MongoDB connected successfully');
    } catch (error) {
        logger.error('❌ MongoDB connection error:', error);
        throw error;
    }
}

// Redis with optimized configuration
export const redisClient = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6380',
    password: process.env.REDIS_PASSWORD,
    socket: {
        reconnectStrategy: (retries) => {
            if (retries > 10) {
                logger.error('Redis: Max reconnection attempts reached');
                return new Error('Max reconnection attempts reached');
            }
            return Math.min(retries * 100, 3000);
        },
        connectTimeout: 10000,
    },
    pingInterval: 30000,
});

redisClient.on('error', (err) => logger.error('Redis Client Error', err));
redisClient.on('connect', () => logger.info('✅ Redis connected successfully'));

export async function connectRedis() {
    try {
        await redisClient.connect();
    } catch (error) {
        logger.error('❌ Redis connection error:', error);
        throw error;
    }
}

// Connect all databases
export async function connectDatabase() {
    try {
        // Test PostgreSQL connection
        await prisma.$connect();
        logger.info('✅ PostgreSQL connected successfully');

        await connectMongoDB();
        await connectRedis();

        logger.info('🎉 All databases connected successfully');
    } catch (error) {
        logger.error('❌ Database connection failed:', error);
        throw error;
    }
}

// Disconnect all databases
export async function disconnectDatabase() {
    try {
        await prisma.$disconnect();
        await mongoose.disconnect();
        await redisClient.quit();
        logger.info('✅ All databases disconnected');
    } catch (error) {
        logger.error('❌ Database disconnection error:', error);
    }
}
