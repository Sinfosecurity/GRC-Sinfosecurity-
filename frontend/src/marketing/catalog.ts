export type Availability = 'available' | 'preview' | 'roadmap' | 'coming-soon';

export type ProductModule = {
    slug: string;
    name: string;
    subtitle: string;
    summary: string;
    status: Availability;
    href: string;
    points: string[];
};

export const PRODUCTS: ProductModule[] = [
    {
        slug: 'third-party',
        name: 'Supreme Third Party',
        subtitle: 'Third-Party Risk Management',
        summary: 'Vendors, assessments, evidence, findings, explainable residual risk, decision briefs, and reports.',
        status: 'available',
        href: '/products/third-party',
        points: ['Vendor inventory', 'Assessments', 'Evidence', 'Findings', 'Explainable risk', 'Decision briefs', 'Monitoring'],
    },
    {
        slug: 'risk',
        name: 'Supreme Risk',
        subtitle: 'Enterprise Risk Management',
        summary: 'Enterprise risk register, heatmap, appetite, and treatments connected to the same evidence and decisions.',
        status: 'preview',
        href: '/products/risk',
        points: ['Risk register', 'Heatmap', 'Appetite', 'Treatments'],
    },
    {
        slug: 'compliance',
        name: 'Supreme Compliance',
        subtitle: 'Controls & Frameworks',
        summary: 'Map controls once and reuse evidence across frameworks, audits, and vendor reviews.',
        status: 'preview',
        href: '/products/compliance',
        points: ['Controls', 'Framework mapping', 'Evidence reuse'],
    },
    {
        slug: 'privacy',
        name: 'Supreme Privacy',
        subtitle: 'Privacy Management',
        summary: 'Connect processing activities, vendors, and privacy risk on the same governance graph.',
        status: 'roadmap',
        href: '/products/privacy',
        points: ['Processing inventory', 'Vendor linkage', 'Privacy risk'],
    },
    {
        slug: 'ai-governance',
        name: 'Supreme AI Governance',
        subtitle: 'AI Governance',
        summary: 'Inventory AI systems, record use, and require a human decision before residual risk changes.',
        status: 'roadmap',
        href: '/products/ai-governance',
        points: ['AI inventory', 'Use cases', 'Human approval'],
    },
    {
        slug: 'intelligence',
        name: 'Supreme Intelligence',
        subtitle: 'External Risk Intelligence',
        summary: 'Bring external signals into residual risk only when a provider is connected and evidence is recorded.',
        status: 'roadmap',
        href: '/products/intelligence',
        points: ['External signals', 'Provider status', 'Evidence-backed intake'],
    },
    {
        slug: 'automation',
        name: 'Supreme Automation',
        subtitle: 'Workflows & Agents',
        summary: 'Automate repetitive governance work without removing human accountability for scores or decisions.',
        status: 'roadmap',
        href: '/products/automation',
        points: ['Triggered workflows', 'Notifications', 'Human checkpoints'],
    },
];

export const GRAPH_NODES = [
    'Identity',
    'Evidence',
    'Controls',
    'Risks',
    'Decisions',
    'Audit',
    'Automation',
    'Intelligence',
] as const;

export const DIFFERENTIATORS = [
    {
        title: 'Explainable by design',
        body: 'Every important score and recommendation can be traced to recorded evidence and contributing factors.',
    },
    {
        title: 'Evidence once. Use everywhere.',
        body: 'Reuse the same evidence across vendors, controls, frameworks, risks, and audits.',
    },
    {
        title: 'Decision-driven governance',
        body: 'Turn governance work into documented, auditable decisions with an immutable snapshot.',
    },
    {
        title: 'Connected governance graph',
        body: 'See how vendors, controls, risks, AI systems, privacy, and regulations affect one another.',
    },
    {
        title: 'Intelligent automation',
        body: 'Automate repetitive work without letting automation own residual risk or the final decision.',
    },
    {
        title: 'Faster to implement',
        body: 'Smart defaults, guided workflows, imports, and a connected architecture instead of isolated modules.',
    },
];

