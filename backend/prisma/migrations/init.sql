-- Migration: Initial Schema Setup
-- This migration creates all core tables for the GRC Platform

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Add comments to important tables
COMMENT ON TABLE "User" IS 'System users with role-based access control';
COMMENT ON TABLE "Organization" IS 'Multi-tenant organizations';
COMMENT ON TABLE "Risk" IS 'Risk register and assessments';
COMMENT ON TABLE "Control" IS 'Security controls and testing';
COMMENT ON TABLE "ComplianceFramework" IS 'Compliance frameworks (GDPR, ISO, etc)';
COMMENT ON TABLE "AuditLog" IS 'Complete audit trail of all system actions';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON "AuditLog"(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_risk_org_status ON "Risk"(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_control_org_status ON "Control"(organization_id, status);

-- Create function for updating updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for auto-updating updated_at
CREATE TRIGGER update_user_updated_at BEFORE UPDATE ON "User"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_organization_updated_at BEFORE UPDATE ON "Organization"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_risk_updated_at BEFORE UPDATE ON "Risk"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_control_updated_at BEFORE UPDATE ON "Control"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

