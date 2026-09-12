import { Link } from 'react-router-dom';
import MarketingLayout from '../marketing/MarketingLayout';
import CommandCenter from '../marketing/visuals/CommandCenter';
import DecisionBriefCard from '../marketing/visuals/DecisionBriefCard';
import ExplainableScore from '../marketing/visuals/ExplainableScore';
import ReportPreviews from '../marketing/visuals/ReportPreviews';

const CAPABILITIES = [
    {
        title: 'Vendor lifecycle',
        body: 'Create and maintain a tenant-scoped third-party inventory with owner, services, and inherent-risk intake. Tiering is recorded on the vendor, not guessed in the browser.',
    },
    {
        title: 'Assessments',
        body: 'Start a due-diligence assessment, assign an owner, capture questionnaire responses, and complete the cycle against a stored template.',
    },
    {
        title: 'Evidence collection',
        body: 'Uploads become stored objects with checksums and tenant-prefixed keys, then link to the vendor, assessment, or finding. Download stays blocked until scan status is CLEAN.',
    },
    {
        title: 'Findings and remediation',
        body: 'Record a finding, attach a corrective action plan, request validation, and close the issue. Overdue work can notify the assignee when email is configured.',
    },
    {
        title: 'Explainable residual risk',
        body: 'Recalculation writes contributing factors and a methodology version. Inherent and residual scores stay visible. A human decision does not silently rewrite the snapshot.',
    },
    {
        title: 'Decision Briefs and approvals',
        body: 'Generate a brief from the latest score, then record approve, approve with conditions, reject, escalate, or accept residual risk. Conditions stay on the brief.',
    },
    {
        title: 'Continuous monitoring workspace',
        body: 'The monitoring page shows recorded vendor signals. External rating feeds are not simulated when a provider is absent.',
    },
    {
        title: 'Reports and audit trail',
        body: 'Authorized roles can download executive, scorecard, assessment, findings, monitoring, and board exports from the same tenant. Significant actions write audit events.',
    },
];

export default function ThirdPartyProduct() {
    return (
        <MarketingLayout>
            <section className="mkt-hero">
                <div className="mkt-shell mkt-hero-grid">
                    <div>
                        <p className="mkt-kicker">Supreme Third Party · Available</p>
                        <h1 className="mkt-display">Third-party risk you can explain, evidence, and decide.</h1>
                        <p className="mkt-lede">
                            Most programs collect vendor files and still cannot show why residual risk
                            moved. Supreme Third Party keeps intake, assessment, evidence, findings,
                            score, decision, and export in one isolated workspace.
                        </p>
                        <div className="mkt-hero-actions">
                            <Link className="mkt-btn mkt-btn-gold" to="/request-demo">Request a Demo</Link>
                            <Link className="mkt-btn mkt-btn-ghost" to="/demo">See the product tour</Link>
                        </div>
                    </div>
                    <CommandCenter />
                </div>
            </section>

            <section className="mkt-section">
                <div className="mkt-shell">
                    <p className="mkt-kicker">Capabilities that exist</p>
                    <h2 className="mkt-display">The operational third-party path.</h2>
                    <div className="mkt-why-grid">
                        {CAPABILITIES.map((item) => (
                            <article key={item.title} className="mkt-why-card">
                                <h3>{item.title}</h3>
                                <p>{item.body}</p>
                            </article>
                        ))}
                    </div>
                </div>
            </section>

            <section className="mkt-section">
                <div className="mkt-shell mkt-split">
                    <div className="mkt-copy">
                        <p className="mkt-kicker">Explainable score</p>
                        <h2 className="mkt-display">Inherent intake. Residual result. Visible factors.</h2>
                        <p className="mkt-lede">
                            Criticality, data sensitivity, access, and evidence age contribute to the
                            recorded score. Compensating controls can lower it. The methodology version
                            stays with the calculation.
                        </p>
                    </div>
                    <ExplainableScore />
                </div>
            </section>

            <section className="mkt-section">
                <div className="mkt-shell mkt-split reverse">
                    <div className="mkt-copy">
                        <p className="mkt-kicker">Decision Brief</p>
                        <h2 className="mkt-display">A human records the decision that matters.</h2>
                        <p className="mkt-lede">
                            Approve, reject, or accept residual risk. Conditions remain attached.
                            The brief snapshot does not rewrite itself after the fact.
                        </p>
                    </div>
                    <DecisionBriefCard />
                </div>
            </section>

            <section className="mkt-section">
                <div className="mkt-shell">
                    <p className="mkt-kicker">Reports</p>
                    <h2 className="mkt-display">Exports from the tenant that owns the data.</h2>
                    <p className="mkt-lede">
                        Board, executive, vendor scorecard, assessment, findings, and monitoring
                        files are generated from recorded work. No invented portfolio is shown here.
                    </p>
                    <ReportPreviews />
                    <div className="mkt-hero-actions">
                        <Link className="mkt-btn mkt-btn-gold" to="/request-demo">Request a Demo</Link>
                        <Link className="mkt-btn mkt-btn-ghost" to="/demo">See the product tour</Link>
                    </div>
                </div>
            </section>
        </MarketingLayout>
    );
}
