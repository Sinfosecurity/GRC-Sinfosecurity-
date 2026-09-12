import { Link, useLocation } from 'react-router-dom';
import MarketingLayout from '../marketing/MarketingLayout';

const DRAFTS: Record<string, { title: string; lede: string; sections: { heading: string; body: string }[] }> = {
    '/privacy': {
        title: 'Privacy',
        lede: 'This page describes how the Supreme product handles account and tenant data today. It is a draft for later counsel review, not a lawyer-approved privacy notice.',
        sections: [
            {
                heading: 'What this product stores',
                body: 'An organization workspace stores users, vendors, assessments, evidence metadata, findings, decisions, audit events, and optional billing state for that tenant. Inquiry forms store the name, email, company, role, and stated need you submit.',
            },
            {
                heading: 'Who can see it',
                body: 'Tenant data is scoped to the organization that owns it. Privileged actions require an authorized role. Supreme operators do not present other customers’ data in this product.',
            },
            {
                heading: 'What this page does not claim',
                body: 'No subprocessors list, retention schedule, or cross-border transfer statement is final until legal review. Do not treat this draft as a contractual privacy commitment.',
            },
        ],
    },
    '/terms': {
        title: 'Terms',
        lede: 'Commercial terms are provided during contracting. This draft records product facts only and is pending legal review.',
        sections: [
            {
                heading: 'What Supreme is today',
                body: 'Supreme Third Party is the available product for vendor inventory, assessments, evidence, findings, explainable residual risk, Decision Briefs, monitoring, and reports. Other named products are Preview or Roadmap and are labelled as such.',
            },
            {
                heading: 'Accounts and tenancy',
                body: 'A workspace belongs to one organization. Authentication, invitations, and role checks are enforced by the server. Frontend subscription state is not the source of entitlement.',
            },
            {
                heading: 'What this page does not claim',
                body: 'This is not a master services agreement, SLA, or acceptable-use policy. Those documents are issued in contracting, not invented here.',
            },
        ],
    },
    '/subprocessors': {
        title: 'Subprocessors',
        lede: 'A production subprocessors list will be published when production hosting is contracted and reviewed. This draft does not invent a vendor list.',
        sections: [
            {
                heading: 'Current public statement',
                body: 'No production subprocessors are asserted on this page. Isolated preview and staging use local or separately provisioned services that are not a customer-facing subprocessors roster.',
            },
            {
                heading: 'What will appear after review',
                body: 'When production infrastructure is contracted, this page should list each processor, its purpose, and its location after legal review. Until then, no logos or invented vendor names are shown.',
            },
        ],
    },
};

export default function LegalDraft() {
    const location = useLocation();
    const page = DRAFTS[location.pathname] || DRAFTS['/privacy'];

    return (
        <MarketingLayout>
            <section className="mkt-page">
                <div className="mkt-shell">
                    <p className="mkt-draft-banner" role="status">Draft — pending legal review</p>
                    <p className="mkt-kicker">{page.title}</p>
                    <h1 className="mkt-display">{page.title}</h1>
                    <p className="mkt-lede">{page.lede}</p>
                    <div className="mkt-why-grid">
                        {page.sections.map((section) => (
                            <article key={section.heading} className="mkt-why-card">
                                <h2>{section.heading}</h2>
                                <p>{section.body}</p>
                            </article>
                        ))}
                    </div>
                    <div className="mkt-hero-actions">
                        <Link className="mkt-btn mkt-btn-gold" to="/request-demo">Request a Demo</Link>
                        <Link className="mkt-btn mkt-btn-ghost" to="/trust">Trust &amp; Security</Link>
                    </div>
                </div>
            </section>
        </MarketingLayout>
    );
}
