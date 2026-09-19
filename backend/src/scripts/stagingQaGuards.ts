/**
 * Staging QA persona bootstrap may never run against production.
 * Product authentication and vendor invitation mechanics are not altered here.
 */

export const QA_ORG_SLUG = 'supreme-grc-qa';
export const QA_ORG_NAME = 'Supreme GRC QA Organization';

export const QA_VENDOR_CONTACT = {
    name: 'QA Vendor Contact',
    email: 'qa.vendor@supremegrc.test',
} as const;

export const MANUAL_CASE = {
    proposedThirdPartyName: 'Microsoft Corporation QA',
    proposedServiceName: 'Azure Hosting QA',
    businessPurpose: 'Host a customer-facing QA application.',
} as const;

const ALLOWED_APP_ENV = new Set(['staging', 'test']);

export function assertStagingQaPersonasAllowed(env: NodeJS.ProcessEnv = process.env): void {
    const appEnv = String(env.APP_ENVIRONMENT || '').trim().toLowerCase();
    const viteEnv = String(env.VITE_ENVIRONMENT || '').trim().toLowerCase();
    if (appEnv === 'production' || viteEnv === 'production') {
        throw new Error('QA persona bootstrap refused: production environment is not an allowed target.');
    }
    if (!ALLOWED_APP_ENV.has(appEnv)) {
        throw new Error('QA persona bootstrap refused: APP_ENVIRONMENT must be staging or test.');
    }
    if (env.ALLOW_STAGING_QA_PERSONAS !== 'true') {
        throw new Error('QA persona bootstrap refused: ALLOW_STAGING_QA_PERSONAS=true is required.');
    }
}

export function assertQaOrganizationTarget(organization: { slug?: string | null; name?: string | null }): void {
    if (organization.slug !== QA_ORG_SLUG) {
        throw new Error(`QA reset refused: organization slug must be ${QA_ORG_SLUG}.`);
    }
    if (organization.name !== QA_ORG_NAME) {
        throw new Error(`QA reset refused: organization name must be ${QA_ORG_NAME}.`);
    }
}
