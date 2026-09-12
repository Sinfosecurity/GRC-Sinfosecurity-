import { useEffect, useId, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { FOOTER_GROUPS, PRODUCTS, availabilityLabel } from './catalog';
import './marketing.css';

type MarketingLayoutProps = {
    children: React.ReactNode;
};

const PRIMARY_LINKS = [
    { label: 'Platform', href: '/#platform' },
    { label: 'Solutions', href: '/solutions' },
    { label: 'Frameworks', href: '/frameworks' },
    { label: 'Resources', href: '/resources' },
    { label: 'Trust', href: '/trust' },
    { label: 'Pricing', href: '/pricing' },
];

export default function MarketingLayout({ children }: MarketingLayoutProps) {
    const { isAuthenticated } = useAuth();
    const location = useLocation();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [productsOpen, setProductsOpen] = useState(false);
    const menuId = useId();

    useEffect(() => {
        setMobileOpen(false);
        setProductsOpen(false);
        if (location.hash) {
            const target = document.getElementById(location.hash.slice(1));
            target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
            window.scrollTo({ top: 0, behavior: 'auto' });
        }
    }, [location.pathname, location.hash]);

    return (
        <div className="supreme-marketing">
            <a className="mkt-skip" href="#main">Skip to content</a>
            <header className="mkt-header">
                <div className="mkt-shell mkt-header-row">
                    <Link to="/" className="mkt-brand" aria-label="Supreme home">
                        <span className="mkt-brand-mark">Supreme</span>
                        <span className="mkt-brand-rule" aria-hidden="true" />
                    </Link>
                    <nav className="mkt-nav" aria-label="Primary">
                        <Link className="mkt-nav-link" to="/#platform">Platform</Link>
                        <div className={`mkt-menu${productsOpen ? ' open' : ''}`}>
                            <button
                                type="button"
                                className="mkt-nav-trigger"
                                aria-expanded={productsOpen}
                                aria-controls={menuId}
                                onClick={() => setProductsOpen((open) => !open)}
                            >
                                Products
                            </button>
                            <div id={menuId} className="mkt-dropdown" role="menu">
                                {PRODUCTS.map((product) => {
                                    const badge = availabilityLabel(product.status);
                                    return (
                                        <Link key={product.slug} className="mkt-drop-item" to={product.href} role="menuitem">
                                            <span>
                                                {product.name}
                                                <small>{product.subtitle}</small>
                                            </span>
                                            {badge && <span className="mkt-pill">{badge}</span>}
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                        {PRIMARY_LINKS.slice(1).map((link) => (
                            <NavLink key={link.href} className="mkt-nav-link" to={link.href}>
                                {link.label}
                            </NavLink>
                        ))}
                    </nav>
                    <div className="mkt-nav-actions">
                        {isAuthenticated ? (
                            <Link className="mkt-btn mkt-btn-text" to="/dashboard">Launch Dashboard</Link>
                        ) : (
                            <Link className="mkt-btn mkt-btn-text" to="/login">Sign In</Link>
                        )}
                        <Link className="mkt-btn mkt-btn-gold" to="/request-demo">Request Demo</Link>
                        <button
                            type="button"
                            className="mkt-burger"
                            aria-expanded={mobileOpen}
                            aria-controls="mobile-nav"
                            onClick={() => setMobileOpen((open) => !open)}
                        >
                            Menu
                        </button>
                    </div>
                </div>
                <div id="mobile-nav" className={`mkt-shell mkt-mobile${mobileOpen ? ' open' : ''}`}>
                    <Link to="/#platform">Platform</Link>
                    {PRODUCTS.map((product) => (
                        <Link key={product.slug} to={product.href}>
                            {product.name}
                            {availabilityLabel(product.status) ? ` · ${availabilityLabel(product.status)}` : ''}
                        </Link>
                    ))}
                    {PRIMARY_LINKS.slice(1).map((link) => (
                        <Link key={link.href} to={link.href}>{link.label}</Link>
                    ))}
                    <Link to="/demo">View Demo</Link>
                    {isAuthenticated ? <Link to="/dashboard">Launch Dashboard</Link> : <Link to="/login">Sign In</Link>}
                    <Link className="mkt-btn mkt-btn-gold" to="/request-demo">Request Demo</Link>
                </div>
            </header>
            <main id="main">{children}</main>
            <footer className="mkt-footer">
                <div className="mkt-shell">
                    <div className="mkt-footer-grid">
                        {FOOTER_GROUPS.map((group) => (
                            <section key={group.title} aria-labelledby={`footer-${group.title}`}>
                                <h2 id={`footer-${group.title}`}>{group.title}</h2>
                                {group.links.map((link) => (
                                    <Link key={`${group.title}-${link.label}`} to={link.href}>{link.label}</Link>
                                ))}
                            </section>
                        ))}
                    </div>
                    <div className="mkt-legal">
                        <span>Supreme Governance Platform</span>
                        <Link to="/privacy">Privacy</Link>
                        <Link to="/terms">Terms</Link>
                        <Link to="/security">Security</Link>
                        <Link to="/subprocessors">Subprocessors</Link>
                        <Link to="/status">Status</Link>
                    </div>
                </div>
            </footer>
        </div>
    );
}
