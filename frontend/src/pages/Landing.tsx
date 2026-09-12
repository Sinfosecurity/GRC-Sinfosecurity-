import { Link } from 'react-router-dom';
import MarketingLayout from '../marketing/MarketingLayout';
import {
    DIFFERENTIATORS,
    EXECUTIVE_ROLES,
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

const ATTENTION = [
    { title: 'Critical vendor breach signal', detail: 'Residual risk 52 → 79. Review now.' },
    { title: 'SOC 2 expired', detail: 'Request current evidence before renewal.' },
    { title: 'Critical finding overdue', detail: 'Escalate the corrective action plan.' },
    { title: 'AI system approval pending', detail: 'Decision required. Roadmap capability.' },
];

export default function Landing() {
    return (
        <MarketingLayout>
            <section className="mkt-hero">
                <div className="mkt-shell mkt-hero-grid">
                    <div>
                        <p className="mkt-kicker">Supreme Governance Platform</p>
                        <h1 className="mkt-display">
                            Govern everything that can put your business at risk.
                        </h1>
                        <p className="mkt-lede">
                            One connected governance platform for third-party risk, enterprise risk,
                            compliance, privacy, AI governance, intelligence, and automation.
                        </p>
                        <div className="mkt-hero-actions">
                            <Link className="mkt-btn mkt-btn-gold" to="/request-demo">Request a Demo</Link>
                            <a className="mkt-btn mkt-btn-ghost" href="#platform">Explore the Platform</a>
                            <Link className="mkt-btn mkt-btn-text" to="/login">Sign In</Link>
                        </div>
                        <ul className="mkt-points">
                            <li>One platform, not isolated modules</li>
                            <li>Explainable, evidence-backed decisions</li>
                            <li>Evidence-driven assurance</li>
                            <li>Automation that keeps humans accountable</li>
                        </ul>
                    </div>
                    <CommandCenter />
                </div>
            </section>

            <section id="platform" className="mkt-section">
                <div className="mkt-shell">
                    <p className="mkt-kicker">Platform architecture</p>
                    <h2 className="mkt-display">One platform. Seven governance products.</h2>
                    <p className="mkt-lede">
                        Supreme Third Party is the production flagship today. The remaining products
                        connect to the same graph and are labelled by readiness.
                    </p>
                    <div className="mkt-product-grid">
                        {PRODUCTS.map((product) => {
                            const badge = availabilityLabel(product.status);
                            return (
                                <Link key={product.slug} className="mkt-product-card" to={product.href}>
                                    <span className="mkt-pill">{badge || 'Available'}</span>
                                    <h3>{product.name}</h3>
                                    <p>{product.subtitle}</p>
                                    <p className="mkt-note">{product.summary}</p>
                                </Link>
                            );
                        })}
                    </div>
                    <div className="mkt-shared">
                        <p className="mkt-kicker">Supreme Governance Graph</p>
                        <h3 className="mkt-display">Shared identity, evidence, controls, risks, decisions, audit, automation, and intelligence.</h3>
                        <div className="mkt-chip-row">
                            {GRAPH_NODES.map((node) => (
                                <span key={node} className="mkt-chip">{node}</span>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            <section id="why-supreme" className="mkt-section">
                <div className="mkt-shell">
                    <p className="mkt-kicker">Why Supreme</p>
                    <h2 className="mkt-display">Different because the work becomes a decision.</h2>
                    <div className="mkt-why-grid">
                        {DIFFERENTIATORS.map((item) => (
                            <article key={item.title} className="mkt-why-card">
                                <h3>{item.title}</h3>
                                <p>{item.body}</p>
                            </article>
                        ))}
                    </div>
                </div>
            </section>

            <section id="third-party" className="mkt-section">
                <div className="mkt-shell mkt-split">
                    <div className="mkt-copy">
                        <p className="mkt-kicker">Supreme Third Party</p>
                        <h2 className="mkt-display">The flagship path is already concrete.</h2>
                        <p className="mkt-lede">
                            Vendors, assessments, evidence, findings, explainable residual risk,
                            decision briefs, and monitoring in one tenant-isolated workspace.
                        </p>
                        <div className="mkt-chip-row">
                            {PRODUCTS[0].points.map((point) => (
                                <span key={point} className="mkt-chip">{point}</span>
                            ))}
                        </div>
                        <div className="mkt-hero-actions">
                            <Link className="mkt-btn mkt-btn-gold" to="/demo">View Demo</Link>
                            <Link className="mkt-btn mkt-btn-ghost" to="/products/third-party">Product detail</Link>
                        </div>
                    </div>
                    <ExplainableScore />
                </div>
            </section>

            <section id="risk" className="mkt-section">
                <div className="mkt-shell mkt-split reverse">
                    <div className="mkt-copy">
                        <p className="mkt-kicker">Supreme Risk · Preview</p>
                        <h2 className="mkt-display">Enterprise risk on the same graph.</h2>
                        <p className="mkt-lede">
                            Register, heatmap, appetite, and treatments are previewed as part of the
                            connected platform. They are not sold as a finished production module.
                        </p>
                    </div>
                    <div className="mkt-command">
                        <h3>Preview register</h3>
                        <div className="mkt-row"><strong>Concentration in payroll</strong><span>HIGH</span></div>
                        <div className="mkt-row"><strong>Cloud access sprawl</strong><span>MEDIUM</span></div>
                        <div className="mkt-row"><strong>Evidence aging</strong><span>MEDIUM</span></div>
                    </div>
                </div>
            </section>

            <section id="compliance" className="mkt-section">
                <div className="mkt-shell mkt-split">
                    <div className="mkt-copy">
                        <p className="mkt-kicker">Supreme Compliance · Preview</p>
                        <h2 className="mkt-display">Controls and evidence, reused.</h2>
                        <p className="mkt-lede">
                            Framework mapping and evidence reuse are part of the architecture.
                            Official certification is not implied.
                        </p>
                    </div>
                    <div className="mkt-chip-row" aria-label="Framework labels">
                        {FRAMEWORKS.map((name) => (
                            <span key={name} className="mkt-chip">{name}</span>
                        ))}
                    </div>
                </div>
            </section>

            <section id="roadmap-products" className="mkt-section">
                <div className="mkt-shell">
                    <p className="mkt-kicker">Roadmap products</p>
                    <h2 className="mkt-display">Named honestly. Not advertised as live.</h2>
                    <div className="mkt-product-grid">
                        {PRODUCTS.filter((product) => product.status === 'roadmap').map((product) => (
                            <Link key={product.slug} className="mkt-product-card" to={product.href}>
                                <span className="mkt-pill">Roadmap</span>
                                <h3>{product.name}</h3>
                                <p>{product.summary}</p>
                            </Link>
                        ))}
                    </div>
                </div>
            </section>

            <section id="attention" className="mkt-section">
                <div className="mkt-shell">
                    <p className="mkt-kicker">What needs attention</p>
                    <h2 className="mkt-display">Governance that creates a queue, not a graveyard of records.</h2>
                    <div className="mkt-attention">
                        {ATTENTION.map((item) => (
                            <article key={item.title} className="mkt-alert">
                                <strong>{item.title}</strong>
                                <p>{item.detail}</p>
                            </article>
                        ))}
                    </div>
                </div>
            </section>

            <section id="decisions" className="mkt-section">
                <div className="mkt-shell mkt-split">
                    <div className="mkt-copy">
                        <p className="mkt-kicker">Decision briefs</p>
                        <h2 className="mkt-display">Turn residual risk into an auditable decision.</h2>
                        <p className="mkt-lede">
                            A human records approve, reject, or accept residual risk. Conditions stay
                            with the brief. The score snapshot does not rewrite itself.
                        </p>
                    </div>
                    <DecisionBriefCard />
                </div>
            </section>

            <section id="reports" className="mkt-section">
                <div className="mkt-shell">
                    <p className="mkt-kicker">Reporting</p>
                    <h2 className="mkt-display">From data to board-ready decisions.</h2>
                    <p className="mkt-lede">
                        Board, executive, vendor scorecard, and decision-brief exports are generated
                        from the tenant that owns the data.
                    </p>
                    <ReportPreviews />
                </div>
            </section>

            <section id="graph" className="mkt-section">
                <div className="mkt-shell mkt-center">
                    <p className="mkt-kicker">Governance graph</p>
                    <h2 className="mkt-display">See the path from vendor to decision.</h2>
                    <p className="mkt-lede">
                        Traditional GRC keeps these objects in silos. Supreme keeps the relationship visible.
                    </p>
                    <GovernanceGraph />
                </div>
            </section>

            <section id="automation" className="mkt-section">
                <div className="mkt-shell mkt-split">
                    <div className="mkt-copy">
                        <p className="mkt-kicker">Automation · Roadmap</p>
                        <h2 className="mkt-display">When risk moves, the work should start.</h2>
                        <p className="mkt-lede">
                            Agent-style sequences are a future vision. They are not advertised as a live
                            production control plane.
                        </p>
                    </div>
                    <div className="mkt-command">
                        <p><strong>WHEN</strong> a critical vendor rating falls</p>
                        <p><strong>THEN</strong> recalculate risk</p>
                        <p>create a finding · notify the owner · launch reassessment · request approval</p>
                        <span className="mkt-pill">Roadmap</span>
                    </div>
                </div>
            </section>

            <section id="roles" className="mkt-section">
                <div className="mkt-shell">
                    <p className="mkt-kicker">Executive value</p>
                    <h2 className="mkt-display">The same graph, read by the role that owns the decision.</h2>
                    <div className="mkt-role-grid">
                        {EXECUTIVE_ROLES.map((item) => (
                            <article key={item.role} className="mkt-role-card">
                                <h3>{item.role}</h3>
                                <p>{item.value}</p>
                            </article>
                        ))}
                    </div>
                </div>
            </section>

            <section id="trust" className="mkt-section">
                <div className="mkt-shell">
                    <p className="mkt-kicker">Trust</p>
                    <h2 className="mkt-display">Built for enterprise governance.</h2>
                    <p className="mkt-lede">
                        These are product capabilities, not certifications, customer counts, or an SLA.
                    </p>
                    <div className="mkt-chip-row">
                        {TRUST_CAPABILITIES.map((item) => (
                            <span key={item} className="mkt-chip">{item}</span>
                        ))}
                    </div>
                    <div className="mkt-hero-actions">
                        <Link className="mkt-btn mkt-btn-gold" to="/trust">View Trust &amp; Security</Link>
                        <Link className="mkt-btn mkt-btn-ghost" to="/request-demo">Request a Demo</Link>
                    </div>
                </div>
            </section>
        </MarketingLayout>
    );
}
