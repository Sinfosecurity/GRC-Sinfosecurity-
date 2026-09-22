import { ensureBucketIdempotent, stagingBucketBootstrapAllowed } from '../storage/bucketBootstrap';

describe('idempotent staging bucket bootstrap', () => {
    it('refuses production opportunistic create', () => {
        expect(stagingBucketBootstrapAllowed({
            APP_ENVIRONMENT: 'production',
            ALLOW_STAGING_BUCKET_BOOTSTRAP: 'true',
        })).toBe(false);
        expect(stagingBucketBootstrapAllowed({
            NODE_ENV: 'production',
            APP_ENVIRONMENT: 'staging',
            ALLOW_STAGING_BUCKET_BOOTSTRAP: 'true',
        })).toBe(false);
    });

    it('does not create when the bucket already exists', async () => {
        const create = jest.fn();
        const result = await ensureBucketIdempotent(
            { head: async () => true, create },
            { APP_ENVIRONMENT: 'staging', ALLOW_STAGING_BUCKET_BOOTSTRAP: 'true', S3_BUCKET: 'supreme-risk-staging' }
        );
        expect(result).toEqual({
            action: 'exists',
            destructive: false,
            bucket: 'supreme-risk-staging',
            reason: 'bucket_present_no_action',
        });
        expect(create).not.toHaveBeenCalled();
    });

    it('creates once when missing and staging bootstrap is allowed', async () => {
        const create = jest.fn();
        const result = await ensureBucketIdempotent(
            { head: async () => false, create },
            { APP_ENVIRONMENT: 'staging', ALLOW_STAGING_BUCKET_BOOTSTRAP: 'true', S3_BUCKET: 'supreme-risk-staging' }
        );
        expect(result.action).toBe('created');
        expect(result.destructive).toBe(false);
        expect(create).toHaveBeenCalledTimes(1);
        expect(create).toHaveBeenCalledWith('supreme-risk-staging');
    });

    it('refuses a missing production bucket instead of creating it', async () => {
        const create = jest.fn();
        const result = await ensureBucketIdempotent(
            { head: async () => false, create },
            { APP_ENVIRONMENT: 'production', ALLOW_STAGING_BUCKET_BOOTSTRAP: 'true', S3_BUCKET: 'prod-bucket' }
        );
        expect(result.action).toBe('refused');
        expect(result.reason).toBe('production_or_bootstrap_disabled');
        expect(create).not.toHaveBeenCalled();
    });

    it('second initialization is a no-op after create', async () => {
        let exists = false;
        const create = jest.fn(async () => {
            exists = true;
        });
        const commands = {
            head: async () => exists,
            create,
        };
        const first = await ensureBucketIdempotent(commands, {
            APP_ENVIRONMENT: 'staging',
            ALLOW_STAGING_BUCKET_BOOTSTRAP: 'true',
            S3_BUCKET: 'supreme-risk-staging',
        });
        const second = await ensureBucketIdempotent(commands, {
            APP_ENVIRONMENT: 'staging',
            ALLOW_STAGING_BUCKET_BOOTSTRAP: 'true',
            S3_BUCKET: 'supreme-risk-staging',
        });
        expect(first.action).toBe('created');
        expect(second.action).toBe('exists');
        expect(create).toHaveBeenCalledTimes(1);
    });
});
