process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-which-is-long-enough';
process.env.JWT_REFRESH_SECRET =
    process.env.JWT_REFRESH_SECRET || 'test-refresh-secret-key-which-is-long-enough';
process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';
function testDatabaseUrl() {
    const raw =
        process.env.TEST_DATABASE_URL ||
        process.env.DATABASE_URL ||
        'postgresql://supreme_test:supreme_test@127.0.0.1:5432/supreme_risk_test';
    if (/[?&]connection_limit=/.test(raw)) return raw;
    return `${raw}${raw.includes('?') ? '&' : '?'}connection_limit=5&pool_timeout=20`;
}
process.env.DATABASE_URL = testDatabaseUrl();
process.env.TEST_DATABASE_URL = process.env.DATABASE_URL;
process.env.ALLOW_PENDING_DOWNLOADS = process.env.ALLOW_PENDING_DOWNLOADS || 'false';
process.env.ALLOW_UNSCANNED_DOWNLOADS = process.env.ALLOW_UNSCANNED_DOWNLOADS || 'false';
process.env.ALLOW_LOCAL_OBJECT_STORAGE = process.env.ALLOW_LOCAL_OBJECT_STORAGE || 'true';
