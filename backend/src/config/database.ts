import { PrismaClient } from '@prisma/client';
import mongoose from 'mongoose';
import { createClient } from 'redis';
import logger from './logger';

// Prisma Client (PostgreSQL)
export const prisma = new PrismaClient({
    log: process.env.NODE_ENV === 'development' 
        ? ['query', 'error', 'warn'] 
        : ['error'],
});

// Redis Client (optional, for caching)
let redisClient: ReturnType<typeof createClient> | null = null;

export async function connectDatabase() {
    try {
        // Connect to PostgreSQL via Prisma
        await prisma.$connect();
        logger.info('✅ PostgreSQL connected via Prisma');

        // Test the connection
        await prisma.$queryRaw`SELECT 1`;
        logger.info('✅ PostgreSQL connection verified');

        // Connect to Redis if URL provided
        if (process.env.REDIS_URL) {
            redisClient = createClient({
                url: process.env.REDIS_URL,
            });

            redisClient.on('error', (err) => {
                logger.error('Redis Client Error:', err);
            });

            await redisClient.connect();
            logger.info('✅ Redis connected');
        }

        // Connect to MongoDB if URL provided (optional)
        if (process.env.MONGODB_URL) {
            await mongoose.connect(process.env.MONGODB_URL);
            logger.info('✅ MongoDB connected');
        }

    } catch (error) {
        logger.error('❌ Database connection failed:', error);
        throw error;
    }
}

export async function disconnectDatabase() {
    try {
        await prisma.$disconnect();
        logger.info('PostgreSQL disconnected');

        if (redisClient) {
            await redisClient.quit();
            logger.info('Redis disconnected');
        }

        if (mongoose.connection.readyState === 1) {
            await mongoose.disconnect();
            logger.info('MongoDB disconnected');
        }
    } catch (error) {
        logger.error('Error disconnecting databases:', error);
    }
}

// Health check function
export async function checkDatabaseHealth(): Promise<{
    postgres: boolean;
    redis?: boolean;
    mongodb?: boolean;
}> {
    const health: any = {
        postgres: false,
        redis: undefined,
        mongodb: undefined,
    };

    try {
        await prisma.$queryRaw`SELECT 1`;
        health.postgres = true;
    } catch (error) {
        logger.error('PostgreSQL health check failed:', error);
    }

    if (redisClient) {
        try {
            await redisClient.ping();
            health.redis = true;
        } catch (error) {
            logger.error('Redis health check failed:', error);
            health.redis = false;
        }
    }

    if (mongoose.connection.readyState === 1) {
        health.mongodb = true;
    } else if (process.env.MONGODB_URL) {
        health.mongodb = false;
    }

    return health;
}

export { redisClient };
export default prisma;
