import crypto from 'crypto';
import { isProviderConfigured } from '../config/env';
import { ObjectStorageProvider, StoredObjectMeta } from './types';

export class S3StorageProvider implements ObjectStorageProvider {
    readonly name = 's3';

    isConfigured(): boolean {
        return isProviderConfigured(
            'S3_BUCKET',
            'AWS_ACCESS_KEY_ID',
            'AWS_SECRET_ACCESS_KEY'
        ) || isProviderConfigured('S3_BUCKET', 'AWS_REGION');
    }

    private async client() {
        const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = await import('@aws-sdk/client-s3');
        return {
            S3Client,
            PutObjectCommand,
            GetObjectCommand,
            DeleteObjectCommand,
            client: new S3Client({
                region: process.env.AWS_REGION || process.env.S3_REGION || 'us-east-1',
                endpoint: process.env.S3_ENDPOINT || undefined,
                forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true' || Boolean(process.env.S3_ENDPOINT),
                credentials: process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
                    ? {
                        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
                    }
                    : undefined,
            }),
        };
    }

    async putObject(key: string, body: Buffer, contentType: string): Promise<StoredObjectMeta> {
        if (!this.isConfigured()) {
            throw new Error('Object storage is not configured');
        }
        const { client, PutObjectCommand } = await this.client();
        await client.send(
            new PutObjectCommand({
                Bucket: process.env.S3_BUCKET || process.env.AWS_S3_BUCKET,
                Key: key,
                Body: body,
                ContentType: contentType,
            })
        );
        return {
            storageKey: key,
            size: body.length,
            contentType,
            checksum: crypto.createHash('sha256').update(body).digest('hex'),
        };
    }

    async getObject(key: string): Promise<Buffer> {
        if (!this.isConfigured()) {
            throw new Error('Object storage is not configured');
        }
        const { client, GetObjectCommand } = await this.client();
        const result = await client.send(
            new GetObjectCommand({
                Bucket: process.env.S3_BUCKET || process.env.AWS_S3_BUCKET,
                Key: key,
            })
        );
        const bytes = await result.Body?.transformToByteArray();
        if (!bytes) {
            throw new Error('Object not found');
        }
        return Buffer.from(bytes);
    }

    async deleteObject(key: string): Promise<void> {
        if (!this.isConfigured()) {
            throw new Error('Object storage is not configured');
        }
        const { client, DeleteObjectCommand } = await this.client();
        await client.send(
            new DeleteObjectCommand({
                Bucket: process.env.S3_BUCKET || process.env.AWS_S3_BUCKET,
                Key: key,
            })
        );
    }

    async getDownloadUrl(key: string, filename: string): Promise<string | null> {
        if (!this.isConfigured()) {
            return null;
        }
        const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');
        const { client, GetObjectCommand } = await this.client();
        return getSignedUrl(
            client,
            new GetObjectCommand({
                Bucket: process.env.S3_BUCKET || process.env.AWS_S3_BUCKET,
                Key: key,
                ResponseContentDisposition: `attachment; filename="${filename}"`,
            }),
            { expiresIn: 300 }
        );
    }

    async listKeys(prefix = ''): Promise<string[]> {
        if (!this.isConfigured()) {
            return [];
        }
        const { ListObjectsV2Command } = await import('@aws-sdk/client-s3');
        const { client } = await this.client();
        const result = await client.send(
            new ListObjectsV2Command({
                Bucket: process.env.S3_BUCKET || process.env.AWS_S3_BUCKET,
                Prefix: prefix || undefined,
                MaxKeys: 1000,
            })
        );
        return (result.Contents || []).map((item) => item.Key).filter((key): key is string => Boolean(key));
    }
}
