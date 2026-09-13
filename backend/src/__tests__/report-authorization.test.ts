import { canExportReport, reportDenialReason } from '../security/reportAuthorization';

describe('report authorization matrix', () => {
    it('lets organization admins, risk managers, and approvers export board packs', () => {
        expect(canExportReport('ORGANIZATION_ADMIN', 'board')).toBe(true);
        expect(canExportReport('RISK_MANAGER', 'board')).toBe(true);
        expect(canExportReport('APPROVER', 'board')).toBe(true);
        expect(canExportReport('ASSESSOR', 'board')).toBe(false);
        expect(canExportReport('VIEWER', 'board')).toBe(false);
    });

    it('lets assessors export operational reports but not viewers', () => {
        expect(canExportReport('ASSESSOR', 'operational')).toBe(true);
        expect(canExportReport('VIEWER', 'operational')).toBe(false);
        expect(reportDenialReason('VIEWER', 'operational')).toMatch(/cannot download/i);
    });
});
