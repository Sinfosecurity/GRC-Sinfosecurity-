import { Link, useLocation } from 'react-router-dom';
import MarketingLayout from '../marketing/MarketingLayout';
import { productBySlug, availabilityLabel } from '../marketing/catalog';

const PAGES: Record<string, { title: string; lede: string; status: string }> = {
    '/solutions': {
        title: 'Solutions',
        lede: 'Supreme is sold as one governance platform. Solution narratives for industry programs will be published here.',
        status: 'Coming soon',
    },
    '/frameworks': {
        title: 'Framework architecture',
        lede: 'Supreme can represent NIST, ISO 27001, SOC 2, CIS, CMMC, HIPAA, and PCI DSS as text-labelled control families. Official logos and certification marks are not used, and certification is not implied.',
        status: 'Available as labels',
    },
    '/resources': {
        title: 'Resources',
        lede: 'Guides and briefings will be published here. The live product tour is available now.',
        status: 'Coming soon',
    },
    '/company': {
        title: 'Company',
        lede: 'Company background will be published here. For now, request a conversation with the team.',
        status: 'Coming soon',
    },
    '/privacy': {
        title: 'Privacy',
        lede: 'The public privacy notice is being prepared. Product privacy capabilities live on the Trust page.',
        status: 'Coming soon',
    },
    '/terms': {
        title: 'Terms',
        lede: 'Commercial terms are provided during contracting. A public terms page will be published here.',
        status: 'Coming soon',
    },
    '/security': {
        title: 'Security',
        lede: 'Product security capabilities are documented on Trust & Security. A dedicated security whitepaper will follow.',
        status: 'See Trust & Security',
    },
    '/subprocessors': {
        title: 'Subprocessors',
        lede: 'A public subprocessors list will be published when production hosting is contracted. No invented vendor list is shown here.',
        status: 'Coming soon',
    },
    '/status': {
        title: 'Status',
        lede: 'A public status page will be published with the production environment. Local preview and staging banners are not a status page.',
        status: 'Coming soon',
    },
};

export default function MarketingPlaceholder() {
    const location = useLocation();
    const product = location.pathname.startsWith('/products/')
        ? productBySlug(location.pathname.replace('/products/', ''))
        : undefined;
    const page = product
        ? {
            title: product.name,
            lede: product.summary,
            status: availabilityLabel(product.status) || 'Private beta',
        }
        : PAGES[location.pathname] || {
            title: 'Supreme',
            lede: 'This page is reserved so navigation never 404s.',
            status: 'Coming soon',
        };

    return (
        <MarketingLayout>
            <section className="mkt-page">
                <div className="mkt-shell">
                    <p className="mkt-kicker">{page.status}</p>
                    <h1 className="mkt-display">{page.title}</h1>
                    <p className="mkt-lede">{page.lede}</p>
                    {product && (
                        <div className="mkt-chip-row">
                            {product.points.map((point) => (
                                <span key={point} className="mkt-chip">{point}</span>
                            ))}
                        </div>
                    )}
                    <div className="mkt-hero-actions">
                        <Link className="mkt-btn mkt-btn-gold" to="/request-demo">Request a Demo</Link>
                        <Link className="mkt-btn mkt-btn-ghost" to="/demo">See the product tour</Link>
                    </div>
                </div>
            </section>
        </MarketingLayout>
    );
}
