import { Link } from 'react-router-dom';
import MarketingLayout from '../marketing/MarketingLayout';
import { PRICING_TIERS } from '../marketing/catalog';

export default function Pricing() {
    return (
        <MarketingLayout>
            <section className="mkt-page">
                <div className="mkt-shell">
                    <p className="mkt-kicker">Pricing</p>
                    <h1 className="mkt-display">Plans for growing teams and enterprise organizations.</h1>
                    <p className="mkt-lede">
                        Commercial prices are not published here. Each plan describes capability
                        categories. Contact sales for a quote.
                    </p>
                    <div className="mkt-price-grid">
                        {PRICING_TIERS.map((tier) => (
                            <article key={tier.name} className="mkt-price-card">
                                <p className="mkt-kicker">{tier.name}</p>
                                <h2 className="mkt-display">{tier.name}</h2>
                                <p>{tier.audience}</p>
                                <ul>
                                    {tier.capabilities.map((item) => (
                                        <li key={item}>{item}</li>
                                    ))}
                                </ul>
                                <Link
                                    className="mkt-btn mkt-btn-gold"
                                    to={`/request-demo?intent=pricing&plan=${encodeURIComponent(tier.name)}`}
                                >
                                    Contact Sales
                                </Link>
                            </article>
                        ))}
                    </div>
                </div>
            </section>
        </MarketingLayout>
    );
}
