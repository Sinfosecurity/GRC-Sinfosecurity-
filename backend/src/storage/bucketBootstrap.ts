/**
 * Idempotent staging object-store bucket bootstrap.
 * Never deletes objects, never replaces a bucket, never runs in production.
 */

export type BucketBootstrapAction = 'exists' | 'created' | 'refused';

export type BucketBootstrapResult = {
    action: BucketBootstrapAction;
    destructive: false;
    bucket: string;
    reason: string;
};

export type BucketCommands = {
    head: (bucket: string) => Promise<boolean>;
    create: (bucket: string) => Promise<void>;
};

export function stagingBucketBootstrapAllowed(env: NodeJS.ProcessEnv = process.env): boolean {
    if (env.APP_ENVIRONMENT === 'production' || env.NODE_ENV === 'production') {
        return false;
    }
    if (env.ALLOW_STAGING_BUCKET_BOOTSTRAP !== 'true') {
        return false;
    }
    return env.APP_ENVIRONMENT === 'staging' || env.APP_ENVIRONMENT === 'test';
}

export function configuredBucketName(env: NodeJS.ProcessEnv = process.env): string {
    return String(env.S3_BUCKET || env.AWS_S3_BUCKET || '').trim();
}

export async function ensureBucketIdempotent(
    commands: BucketCommands,
    env: NodeJS.ProcessEnv = process.env
): Promise<BucketBootstrapResult> {
    const bucket = configuredBucketName(env);
    if (!bucket) {
        return {
            action: 'refused',
            destructive: false,
            bucket: '',
            reason: 'bucket_name_missing',
        };
    }

    const exists = await commands.head(bucket);
    if (exists) {
        return {
            action: 'exists',
            destructive: false,
            bucket,
            reason: 'bucket_present_no_action',
        };
    }

    if (!stagingBucketBootstrapAllowed(env)) {
        return {
            action: 'refused',
            destructive: false,
            bucket,
            reason: 'production_or_bootstrap_disabled',
        };
    }

    await commands.create(bucket);
    return {
        action: 'created',
        destructive: false,
        bucket,
        reason: 'created_once',
    };
}
