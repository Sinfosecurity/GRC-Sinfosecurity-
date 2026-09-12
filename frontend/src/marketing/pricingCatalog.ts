export type BillingInterval = 'monthly' | 'annual';
export type CommercialPlanId = 'STARTER' | 'PROFESSIONAL' | 'BUSINESS' | 'ENTERPRISE';
export type ComparisonMark = 'included' | 'not-included' | 'coming-soon' | 'custom';

export type PricingCta = {
    label: string;
    href: string;
    kind: 'primary' | 'secondary';
};

export type CommercialTier = {
    id: CommercialPlanId;
    name: string;
    audience: string;
    monthly: number | null;
    annual: number | null;
    annualMonthlyEquivalent: number | null;
    custom: boolean;
    startingAnnual?: number;
    popular?: boolean;
    capabilities: string[];
    primaryCta: PricingCta;
    secondaryCta?: PricingCta;
};

function signupHref(plan: CommercialPlanId): string {
    return `/register?source=pricing&selectedPlan=${plan}&intent=get-started`;
}

function demoHref(plan: CommercialPlanId, intent: 'demo' | 'enterprise-sales'): string {
    return `/request-demo?source=pricing&selectedPlan=${plan}&intent=${intent}`;
}

export const COMMERCIAL_PRICING_TIERS: CommercialTier[] = [
    {
        id: 'STARTER',
        name: 'Starter',
        audience: 'Growing teams establishing a structured third-party risk program.',
        monthly: 599,
        annual: 5990,
        annualMonthlyEquivalent: 499,
        custom: false,
        capabilities: [
            'Vendor inventory',
            'Assessments',
            'Evidence management',
            'Explainable risk scoring',
            'Findings',
            'Decision briefs',
            'Standard reports',
            'Email notifications',
        ],
        primaryCta: { label: 'Get Started', href: signupHref('STARTER'), kind: 'primary' },
    },
    {
        id: 'PROFESSIONAL',
        name: 'Professional',
        audience: 'Organizations operating established third-party risk programs that need stronger assessment, remediation, monitoring, and reporting.',
        monthly: 1499,
        annual: 14990,
        annualMonthlyEquivalent: 1249,
        custom: false,
        popular: true,
        capabilities: [
            'Everything in Starter',
            'Findings and CAP / remediation',
            'Questionnaires and assessments',
            'Decision briefs',
            'Executive reporting',
            'Vendor scorecards',
            'Monitoring workspace',
            'Approval workflows',
            'Advanced reporting',
        ],
        primaryCta: { label: 'Get Started', href: signupHref('PROFESSIONAL'), kind: 'primary' },
        secondaryCta: { label: 'Request a Demo', href: demoHref('PROFESSIONAL', 'demo'), kind: 'secondary' },
    },
    {
        id: 'BUSINESS',
        name: 'Business',
        audience: 'Larger organizations coordinating third-party risk across multiple teams and business functions.',
        monthly: 2999,
        annual: 29990,
        annualMonthlyEquivalent: 2499,
        custom: false,
        capabilities: [
            'Everything in Professional',
            'Role-based administration',
            'Invitation and access control',
            'Audit history',
            'Shared evidence reuse',
        ],
        primaryCta: { label: 'Request a Demo', href: demoHref('BUSINESS', 'demo'), kind: 'primary' },
    },
    {
        id: 'ENTERPRISE',
        name: 'Enterprise',
        audience: 'Pricing is based on organizational scale, third-party inventory, administrative users, required capabilities, and implementation needs.',
        monthly: null,
        annual: null,
        annualMonthlyEquivalent: null,
        custom: true,
        startingAnnual: 59000,
        capabilities: [
            'Custom pricing and rollout',
            'Tenant isolation',
            'Environment controls',
            'Sales-led onboarding',
        ],
        primaryCta: { label: 'Contact Sales', href: demoHref('ENTERPRISE', 'enterprise-sales'), kind: 'primary' },
        secondaryCta: { label: 'Request a Demo', href: demoHref('ENTERPRISE', 'demo'), kind: 'secondary' },
    },
];

