import { Link } from 'react-router-dom';
import MarketingLayout from '../marketing/MarketingLayout';

export default function PublicStatus() {
    return (
        <MarketingLayout>
            <section className="mkt-page">
                <div className="mkt-shell">
                    <p className="mkt-kicker">Status</p>
                    <h1 className="mkt-display">Public status reporting is not configured.</h1>
                    <p className="mkt-lede">
                        No external status provider is connected. Supreme does not display fabricated
                        uptime, incident history, or an SLA meter on this page.
                    </p>
                    <p className="mkt-status" role="status">
                        Provider state: <strong>NOT_CONFIGURED</strong>
                    </p>
                    <div className="mkt-hero-actions">
                        <Link className="mkt-btn mkt-btn-gold" to="/request-demo">Request a Demo</Link>
                        <Link className="mkt-btn mkt-btn-ghost" to="/trust">Trust &amp; Security</Link>
                    </div>
                </div>
            </section>
        </MarketingLayout>
    );
}
