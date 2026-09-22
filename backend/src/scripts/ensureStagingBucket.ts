/**
 * Explicit staging-only bucket bootstrap. Never deletes. Refuses production.
 */
import { S3Client, CreateBucketCommand, HeadBucketCommand } from '@aws-sdk/client-s3';
import { ensureBucketIdempotent, stagingBucketBootstrapAllowed } from '../storage/bucketBootstrap';

async function main() {
    if (!stagingBucketBootstrapAllowed()) {
        throw new Error('Staging bucket bootstrap refused: production or ALLOW_STAGING_BUCKET_BOOTSTRAP!=true.');
    }
    const bucket = process.env.S3_BUCKET || process.env.AWS_S3_BUCKET;
    const client = new S3Client({
        region: process.env.AWS_REGION || process.env.S3_REGION || 'us-east-1',
        endpoint: process.env.S3_ENDPOINT || undefined,
        forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true' || Boolean(process.env.S3_ENDPOINT),
        credentials: process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
            ? {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            }
            : undefined,
    });
    const result = await ensureBucketIdempotent({
        head: async (name) => {
            try {
                await client.send(new HeadBucketCommand({ Bucket: name }));
                return true;
            } catch {
                return false;
            }
        },
        create: async (name) => {
            await client.send(new CreateBucketCommand({ Bucket: name }));
        },
    });
    process.stdout.write(`${JSON.stringify({ ...result, bucket })}\n`);
    if (result.action === 'refused') {
        process.exit(2);
    }
}

main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : error}\n`);
    process.exit(1);
});