export const COMPARISON_ROWS: Array<{
    feature: string;
    starter: ComparisonMark;
    professional: ComparisonMark;
    business: ComparisonMark;
    enterprise: ComparisonMark;
}> = [
    { feature: 'Vendor Management', starter: 'included', professional: 'included', business: 'included', enterprise: 'included' },
    { feature: 'Assessments', starter: 'included', professional: 'included', business: 'included', enterprise: 'included' },
    { feature: 'Evidence', starter: 'included', professional: 'included', business: 'included', enterprise: 'included' },
    { feature: 'Explainable Risk', starter: 'included', professional: 'included', business: 'included', enterprise: 'included' },
    { feature: 'Findings & Remediation', starter: 'included', professional: 'included', business: 'included', enterprise: 'included' },
    { feature: 'Decision Briefs', starter: 'included', professional: 'included', business: 'included', enterprise: 'included' },
    { feature: 'Executive Reporting', starter: 'not-included', professional: 'included', business: 'included', enterprise: 'included' },
    { feature: 'Monitoring', starter: 'not-included', professional: 'included', business: 'included', enterprise: 'included' },
    { feature: 'Workflow & Approvals', starter: 'not-included', professional: 'included', business: 'included', enterprise: 'included' },
    { feature: 'Administration', starter: 'included', professional: 'included', business: 'included', enterprise: 'included' },
    { feature: 'API', starter: 'coming-soon', professional: 'coming-soon', business: 'coming-soon', enterprise: 'coming-soon' },
    { feature: 'Webhooks', starter: 'coming-soon', professional: 'coming-soon', business: 'coming-soon', enterprise: 'coming-soon' },
    { feature: 'SSO', starter: 'not-included', professional: 'not-included', business: 'coming-soon', enterprise: 'coming-soon' },
    { feature: 'SCIM', starter: 'not-included', professional: 'not-included', business: 'coming-soon', enterprise: 'coming-soon' },
    { feature: 'Support', starter: 'included', professional: 'included', business: 'included', enterprise: 'custom' },
];

export const PRICING_FAQS = [
    {
        question: 'Can I switch plans later?',
        answer: 'Yes. You can move to a different plan as your program grows. Business and Enterprise changes are coordinated with sales.',
    },
    {
        question: 'Do you offer annual billing?',
        answer: 'Yes. Annual billing is available for Starter, Professional, and Business, and saves 2 months compared with twelve monthly payments.',
    },
    {
        question: 'What counts as a third party?',
        answer: 'A third party is a vendor, supplier, or service provider you record in Supreme for assessment, evidence, and residual-risk tracking.',
    },
    {
        question: 'Can I request a demonstration?',
        answer: 'Yes. Use Request a Demo on Professional, Business, or Enterprise, or the Request a Demo link in the site header.',
    },
    {
        question: 'Does Enterprise have fixed pricing?',
        answer: 'No. Enterprise uses custom pricing starting from $59,000/year, based on organizational scale, inventory, administrators, capabilities, and implementation needs.',
    },
    {
        question: 'Do you offer a trial?',
        answer: 'Creating a workspace starts a 14-day application-level trial. That trial is managed by Supreme, not by a Stripe trial period.',
    },
    {
        question: 'Are implementation services included?',
        answer: 'Published plan prices cover the software subscription. Implementation and rollout assistance are scoped with sales when needed.',
    },
];

export const ANNUAL_SAVINGS_COPY = 'Save 2 months with annual billing';

export function formatUsd(amount: number): string {
    return `$${amount.toLocaleString('en-US')}`;
}

export function comparisonLabel(mark: ComparisonMark): string {
    if (mark === 'included') return 'Included';
    if (mark === 'not-included') return 'Not Included';
    if (mark === 'coming-soon') return 'Coming Soon';
    return 'Custom';
}

export function hasStripePriceId(value: string): boolean {
    return /price_[A-Za-z0-9]+/.test(value);
}
