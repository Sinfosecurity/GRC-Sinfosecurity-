import { Link } from 'react-router-dom';
import MarketingLayout from '../marketing/MarketingLayout';
import { FRAMEWORKS } from '../marketing/catalog';

const STEPS = [
    {
        title: 'Label the control family',
        body: 'A questionnaire or control can carry a framework name such as NIST, ISO 27001, or SOC 2. The name is text. Official certification logos and marks are not used.',
    },
    {
        title: 'Collect evidence once',
        body: 'An upload is stored as a tenant-prefixed object with a checksum and linked to the vendor, assessment, or finding that owns it.',
    },
    {
        title: 'Score from recorded work',
        body: 'Residual risk is calculated from recorded factors. The methodology version stays with the score. AI does not own the number.',
    },
    {
        title: 'Decide with a snapshot',
        body: 'A Decision Brief freezes the score the human saw. Approving or accepting residual risk does not invent a certification outcome.',
    },
];

export default function Frameworks() {
    return (
        <MarketingLayout>
            <section className="mkt-page">
                <div className="mkt-shell">
                    <p className="mkt-kicker">Framework architecture</p>
                    <h1 className="mkt-display">Map work to frameworks without implying a certificate.</h1>
                    <p className="mkt-lede">
                        Supreme can represent common control families as labels on assessments,
                        evidence, and risk. Supreme does not certify customers, and using a framework
                        name is not a claim that the customer or Supreme holds that certification.
                    </p>
                    <div className="mkt-chip-row" aria-label="Framework labels">
                        {FRAMEWORKS.map((name) => (
                            <span key={name} className="mkt-chip">{name}</span>
                        ))}
                    </div>
                    <div className="mkt-why-grid" style={{ marginTop: 36 }}>
                        {STEPS.map((step) => (
                            <article key={step.title} className="mkt-why-card">
                                <h2>{step.title}</h2>
                                <p>{step.body}</p>
                            </article>
                        ))}
                    </div>
                    <div className="mkt-hero-actions">
                        <Link className="mkt-btn mkt-btn-gold" to="/request-demo">Request a Demo</Link>
                        <Link className="mkt-btn mkt-btn-ghost" to="/demo">See the product tour</Link>
                    </div>
                </div>
            </section>
        </MarketingLayout>
    );
}
