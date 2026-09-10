process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-which-is-long-enough';
process.env.JWT_REFRESH_SECRET =
    process.env.JWT_REFRESH_SECRET || 'test-refresh-secret-key-which-is-long-enough';
process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';
process.env.DATABASE_URL =
    process.env.TEST_DATABASE_URL ||
    process.env.DATABASE_URL ||
    'postgresql://supreme_test:supreme_test@127.0.0.1:5432/supreme_risk_test';
process.env.ALLOW_PENDING_DOWNLOADS = process.env.ALLOW_PENDING_DOWNLOADS || 'false';
process.env.ALLOW_UNSCANNED_DOWNLOADS = process.env.ALLOW_UNSCANNED_DOWNLOADS || 'false';
process.env.ALLOW_LOCAL_OBJECT_STORAGE = process.env.ALLOW_LOCAL_OBJECT_STORAGE || 'true';
