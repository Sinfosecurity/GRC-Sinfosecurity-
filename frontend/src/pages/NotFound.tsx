import { Link } from 'react-router-dom';
import MarketingLayout from '../marketing/MarketingLayout';

export default function NotFound() {
    return (
        <MarketingLayout>
            <section className="mkt-page">
                <div className="mkt-shell">
                    <p className="mkt-kicker">404</p>
                    <h1 className="mkt-display">Page not found</h1>
                    <p className="mkt-lede">
                        This address is not a Supreme page. Return to the platform or take the labelled product tour.
                    </p>
                    <div className="mkt-hero-actions">
                        <Link className="mkt-btn mkt-btn-gold" to="/">Back to homepage</Link>
                        <Link className="mkt-btn mkt-btn-ghost" to="/demo">See the product tour</Link>
                    </div>
                </div>
            </section>
        </MarketingLayout>
    );
}
