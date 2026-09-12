import { Link } from 'react-router-dom';
import MarketingLayout from '../marketing/MarketingLayout';

const CAPABILITIES = [
    { title: 'Tenant isolation', body: 'Organization data stays scoped to the tenant that owns it.' },
    { title: 'Role-based access', body: 'Privileged actions require an authorized role.' },
    { title: 'Audit logging', body: 'Significant actions are recorded for later review.' },
    { title: 'Encryption architecture', body: 'Secrets and stored objects use the platform encryption path.' },
    { title: 'Evidence integrity', body: 'Uploads are checksummed and tenant-prefixed.' },
    { title: 'Immutable decision history', body: 'A recorded decision keeps its score snapshot.' },
    { title: 'Fail-closed evidence policy', body: 'Download is blocked until a scan is CLEAN.' },
];

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
                        {CAPABILITIES.map((item) => (
                            <article key={item.title} className="mkt-why-card">
                                <h2>{item.title}</h2>
                                <p>{item.body}</p>
                            </article>
                        ))}
                    </div>
                    <div className="mkt-hero-actions">
                        <Link className="mkt-btn mkt-btn-gold" to="/request-demo">Request a Demo</Link>
                        <Link className="mkt-btn mkt-btn-ghost" to="/security">Security overview</Link>
                    </div>
                </div>
            </section>
        </MarketingLayout>
    );
}
