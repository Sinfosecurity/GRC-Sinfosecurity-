import { useState } from 'react';
import { Link } from 'react-router-dom';
import MarketingLayout from '../marketing/MarketingLayout';
import {
    ANNUAL_SAVINGS_COPY,
    BillingInterval,
    COMMERCIAL_PRICING_TIERS,
    COMPARISON_ROWS,
    CommercialTier,
    PRICING_FAQS,
    comparisonLabel,
    formatUsd,
} from '../marketing/pricingCatalog';

function priceBlock(tier: CommercialTier, interval: BillingInterval) {
    if (tier.custom) {
        return {
            amount: 'Custom pricing',
            period: 'Starting from $59,000/year',
            note: null as string | null,
        };
    }
    if (interval === 'annual') {
        return {
            amount: `${formatUsd(tier.annual!)}/year`,
            period: 'Billed annually',
            note: `About ${formatUsd(tier.annualMonthlyEquivalent!)}/month, billed annually`,
        };
    }
    return {
        amount: `${formatUsd(tier.monthly!)}/month`,
        period: 'Billed monthly',
        note: null,
    };
}

export default function Pricing() {
    const [interval, setInterval] = useState<BillingInterval>('annual');

    return (
        <MarketingLayout>
            <section className="mkt-page">
                <div className="mkt-shell">
                    <p className="mkt-kicker">Pricing</p>
                    <h1 className="mkt-display">Straightforward pricing for serious governance.</h1>
                    <p className="mkt-lede">
                        Start with third-party risk management and scale as your governance program grows.
                        Choose the plan that fits your organization today.
                    </p>

                    <div className="mkt-billing-bar">
                        <div className="mkt-billing-toggle" role="group" aria-label="Billing period">
                            <button
                                type="button"
                                className={interval === 'monthly' ? 'is-active' : undefined}
                                aria-pressed={interval === 'monthly'}
                                onClick={() => setInterval('monthly')}
                            >
                                Monthly
                            </button>
                            <button
                                type="button"
                                className={interval === 'annual' ? 'is-active' : undefined}
                                aria-pressed={interval === 'annual'}
                                onClick={() => setInterval('annual')}
                            >
                                Annual
                            </button>
                        </div>
                        <p className="mkt-billing-save">{ANNUAL_SAVINGS_COPY}</p>
                    </div>

                    <div className="mkt-price-grid">
                        {COMMERCIAL_PRICING_TIERS.map((tier) => {
                            const price = priceBlock(tier, interval);
                            return (
                                <article
                                    key={tier.id}
                                    className={`mkt-price-card${tier.popular ? ' is-popular' : ''}`}
                                    aria-labelledby={`plan-${tier.id}`}
                                >
                                    {tier.popular && <p className="mkt-popular">Most Popular</p>}
                                    <p className="mkt-kicker">{tier.name}</p>
                                    <h2 className="mkt-price-name" id={`plan-${tier.id}`}>{tier.name}</h2>
                                    <p className="mkt-price-amount">{price.amount}</p>
                                    <p className="mkt-price-period">{price.period}</p>
                                    {price.note && <p className="mkt-price-note">{price.note}</p>}
                                    <p className="mkt-price-audience">{tier.audience}</p>
                                    <div className="mkt-price-actions">
                                        <Link className="mkt-btn mkt-btn-gold" to={tier.primaryCta.href}>
                                            {tier.primaryCta.label}
                                        </Link>
                                        {tier.secondaryCta && (
                                            <Link className="mkt-btn mkt-btn-ghost" to={tier.secondaryCta.href}>
                                                {tier.secondaryCta.label}
                                            </Link>
                                        )}
                                    </div>
                                    <ul>
                                        {tier.capabilities.map((item) => (
                                            <li key={item}>{item}</li>
                                        ))}
                                    </ul>
                                </article>
                            );
                        })}
                    </div>

                    <section className="mkt-compare" aria-labelledby="compare-heading">
                        <h2 className="mkt-display" id="compare-heading">Compare capabilities</h2>
                        <p className="mkt-lede">
                            Marks reflect what Supreme currently operates. Coming Soon is not sold as live.
                        </p>
                        <div className="mkt-compare-wrap">
                            <table className="mkt-compare-table">
                                <caption className="mkt-sr-only">Plan capability comparison</caption>
                                <thead>
                                    <tr>
                                        <th scope="col">Capability</th>
                                        <th scope="col">Starter</th>
                                        <th scope="col">Professional</th>
                                        <th scope="col">Business</th>
                                        <th scope="col">Enterprise</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {COMPARISON_ROWS.map((row) => (
                                        <tr key={row.feature}>
                                            <th scope="row">{row.feature}</th>
                                            <td>{comparisonLabel(row.starter)}</td>
                                            <td>{comparisonLabel(row.professional)}</td>
                                            <td>{comparisonLabel(row.business)}</td>
                                            <td>{comparisonLabel(row.enterprise)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="mkt-compare-stack">
                            {COMPARISON_ROWS.map((row) => (
                                <article key={row.feature} className="mkt-compare-card">
                                    <h3>{row.feature}</h3>
                                    <dl>
                                        <div><dt>Starter</dt><dd>{comparisonLabel(row.starter)}</dd></div>
                                        <div><dt>Professional</dt><dd>{comparisonLabel(row.professional)}</dd></div>
                                        <div><dt>Business</dt><dd>{comparisonLabel(row.business)}</dd></div>
                                        <div><dt>Enterprise</dt><dd>{comparisonLabel(row.enterprise)}</dd></div>
                                    </dl>
                                </article>
                            ))}
                        </div>
                    </section>

                    <section className="mkt-faq" aria-labelledby="faq-heading">
                        <h2 className="mkt-display" id="faq-heading">Pricing questions</h2>
                        {PRICING_FAQS.map((item) => (
                            <article key={item.question}>
                                <h3>{item.question}</h3>
                                <p>{item.answer}</p>
                            </article>
                        ))}
                    </section>
                </div>
            </section>
        </MarketingLayout>
    );
}
