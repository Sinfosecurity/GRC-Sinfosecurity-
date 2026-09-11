import { deriveAssessmentStatus } from '../services/vendorAssessmentStatus';
import { CreateVendorSchema } from '../validators/vendor.validators';

describe('vendor assessment status sync', () => {
    it('returns NOT_STARTED when no assessment exists', () => {
        expect(deriveAssessmentStatus(null)).toBe('NOT_STARTED');
        expect(deriveAssessmentStatus(undefined)).toBe('NOT_STARTED');
    });

    it('returns COMPLETED after a completed assessment', () => {
        expect(deriveAssessmentStatus({ status: 'COMPLETED' })).toBe('COMPLETED');
    });

    it('returns OVERDUE when due date has passed', () => {
        expect(deriveAssessmentStatus({
            status: 'IN_PROGRESS',
            dueDate: new Date(Date.now() - 86400000),
        })).toBe('OVERDUE');
    });

    it('returns the live status for an in-progress assessment', () => {
        expect(deriveAssessmentStatus({
            status: 'IN_PROGRESS',
            dueDate: new Date(Date.now() + 86400000),
        })).toBe('IN_PROGRESS');
    });
});

describe('CreateVendorSchema', () => {
    it('rejects the previous incomplete payload', () => {
        const parsed = CreateVendorSchema.safeParse({
            name: 'Acme',
            category: 'Cloud Services',
            tier: 'Medium',
            primaryContact: 'ops@acme.test',
            website: '',
            services: [],
        });
        expect(parsed.success).toBe(false);
    });

    it('accepts a complete Prisma-aligned payload', () => {
        const parsed = CreateVendorSchema.parse({
            name: 'Acme Cloud',
            vendorType: 'SAAS',
            category: 'CLOUD_HOSTING',
            tier: 'MEDIUM',
            primaryContact: 'Alex Rivera',
            contactEmail: 'alex@acme.test',
            servicesProvided: 'Cloud operations',
        });
        expect(parsed.dataTypesAccessed).toEqual([]);
        expect(parsed.vendorType).toBe('SAAS');
    });
});
