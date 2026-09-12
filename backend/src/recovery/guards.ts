/**
 * Restore target guards. Recovery may never write to production or live staging.
 */

export type DatabaseIdentity = {
    host: string;
    port: string;
    database: string;
};

const FORBIDDEN_DB = /^(supreme_risk_staging|supreme_risk_preview|postgres|production|prod)$/i;
const FORBIDDEN_HOST = /(onrender\.com|amazonaws\.com|render\.com|railway\.app|neon\.tech)$/i;
const ALLOWED_RECOVERY_DB = /(recovery|restore|cert)/i;

export function databaseIdentity(url: string): DatabaseIdentity {
    const parsed = new URL(url);
    return {
        host: parsed.hostname,
        port: parsed.port || '5432',
        database: decodeURIComponent(parsed.pathname.replace(/^\//, '').split('?')[0] || ''),
    };
}

export function isLocalHost(host: string) {
    return host === '127.0.0.1' || host === 'localhost' || host === '::1';
}

export function assertNotProduction(env: NodeJS.ProcessEnv = process.env) {
    if (env.APP_ENVIRONMENT === 'production' || env.VITE_ENVIRONMENT === 'production') {
        throw new Error('Recovery refused: production environment is not an allowed target');
    }
}

export function assertIsolatedRestoreTarget(
    url: string,
    env: NodeJS.ProcessEnv = process.env
): DatabaseIdentity {
    assertNotProduction(env);
    if (env.RECOVERY_CONFIRM !== 'ISOLATED_CERTIFICATION_ONLY') {
        throw new Error('Recovery refused: RECOVERY_CONFIRM=ISOLATED_CERTIFICATION_ONLY is required');
    }
    const identity = databaseIdentity(url);
    if (!isLocalHost(identity.host)) {
        throw new Error('Recovery refused: restore host must be a local isolated target');
    }
    if (
        FORBIDDEN_DB.test(identity.database) ||
        (/staging|production|prod/i.test(identity.database) && !ALLOWED_RECOVERY_DB.test(identity.database))
    ) {
        throw new Error('Recovery refused: database name is a live staging or production name');
    }
    if (!ALLOWED_RECOVERY_DB.test(identity.database)) {
        throw new Error('Recovery refused: database name must include recovery, restore, or cert');
    }
    if (FORBIDDEN_HOST.test(identity.host)) {
        throw new Error('Recovery refused: hosted provider host is not an allowed restore target');
    }
    return identity;
}

export function assertDistinctSourceAndTarget(sourceUrl: string, targetUrl: string) {
    const source = databaseIdentity(sourceUrl);
    const target = databaseIdentity(targetUrl);
    if (
        source.host === target.host &&
        source.port === target.port &&
        source.database === target.database
    ) {
        throw new Error('Recovery refused: source and target database are the same');
    }
}

export function assertObjectNamespaceIsolated(sourceRoot: string, targetRoot: string) {
    const a = sourceRoot.replace(/\/$/, '');
    const b = targetRoot.replace(/\/$/, '');
    if (!b || b === a) {
        throw new Error('Recovery refused: object restore namespace must differ from the source');
    }
    if (/staging(?!.*(recovery|restore|cert))/i.test(b) && !/recovery|restore|cert/i.test(b)) {
        throw new Error('Recovery refused: object restore path looks like live staging storage');
    }
}
