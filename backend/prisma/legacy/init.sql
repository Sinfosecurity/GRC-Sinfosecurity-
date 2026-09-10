-- Preserved historical supplemental SQL (not a Prisma migration).
-- Original file lived at prisma/migrations/init.sql.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

COMMENT ON TABLE "User" IS 'System users with role-based access control';
COMMENT ON TABLE "Organization" IS 'Multi-tenant organizations';
COMMENT ON TABLE "Risk" IS 'Risk register and assessments';
COMMENT ON TABLE "Control" IS 'Security controls and testing';
COMMENT ON TABLE "ComplianceFramework" IS 'Compliance frameworks (GDPR, ISO, etc)';
COMMENT ON TABLE "AuditLog" IS 'Complete audit trail of all system actions';