export const EXECUTIVE_ROLES = [
    { role: 'CISO', value: 'See third-party and cyber risk in one place.' },
    { role: 'CRO', value: 'Understand enterprise risk and the decisions that change it.' },
    { role: 'Compliance', value: 'Reuse controls and evidence across frameworks.' },
    { role: 'Privacy', value: 'Connect processing, vendors, and privacy risk.' },
    { role: 'AI Governance', value: 'Inventory and govern AI use with human approval.' },
    { role: 'Procurement', value: 'Know supplier risk before contracting.' },
    { role: 'Internal Audit', value: 'Trace controls, evidence, findings, and decisions.' },
    { role: 'Board', value: 'Understand the risks that require executive attention.' },
];

export const FRAMEWORKS = ['NIST', 'ISO 27001', 'SOC 2', 'CIS', 'CMMC', 'HIPAA', 'PCI DSS'] as const;

export const TRUST_CAPABILITIES = [
    'Tenant isolation',
    'Role-based access',
    'Audit logging',
    'Encryption architecture',
    'Evidence integrity',
    'Immutable decision history',
    'Fail-closed evidence policy',
];

export const PRICING_TIERS = [
    {
        name: 'Starter',
        audience: 'Growing teams establishing a third-party program',
        capabilities: ['Vendor inventory', 'Assessments', 'Evidence', 'Explainable risk'],
    },
    {
        name: 'Professional',
        audience: 'Programs that need findings, briefs, and reporting',
        capabilities: ['Decision briefs', 'Findings and CAP', 'Executive and scorecard reports', 'Monitoring workspace'],
    },
    {
        name: 'Business',
        audience: 'Multi-team organizations coordinating approvals',
        capabilities: ['Role-based administration', 'Invitation and access control', 'Audit history', 'Shared evidence reuse'],
    },
    {
        name: 'Enterprise',
        audience: 'Organizations that require isolation, scale, and guided rollout',
        capabilities: ['Tenant isolation', 'Environment controls', 'Import and implementation support', 'Named security review'],
    },
];

export const FOOTER_GROUPS: { title: string; links: { label: string; href: string }[] }[] = [
    {
        title: 'Products',
        links: PRODUCTS.map((product) => ({ label: product.name, href: product.href })),
    },
    {
        title: 'Solutions',
        links: [
            { label: 'Third-party risk', href: '/solutions' },
            { label: 'Enterprise risk', href: '/solutions' },
            { label: 'Compliance programs', href: '/solutions' },
        ],
    },
    {
        title: 'Frameworks',
        links: [{ label: 'Framework architecture', href: '/frameworks' }],
    },
    {
        title: 'Resources',
        links: [
            { label: 'Product tour', href: '/demo' },
            { label: 'Resources', href: '/resources' },
        ],
    },
    {
        title: 'Trust',
        links: [
            { label: 'Trust & Security', href: '/trust' },
            { label: 'Security', href: '/security' },
            { label: 'Status', href: '/status' },
        ],
    },
    {
        title: 'Company',
        links: [
            { label: 'Company', href: '/company' },
            { label: 'Request a demo', href: '/request-demo' },
        ],
    },
    {
        title: 'Legal',
        links: [
            { label: 'Privacy', href: '/privacy' },
            { label: 'Terms', href: '/terms' },
            { label: 'Subprocessors', href: '/subprocessors' },
        ],
    },
];

export function availabilityLabel(status: Availability): string | null {
    if (status === 'available') return null;
    if (status === 'preview') return 'Preview';
    if (status === 'roadmap') return 'Roadmap';
    return 'Coming soon';
}

export function productBySlug(slug: string): ProductModule | undefined {
    return PRODUCTS.find((product) => product.slug === slug);
}
