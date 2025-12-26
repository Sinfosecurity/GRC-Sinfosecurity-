import { PrismaClient } from '@prisma/client';
import { createClient } from 'redis';
export declare const prisma: PrismaClient<{
    log: ("error" | "query" | "warn")[];
}, never, import("@prisma/client/runtime/library").DefaultArgs>;
declare let redisClient: ReturnType<typeof createClient> | null;
export declare function connectDatabase(): Promise<void>;
export declare function disconnectDatabase(): Promise<void>;
export declare function checkDatabaseHealth(): Promise<{
    postgres: boolean;
    redis?: boolean;
    mongodb?: boolean;
}>;
export { redisClient };
export default prisma;
//# sourceMappingURL=database.d.ts.map