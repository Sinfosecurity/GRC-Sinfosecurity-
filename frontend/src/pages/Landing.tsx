import { Link } from 'react-router-dom';
import MarketingLayout from '../marketing/MarketingLayout';
import {
    FRAMEWORKS,
    GRAPH_NODES,
    PLATFORM_FOUNDATION,
    PRODUCTS,
    TRUST_CAPABILITIES,
    availabilityLabel,
} from '../marketing/catalog';
import CommandCenter from '../marketing/visuals/CommandCenter';
import DecisionBriefCard from '../marketing/visuals/DecisionBriefCard';
import ExplainableScore from '../marketing/visuals/ExplainableScore';
import GovernanceGraph from '../marketing/visuals/GovernanceGraph';
import ReportPreviews from '../marketing/visuals/ReportPreviews';

const OPERATIONAL = PRODUCTS.filter((product) => product.status === 'available');
const ROADMAP = PRODUCTS.filter((product) => product.status === 'roadmap');

export default function Landing() {
    return (
        <MarketingLayout>
            <section className="mkt-hero">
                <div className="mkt-shell mkt-hero-grid">
                    <div>
                        <p className="mkt-kicker">Supreme Governance Platform</p>
                        <h1 className="mkt-display">
                            See what changed. Know what it affects. Act on what needs attention.
                        </h1>
                        <p className="mkt-lede">
                            Supreme connects third parties, risk, controls, evidence, frameworks,
                            privacy, and AI so the right people see the decision that is required.
                            Supreme does the administration. Humans make the decisions.
                        </p>
                        <div className="mkt-hero-actions">
                            <Link className="mkt-btn mkt-btn-gold" to="/request-demo">Request a Demo</Link>
                            <Link className="mkt-btn mkt-btn-ghost" to="/demo">See the product tour</Link>
                            <Link className="mkt-btn mkt-btn-text" to="/login">Sign In</Link>
                        </div>
                    </div>
                    <CommandCenter />
                </div>
            </section>

            <section id="who" className="mkt-section">
                <div className="mkt-shell">
                    <p className="mkt-kicker">Who it is for</p>
                    <h2 className="mkt-display">Risk, compliance, privacy, and AI leaders who share one operating picture.</h2>
                    <p className="mkt-lede">
                        Supreme is for organizations that already have third parties, residual risk,
                        frameworks, personal data, and AI in production — and need one place to see
                        what changed, what it affects, and who must decide. It is not only a vendor
                        questionnaire product.
                    </p>
                </div>
            </section>

            <section id="platform" className="mkt-section">
                <div className="mkt-shell">
                    <p className="mkt-kicker">One platform</p>
                    <h2 className="mkt-display">A change in one place should be visible everywhere it matters.</h2>
                    <p className="mkt-lede">
                        A third party, risk, control, privacy issue, or AI system changes.
                        Supreme records what happened, shows what it affects, and asks a person
                        for the decision. Evidence is captured once and reused.
                    </p>
                    <p className="mkt-lede">
                        Third Party, Risk, Compliance, Privacy, and AI Governance are in private
                        testing on the same graph. Intelligence and Automation remain on the roadmap
                        and are not sold as live products.
                    </p>
                    <div className="mkt-platform">
                        <div className="mkt-platform-top">
                            {OPERATIONAL.map((product) => (
                                <Link key={product.slug} className={`mkt-product-card${product.slug === 'third-party' ? ' mkt-product-flagship' : ''}`} to={product.href}>
                                    <span className="mkt-pill">{availabilityLabel(product.status)}</span>
                                    <h3>{product.name}</h3>
                                    <p>{product.subtitle}</p>
                                    <p className="mkt-note">{product.purpose}</p>
                                </Link>
                            ))}
                        </div>
                        <div className="mkt-platform-roadmap" aria-label="Connected roadmap">
                            {ROADMAP.map((product) => (
                                <Link key={product.slug} className="mkt-product-card" to={product.href}>
                                    <span className="mkt-pill">Roadmap</span>
                                    <h3>{product.name}</h3>
                                    <p className="mkt-note">{product.purpose}</p>
                                </Link>
                            ))}
                        </div>
                        <div className="mkt-foundation">
                            <p className="mkt-kicker">One shared governance foundation</p>
                            <p className="mkt-foundation-line">Evidence once. Govern everywhere.</p>
                            <ul className="mkt-foundation-rail">
                                {PLATFORM_FOUNDATION.map((item) => (
                                    <li key={item}>{item}</li>
                                ))}
                            </ul>
                        </div>
                        <div className="mkt-hero-actions">
                            <Link className="mkt-btn mkt-btn-ghost" to="/connected-platform">Why Supreme is one platform</Link>
                            <Link className="mkt-btn mkt-btn-text" to="/products/third-party">Explore Supreme Third Party</Link>
                        </div>
                    </div>
                </div>
            </section>

            <section id="how" className="mkt-section">
                <div className="mkt-shell mkt-split">
                    <div className="mkt-copy">
                        <p className="mkt-kicker">How Supreme works</p>
                        <h2 className="mkt-display">Prepare the record. Ask for the decision.</h2>
                        <p className="mkt-lede">
                            Intake, scoring, evidence, findings, and monitoring are administration.
                            Approve, accept residual risk, or reject is a human act. The score that
                            was seen stays on the brief.
                        </p>
                        <div className="mkt-hero-actions">
                            <Link className="mkt-btn mkt-btn-gold" to="/request-demo">Request a Demo</Link>
                            <Link className="mkt-btn mkt-btn-ghost" to="/demo">See the product tour</Link>
                        </div>
                    </div>
                    <ExplainableScore />
                </div>
            </section>

            <section id="decisions" className="mkt-section">
                <div className="mkt-shell mkt-split reverse">
                    <div className="mkt-copy">
                        <p className="mkt-kicker">Human authority</p>
                        <h2 className="mkt-display">A recorded human decision, with the score that was seen.</h2>
                        <p className="mkt-lede">
                            Residual risk is calculated from contributing factors. A person then
                            approves, rejects, or accepts that residual. Acceptance does not reduce
                            the score. Automation does not own the number.
                        </p>
                    </div>
                    <DecisionBriefCard />
                </div>
            </section>

            <section id="graph" className="mkt-section">
                <div className="mkt-shell">
                    <p className="mkt-kicker">Connected impact</p>
                    <h2 className="mkt-display">Vendor to risk to control to evidence to decision.</h2>
                    <p className="mkt-lede">
                        Identity, evidence, controls, risks, decisions, and audit sit on one graph.
                        Framework names such as NIST or SOC 2 are labels on that work, not a
                        claim that Supreme certifies the customer.
                    </p>
                    <div className="mkt-chip-row">
                        {GRAPH_NODES.map((node) => (
                            <span key={node} className="mkt-chip">{node}</span>
                        ))}
                    </div>
                    <div className="mkt-chip-row" aria-label="Framework labels">
                        {FRAMEWORKS.map((name) => (
                            <span key={name} className="mkt-chip">{name}</span>
                        ))}
                    </div>
                    <GovernanceGraph />
                </div>
            </section>

            <section id="reports" className="mkt-section">
                <div className="mkt-shell">
                    <p className="mkt-kicker">Executive reporting</p>
                    <h2 className="mkt-display">The report pack is generated from the tenant’s own records.</h2>
                    <p className="mkt-lede">
                        Executive, scorecard, assessment, findings, monitoring, and board files
                        download from live workspace data. There are no invented customers,
                        testimonials, or usage counts on this page.
                    </p>
                    <ReportPreviews />
                </div>
            </section>

            <section id="trust" className="mkt-section">
                <div className="mkt-shell">
                    <p className="mkt-kicker">Trust</p>
                    <h2 className="mkt-display">Isolation, roles, audit, and fail-closed evidence.</h2>
                    <p className="mkt-lede">
                        These are product capabilities. They are not certifications, an SLA, or a customer count.
                    </p>
                    <div className="mkt-chip-row">
                        {TRUST_CAPABILITIES.map((item) => (
                            <span key={item} className="mkt-chip">{item}</span>
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
