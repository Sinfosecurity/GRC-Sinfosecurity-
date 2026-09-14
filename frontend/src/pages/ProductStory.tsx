import { Link, useParams } from 'react-router-dom';
import MarketingLayout from '../marketing/MarketingLayout';
import { availabilityLabel, productBySlug } from '../marketing/catalog';

type Story = {
    problem: string;
    audience: string;
    workflow: string;
    useful: string;
    connects: string;
    outcome: string;
};

const STORIES: Record<string, Story> = {
    risk: {
        problem: 'Enterprise risk lives in a register while vendor, control, and decision work live somewhere else.',
        audience: 'Risk managers, executives, and anyone who must treat residual risk as a decision.',
        workflow: 'Identify, triage, assess, control, treat, decide, monitor, and review. The register remains available; attention and decisions come first.',
        useful: 'Appetite, treatments, and residual rating stay explainable. A treatment plan does not silently lower the score.',
        connects: 'Enterprise risks link to vendors, controls, evidence, and recorded decisions on the same graph.',
        outcome: 'People can see what is outside appetite, what changed, and which decision is waiting.',
    },
    compliance: {
        problem: 'Frameworks become a catalog of requirements instead of an operating program.',
        audience: 'Compliance managers who need readiness, gaps, evidence, and attestations — not a certificate claim.',
        workflow: 'Activate what applies, map controls, attach evidence, test, record gaps and exceptions, then attest.',
        useful: 'The same control and evidence can satisfy more than one labelled framework.',
        connects: 'Requirements sit on shared controls and evidence used by Third Party, Risk, Privacy, and AI.',
        outcome: 'The team can see how much applies, how much is mapped, evidenced, and tested, and what still needs action.',
    },
    privacy: {
        problem: 'Processing records, vendors, and rights requests are tracked separately from risk and evidence.',
        audience: 'Privacy leaders who need to know what data exists, why it is processed, where it goes, and what is due.',
        workflow: 'Record activities, map data, review transfers, complete DPIAs, answer rights, and close incidents.',
        useful: 'Deadlines and vendor privacy obligations stay visible as work, not as a policy binder.',
        connects: 'A vendor that processes personal data is the same vendor already in Third Party, with shared evidence.',
        outcome: 'Privacy can answer what data we have, who receives it, what risk exists, and what action is required.',
    },
    'ai-governance': {
        problem: 'AI inventories become model lists that do not tell anyone who is affected or what must be approved.',
        audience: 'AI governance owners, risk, and privacy partners who must review use before it stays in production.',
        workflow: 'Register the system and use case, record people and data affected, test, assign oversight, and decide.',
        useful: 'Failed tests, missing approval, and production use without a decision are attention — not a model zoo.',
        connects: 'Providers, data, vendors, controls, and evidence stay on the same graph as the AI system.',
        outcome: 'Leaders can see which AI needs review, why, and who must decide.',
    },
    intelligence: {
        problem: 'External signals are easy to market and hard to keep honest.',
        audience: 'Future operators who will ingest provider signals only when a provider is actually connected.',
        workflow: 'Not available. External intelligence remains on the roadmap.',
        useful: 'When built, a signal will become evidence or a recorded event — not an invented score movement.',
        connects: 'It will attach to the same vendors, risks, and decisions. It is not sold as live product.',
        outcome: 'No customer should expect live intelligence feeds today.',
    },
    automation: {
        problem: 'Automation that owns risk or approval removes accountability.',
        audience: 'Future operators who want administration automated and decisions left human.',
        workflow: 'Not available. Automation remains on the roadmap.',
        useful: 'When built, it will move repetitive work without writing residual risk or the final decision.',
        connects: 'It will use the same graph and audit trail. It is not sold as live product.',
        outcome: 'No customer should expect governed agents or live automation today.',
    },
    'governance-graph': {
        problem: 'People cannot see what a change affects without opening five products.',
        audience: 'Analysts and leads who need lineage and impact in customer language.',
        workflow: 'Search or open an object, then read what supports it and what it affects. Lists come before spectacle.',
        useful: 'Relationships are described as “supported by evidence” or “mapped to control”, not raw graph codes.',
        connects: 'Every accepted product writes to the same graph.',
        outcome: 'A change can be traced to the people and objects that must act.',
    },
    'controls-evidence': {
        problem: 'The same file is uploaded for every audit, vendor, and framework.',
        audience: 'Control owners, assessors, and anyone who must reuse assurance work.',
        workflow: 'Implement, test, attach evidence, and reuse the object across products. Implemented is not effective. A file is not a test.',
        useful: 'Freshness, owner, reuse, and customer-safe scan status stay on the evidence object.',
        connects: 'Controls and evidence sit under Governance and are used by Third Party, Risk, Compliance, Privacy, and AI.',
        outcome: 'Evidence once. Govern everywhere.',
    },
};

const FALLBACK: Story = {
    problem: 'This page is reserved so product navigation never 404s.',
    audience: 'Prospects reviewing the Supreme platform.',
    workflow: 'Request a conversation or take the product tour.',
    useful: 'Availability is labelled. Roadmap items are not sold as live.',
    connects: 'Accepted products share one graph and one evidence library.',
    outcome: 'A person can see what exists now and what remains future work.',
};

export default function ProductStory() {
    const { slug = '' } = useParams();
    const product = productBySlug(slug);
    const story = STORIES[slug] || FALLBACK;
    const title = product?.name
        || (slug === 'governance-graph' ? 'Governance Graph' : slug === 'controls-evidence' ? 'Shared Controls & Evidence' : 'Supreme');
    const status = product ? availabilityLabel(product.status) : 'Private testing';

    return (
        <MarketingLayout>
            <section className="mkt-page">
                <div className="mkt-shell">
                    <p className="mkt-kicker">{status}</p>
                    <h1 className="mkt-display">{title}</h1>
                    <p className="mkt-lede">{product?.summary || story.problem}</p>
                    {product && (
                        <div className="mkt-chip-row">
                            {product.points.map((point) => (
                                <span key={point} className="mkt-chip">{point}</span>
                            ))}
                        </div>
                    )}
                </div>
            </section>
            <section className="mkt-section">
                <div className="mkt-shell">
                    <div className="mkt-why-grid">
                        <article className="mkt-why-card">
                            <h3>What problem it solves</h3>
                            <p>{story.problem}</p>
                        </article>
                        <article className="mkt-why-card">
                            <h3>Who it is for</h3>
                            <p>{story.audience}</p>
                        </article>
                        <article className="mkt-why-card">
                            <h3>How the work runs</h3>
                            <p>{story.workflow}</p>
                        </article>
                        <article className="mkt-why-card">
                            <h3>What makes it useful</h3>
                            <p>{story.useful}</p>
                        </article>
                        <article className="mkt-why-card">
                            <h3>How it connects</h3>
                            <p>{story.connects}</p>
                        </article>
                        <article className="mkt-why-card">
                            <h3>What the customer gets</h3>
                            <p>{story.outcome}</p>
                        </article>
                    </div>
                    <div className="mkt-hero-actions">
                        <Link className="mkt-btn mkt-btn-gold" to="/request-demo">Request a Demo</Link>
                        <Link className="mkt-btn mkt-btn-ghost" to="/connected-platform">See the connected platform</Link>
                    </div>
                </div>
            </section>
        </MarketingLayout>
    );
}
