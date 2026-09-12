import { Link } from 'react-router-dom';
import MarketingLayout from '../marketing/MarketingLayout';
import {
    FRAMEWORKS,
    GRAPH_NODES,
    PRODUCTS,
    TRUST_CAPABILITIES,
    availabilityLabel,
} from '../marketing/catalog';
import CommandCenter from '../marketing/visuals/CommandCenter';
import DecisionBriefCard from '../marketing/visuals/DecisionBriefCard';
import ExplainableScore from '../marketing/visuals/ExplainableScore';
import GovernanceGraph from '../marketing/visuals/GovernanceGraph';
import ReportPreviews from '../marketing/visuals/ReportPreviews';

const FLAGSHIP = PRODUCTS[0];
const CONNECTED = PRODUCTS.slice(1);

export default function Landing() {
    return (
        <MarketingLayout>
            <section className="mkt-hero">
                <div className="mkt-shell mkt-hero-grid">
                    <div>
                        <p className="mkt-kicker">Supreme Governance Platform</p>
                        <h1 className="mkt-display">
                            Govern the third parties that can put the business at risk.
                        </h1>
                        <p className="mkt-lede">
                            Supreme is one connected governance platform. Supreme Third Party is
                            available now. The remaining products share the same graph and are
                            labelled Preview or Roadmap until they are operational.
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

            <section id="platform" className="mkt-section">
                <div className="mkt-shell">
                    <p className="mkt-kicker">Platform</p>
                    <h2 className="mkt-display">A flagship product, then a connected platform.</h2>
                    <p className="mkt-lede">
                        Buyers start with third-party risk because that work is already live.
                        Preview and roadmap products describe the architecture, not an equal
                        set of finished modules.
                    </p>
                    <div className="mkt-product-grid mkt-connected-grid">
                        <Link className="mkt-product-card" to={FLAGSHIP.href}>
                            <span className="mkt-pill">Available</span>
                            <h3>{FLAGSHIP.name}</h3>
                            <p>{FLAGSHIP.subtitle}</p>
                            <p className="mkt-note">{FLAGSHIP.summary}</p>
                            <div className="mkt-chip-row">
                                {FLAGSHIP.points.map((point) => (
                                    <span key={point} className="mkt-chip">{point}</span>
                                ))}
                            </div>
                        </Link>
                        {CONNECTED.map((product) => {
                            const badge = availabilityLabel(product.status);
                            return (
                                <Link key={product.slug} className="mkt-product-card" to={product.href}>
                                    <span className="mkt-pill">{badge}</span>
                                    <h3>{product.name}</h3>
                                    <p>{product.subtitle}</p>
                                </Link>
                            );
                        })}
                    </div>
                </div>
            </section>

            <section id="third-party" className="mkt-section">
                <div className="mkt-shell mkt-split">
                    <div className="mkt-copy">
                        <p className="mkt-kicker">Flagship product</p>
                        <h2 className="mkt-display">Supreme Third Party is the operational path.</h2>
                        <p className="mkt-lede">
                            Vendor intake, assessments, evidence, findings, residual scoring,
                            Decision Briefs, monitoring, and tenant-scoped reports already run in
                            the product. That is the work a CISO or procurement owner can inspect today.
                        </p>
                        <div className="mkt-hero-actions">
                            <Link className="mkt-btn mkt-btn-gold" to="/request-demo">Request a Demo</Link>
                            <Link className="mkt-btn mkt-btn-ghost" to="/products/third-party">Supreme Third Party</Link>
                        </div>
                    </div>
                    <ExplainableScore />
                </div>
            </section>

            <section id="decisions" className="mkt-section">
                <div className="mkt-shell mkt-split reverse">
                    <div className="mkt-copy">
                        <p className="mkt-kicker">Decision model</p>
                        <h2 className="mkt-display">A recorded human decision, with the score that was seen.</h2>
                        <p className="mkt-lede">
                            Residual risk is calculated from contributing factors. A person then
                            approves, rejects, or accepts that residual. The brief keeps the
                            snapshot. Automation and AI do not own the number.
                        </p>
                    </div>
                    <DecisionBriefCard />
                </div>
            </section>

            <section id="graph" className="mkt-section">
                <div className="mkt-shell">
                    <p className="mkt-kicker">Governance architecture</p>
                    <h2 className="mkt-display">The same objects, reused instead of re-keyed.</h2>
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
                    <p className="mkt-kicker">Product proof</p>
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
