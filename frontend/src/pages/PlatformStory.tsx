import { Link } from 'react-router-dom';
import MarketingLayout from '../marketing/MarketingLayout';
import GovernanceGraph from '../marketing/visuals/GovernanceGraph';

const CHAIN = [
    { title: 'Vendor', body: 'A third party is requested, assessed, and either approved or declined.' },
    { title: 'Risk', body: 'Inherent and residual risk stay explainable. Acceptance does not rewrite the score.' },
    { title: 'Control', body: 'The same control can serve vendor, enterprise, privacy, and AI questions.' },
    { title: 'Evidence', body: 'A file is stored once, scanned, and reused. Ready is not the same as tested.' },
    { title: 'Requirement', body: 'Framework labels sit on mapped work. Readiness is not certification.' },
    { title: 'Privacy', body: 'Processing, transfers, and rights stay connected to the vendor and the data.' },
    { title: 'AI', body: 'Systems, use, testing, and approval stay visible to the people who own them.' },
    { title: 'Decision', body: 'A person records approve, reject, or accept. The snapshot that was seen is kept.' },
];

const EVENT = [
    { title: 'What changed', body: 'A critical vendor expands AI use and starts processing personal data.' },
    { title: 'What it affects', body: 'The vendor record, privacy activity, AI system, residual risk, mapped controls, and evidence freshness.' },
    { title: 'What needs attention', body: 'Due diligence, a privacy review, an AI approval, and a human decision before the relationship stays active.' },
];

export default function PlatformStory() {
    return (
        <MarketingLayout>
            <section className="mkt-hero">
                <div className="mkt-shell">
                    <p className="mkt-kicker">Supreme Governance Platform</p>
                    <h1 className="mkt-display">One event can affect every governance area that owns it.</h1>
                    <p className="mkt-lede">
                        Supreme is one platform, not a stack of disconnected modules.
                        Vendor, risk, control, evidence, requirement, privacy, AI, and decision
                        share the same record. The work is administration. The decision stays human.
                    </p>
                    <div className="mkt-hero-actions">
                        <Link className="mkt-btn mkt-btn-gold" to="/request-demo">Request a Demo</Link>
                        <Link className="mkt-btn mkt-btn-ghost" to="/demo">See the product tour</Link>
                    </div>
                </div>
            </section>

            <section className="mkt-section">
                <div className="mkt-shell">
                    <p className="mkt-kicker">Connected path</p>
                    <h2 className="mkt-display">Vendor to risk to control to evidence to decision.</h2>
                    <div className="mkt-why-grid">
                        {CHAIN.map((item) => (
                            <article key={item.title} className="mkt-why-card">
                                <h3>{item.title}</h3>
                                <p>{item.body}</p>
                            </article>
                        ))}
                    </div>
                </div>
            </section>

            <section className="mkt-section">
                <div className="mkt-shell">
                    <p className="mkt-kicker">Example</p>
                    <h2 className="mkt-display">A vendor changes its AI and data scope.</h2>
                    <p className="mkt-lede">
                        This is the story Supreme is built to show. It does not invent live
                        intelligence feeds or automation agents that are still on the roadmap.
                    </p>
                    <div className="mkt-why-grid">
                        {EVENT.map((item) => (
                            <article key={item.title} className="mkt-why-card">
                                <h3>{item.title}</h3>
                                <p>{item.body}</p>
                            </article>
                        ))}
                    </div>
                    <GovernanceGraph />
                </div>
            </section>

            <section className="mkt-section">
                <div className="mkt-shell">
                    <p className="mkt-kicker">Evidence once</p>
                    <h2 className="mkt-display">Govern everywhere from the same object.</h2>
                    <p className="mkt-lede">
                        A SOC report, policy, or test result can support a vendor assessment,
                        a control, a framework requirement, and a risk treatment without being
                        uploaded again. Freshness and scan status stay on the object.
                    </p>
                    <div className="mkt-hero-actions">
                        <Link className="mkt-btn mkt-btn-ghost" to="/products/controls-evidence">Shared controls and evidence</Link>
                        <Link className="mkt-btn mkt-btn-text" to="/products/governance-graph">Governance Graph</Link>
                    </div>
                </div>
            </section>
        </MarketingLayout>
    );
}
