import { Link } from 'react-router-dom';
import MarketingLayout from '../marketing/MarketingLayout';

const POINTS = [
    {
        title: 'Tenant isolation',
        body: 'API queries are scoped to the authenticated organization. Cross-tenant reads return empty or not found, not another customer’s records.',
    },
    {
        title: 'Role-based access',
        body: 'Privileged actions such as invitations, exports, and decisions require a permitted role. Insufficient roles receive 403.',
    },
    {
        title: 'Evidence integrity',
        body: 'Uploads are checksummed and stored under tenant-prefixed keys. Download is blocked unless malware scan status is CLEAN.',
    },
    {
        title: 'Decision immutability',
        body: 'A recorded Decision Brief keeps its score snapshot. AI does not silently rewrite residual risk.',
    },
    {
        title: 'Audit trail',
        body: 'Significant actions write audit events for later review inside the same tenant.',
    },
    {
        title: 'What is not claimed',
        body: 'This page does not claim SOC 2, ISO 27001, an uptime SLA, or a penetration-test badge.',
    },
];

export default function SecurityOverview() {
    return (
        <MarketingLayout>
            <section className="mkt-page">
                <div className="mkt-shell">
                    <p className="mkt-kicker">Security</p>
                    <h1 className="mkt-display">Product security as it exists today.</h1>
                    <p className="mkt-lede">
                        This is a security overview of the running Supreme product. The Trust Center
                        lists the same capabilities without implying an external certification.
                    </p>
                    <div className="mkt-why-grid">
                        {POINTS.map((item) => (
                            <article key={item.title} className="mkt-why-card">
                                <h2>{item.title}</h2>
                                <p>{item.body}</p>
                            </article>
                        ))}
                    </div>
                    <div className="mkt-hero-actions">
                        <Link className="mkt-btn mkt-btn-gold" to="/trust">Open Trust &amp; Security</Link>
                        <Link className="mkt-btn mkt-btn-ghost" to="/request-demo">Request a Demo</Link>
                    </div>
                </div>
            </section>
        </MarketingLayout>
    );
}
