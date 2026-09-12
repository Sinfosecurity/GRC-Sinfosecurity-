import { Link } from 'react-router-dom';
import MarketingLayout from '../marketing/MarketingLayout';
import { TRUST_CAPABILITIES } from '../marketing/catalog';

export default function TrustCenter() {
    return (
        <MarketingLayout>
            <section className="mkt-page">
                <div className="mkt-shell">
                    <p className="mkt-kicker">Trust &amp; Security</p>
                    <h1 className="mkt-display">Built for enterprise governance.</h1>
                    <p className="mkt-lede">
                        Supreme isolates tenants, records decisions, and fails closed when evidence
                        cannot be safely released. This page describes product capabilities. It does
                        not claim SOC 2 certification, ISO certification, an uptime SLA, or a customer count.
                    </p>
                    <div className="mkt-why-grid">
                        {TRUST_CAPABILITIES.map((item) => (
                            <article key={item} className="mkt-why-card">
                                <h2>{item}</h2>
                                <p>Implemented as platform behavior. Ask for the current control narrative in a security review.</p>
                            </article>
                        ))}
                    </div>
                    <div className="mkt-hero-actions">
                        <Link className="mkt-btn mkt-btn-gold" to="/request-demo">Request a security review</Link>
                        <Link className="mkt-btn mkt-btn-ghost" to="/security">Security page</Link>
                    </div>
                </div>
            </section>
        </MarketingLayout>
    );
}
