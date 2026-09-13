import {
    configuredDeadline,
    consentProviderStatus,
    containsForbiddenClaim,
    deletionHonesty,
    dpiaScreeningAdvice,
    humanPrivacyLabel,
    maskRequester,
    neutralizeSpreadsheetCell,
    nextPrivacyId,
    notificationHonesty,
    PRIVACY_HONESTY,
} from '../services/enterprisePrivacyEngine';

describe('supreme privacy honesty', () => {
    it('refuses legal conclusions and prefixes spreadsheet formulas', () => {
        expect(PRIVACY_HONESTY).toMatch(/not a finding that processing is lawful/i);
        expect(containsForbiddenClaim('This processing is GDPR compliant')).toBe(true);
        expect(containsForbiddenClaim('This transfer is lawful')).toBe(true);
        expect(containsForbiddenClaim('You must notify the regulator')).toBe(true);
        expect(containsForbiddenClaim('Recorded legal basis for GDPR')).toBe(false);
        expect(neutralizeSpreadsheetCell('=CMD()')).toBe("'=CMD()");
        expect(nextPrivacyId('PA', 1)).toBe('PA-00001');
        expect(nextPrivacyId('DSR', 12)).toBe('DSR-00012');
    });

    it('recommends DPIA review without saying legally required', () => {
        expect(dpiaScreeningAdvice(2)).toMatch(/may be required \/ review recommended/i);
        expect(dpiaScreeningAdvice(2)).toMatch(/not a statement that a DPIA is legally required/i);
        expect(dpiaScreeningAdvice(2)).not.toMatch(/this DPIA is legally required/i);
        expect(dpiaScreeningAdvice(0)).toMatch(/not a legal clearance/i);
    });

    it('explains configured deadlines and masks requester identity', () => {
        const gdpr = configuredDeadline('GDPR', 'ACCESS', new Date('2026-09-01T00:00:00.000Z'));
        expect(gdpr.days).toBe(30);
        expect(gdpr.why).toMatch(/configured/i);
        expect(gdpr.why).not.toMatch(/legal advice is/i);
        const ccpa = configuredDeadline('CCPA_CPRA', 'OPT_OUT', new Date('2026-09-01T00:00:00.000Z'));
        expect(ccpa.days).toBe(45);
        expect(maskRequester('jane.doe@example.com')).toBe('j•••@example.com');
        expect(maskRequester('AB')).toBe('••••');
    });

    it('humanizes catalog keys and keeps deletion/consent/incident language honest', () => {
        expect(humanPrivacyLabel('CUSTOMERS')).toBe('Customers');
        expect(humanPrivacyLabel('SERVICE_PROVIDER')).toBe('Service Provider');
        expect(humanPrivacyLabel('SPECIAL_CATEGORY')).toBe('Special Category Data');
        expect(deletionHonesty('CLOSED')).toMatch(/not proof that external-system data is deleted/i);
        expect(deletionHonesty('LEGAL_HOLD', 'Hold')).toMatch(/not complete as a deletion/i);
        expect(consentProviderStatus('MANUAL')).toMatch(/not configured/i);
        expect(consentProviderStatus('IMPORTED')).toBe('Imported');
        expect(notificationHonesty('NOTIFICATION_DETERMINED_REQUIRED')).not.toMatch(/you must notify/i);
        expect(notificationHonesty('REVIEW_REQUIRED')).toMatch(/notification assessment required/i);
    });
});
