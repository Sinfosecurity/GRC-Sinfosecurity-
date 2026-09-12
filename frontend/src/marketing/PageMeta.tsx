import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

type RouteMeta = {
    title: string;
    description: string;
};

const DEFAULT_DESCRIPTION =
    'Supreme is a connected governance platform. Supreme Third Party is available for vendor risk, assessments, evidence, findings, explainable residual risk, decision briefs, and reports.';

export const ROUTE_META: Record<string, RouteMeta> = {
    '/': {
        title: 'Supreme — Connected Governance Platform',
        description: DEFAULT_DESCRIPTION,
    },
    '/products/third-party': {
        title: 'Supreme Third Party — Third-Party Risk Management',
        description:
            'Supreme Third Party manages vendor lifecycle, assessments, evidence, findings, explainable residual risk, Decision Briefs, monitoring, and reports.',
    },
    '/products/risk': {
        title: 'Supreme Risk — Enterprise Risk Management',
        description: 'Supreme Risk is a preview of enterprise risk on the same governance graph. It is not sold as a finished production module.',
    },
    '/products/compliance': {
        title: 'Supreme Compliance — Controls & Frameworks',
        description: 'Supreme Compliance is a preview of control and framework mapping on the Supreme graph. Certification is not implied.',
    },
    '/products/privacy': {
        title: 'Supreme Privacy — Privacy Management',
        description: 'Supreme Privacy is a roadmap product for connecting processing activities, vendors, and privacy risk.',
    },
    '/products/ai-governance': {
        title: 'Supreme AI Governance',
        description: 'Supreme AI Governance is a roadmap product. Human decision remains authoritative over residual risk.',
    },
    '/products/intelligence': {
        title: 'Supreme Intelligence — External Risk Intelligence',
        description: 'Supreme Intelligence is a roadmap product for external signals only when a provider is connected and evidence is recorded.',
    },
    '/products/automation': {
        title: 'Supreme Automation — Workflows & Agents',
        description: 'Supreme Automation is a roadmap product for triggered work that keeps humans accountable for scores and decisions.',
    },
    '/pricing': {
        title: 'Supreme Pricing | Third-Party Risk & Governance Platform',
        description:
            'Explore Supreme pricing for third-party risk management and governance, with plans for growing teams, established programs and enterprise organizations.',
    },
    '/trust': {
        title: 'Trust & Security — Supreme',
        description: 'Product security capabilities for Supreme: tenant isolation, RBAC, audit logging, evidence integrity, and fail-closed downloads. No certification is claimed.',
    },
    '/security': {
        title: 'Security — Supreme',
        description: 'How Supreme isolates tenants, records audit events, and fails closed on unsafe evidence. This is a product overview, not a certification.',
    },
    '/demo': {
        title: 'Product Tour — Supreme',
        description: 'A labelled demo walkthrough of the Supreme Third Party path. Demo copy is not production tenant data.',
    },
    '/frameworks': {
        title: 'Framework Architecture — Supreme',
        description: 'How Supreme represents NIST, ISO 27001, SOC 2, CIS, CMMC, HIPAA, and PCI DSS as text-labelled control families without using official marks.',
    },
    '/request-demo': {
        title: 'Request a Demo — Supreme',
        description: 'Request a Supreme demonstration or contact sales about a plan. This form is a real inquiry path.',
    },
    '/login': {
        title: 'Sign In — Supreme',
        description: 'Sign in to a Supreme organization workspace.',
    },
    '/register': {
        title: 'Create organization — Supreme',
        description: 'Create a Supreme organization workspace.',
    },
    '/forgot-password': {
        title: 'Reset password — Supreme',
        description: 'Request a Supreme password reset email.',
    },
    '/activate': {
        title: 'Activate account — Supreme',
        description: 'Activate a Supreme workspace invitation.',
    },
    '/reset-password': {
        title: 'Choose a new password — Supreme',
        description: 'Set a new password with a Supreme reset link.',
    },
    '/privacy': {
        title: 'Privacy — Supreme',
        description: 'Draft factual privacy description for Supreme. Pending legal review.',
    },
    '/terms': {
        title: 'Terms — Supreme',
        description: 'Draft factual terms description for Supreme. Pending legal review.',
    },
    '/subprocessors': {
        title: 'Subprocessors — Supreme',
        description: 'Draft subprocessors status for Supreme. Pending legal review. No invented vendor list.',
    },
    '/status': {
        title: 'Status — Supreme',
        description: 'Public operational status reporting is NOT_CONFIGURED. No fabricated uptime is shown.',
    },
    '/404': {
        title: 'Page not found — Supreme',
        description: 'This Supreme page does not exist. Return home or see the product tour.',
    },
};

function upsertMeta(attribute: 'name' | 'property', key: string, content: string) {
    const selector = `meta[${attribute}="${key}"]`;
    let node = document.head.querySelector(selector) as HTMLMetaElement | null;
    if (!node) {
        node = document.createElement('meta');
        node.setAttribute(attribute, key);
        document.head.appendChild(node);
    }
    node.setAttribute('content', content);
}

function upsertLink(rel: string, href: string) {
    let node = document.head.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
    if (!node) {
        node = document.createElement('link');
        node.setAttribute('rel', rel);
        document.head.appendChild(node);
    }
    node.setAttribute('href', href);
}

export function metaForPath(pathname: string): RouteMeta {
    if (ROUTE_META[pathname]) return ROUTE_META[pathname];
    if (pathname.startsWith('/products/')) {
        return ROUTE_META[pathname] || {
            title: 'Supreme — Connected Governance Platform',
            description: DEFAULT_DESCRIPTION,
        };
    }
    return ROUTE_META['/404'];
}

export function robotsPolicy(env: { VITE_ENVIRONMENT?: string; DEV?: boolean } = {
    VITE_ENVIRONMENT: import.meta.env.VITE_ENVIRONMENT,
    DEV: import.meta.env.DEV,
}) {
    return env.VITE_ENVIRONMENT === 'production' && !env.DEV ? 'index,follow' : 'noindex,nofollow';
}

export default function PageMeta() {
    const location = useLocation();
    const meta = metaForPath(location.pathname);
    const origin = import.meta.env.VITE_PUBLIC_SITE_URL || window.location.origin;
    const canonical = `${String(origin).replace(/\/$/, '')}${location.pathname}`;
    const robots = robotsPolicy();

    useEffect(() => {
        document.title = meta.title;
        upsertMeta('name', 'description', meta.description);
        upsertMeta('name', 'robots', robots);
        upsertLink('canonical', canonical);
        upsertMeta('property', 'og:title', meta.title);
        upsertMeta('property', 'og:description', meta.description);
        upsertMeta('property', 'og:url', canonical);
        upsertMeta('property', 'og:type', 'website');
        upsertMeta('name', 'twitter:card', 'summary');
        upsertMeta('name', 'twitter:title', meta.title);
        upsertMeta('name', 'twitter:description', meta.description);
    }, [canonical, meta.description, meta.title, robots]);

    return null;
}
