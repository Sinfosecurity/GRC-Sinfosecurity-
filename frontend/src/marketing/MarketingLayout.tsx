import { useEffect, useId, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { FOOTER_GROUPS, PRODUCTS, availabilityLabel } from './catalog';
import PageMeta from './PageMeta';
import './marketing.css';

type MarketingLayoutProps = {
    children: React.ReactNode;
};

const DESKTOP_LINKS = [
    { label: 'Platform', href: '/#platform' },
    { label: 'Frameworks', href: '/frameworks' },
    { label: 'Trust', href: '/trust' },
    { label: 'Pricing', href: '/pricing' },
];

const MOBILE_GROUPS = [
    {
        title: 'Platform',
        links: [{ label: 'Connected platform', href: '/#platform' }],
    },
    {
        title: 'Products',
        links: PRODUCTS.map((product) => ({
            label: availabilityLabel(product.status)
                ? `${product.name} · ${availabilityLabel(product.status)}`
                : product.name,
            href: product.href,
        })),
    },
    {
        title: 'Solutions',
        links: [{ label: 'Framework architecture', href: '/frameworks' }],
    },
    {
        title: 'Resources',
        links: [{ label: 'See the product tour', href: '/demo' }],
    },
    {
        title: 'Trust',
        links: [
            { label: 'Trust & Security', href: '/trust' },
            { label: 'Pricing', href: '/pricing' },
        ],
    },
    {
        title: 'Company',
        links: [{ label: 'Request a Demo', href: '/request-demo' }],
    },
];

export default function MarketingLayout({ children }: MarketingLayoutProps) {
    const { isAuthenticated } = useAuth();
    const location = useLocation();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [productsOpen, setProductsOpen] = useState(false);
    const menuId = useId();
    const productsButtonRef = useRef<HTMLButtonElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);

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

    useEffect(() => {
        if (!productsOpen) return undefined;
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setProductsOpen(false);
                productsButtonRef.current?.focus();
            }
        };
        const onPointer = (event: MouseEvent) => {
            const target = event.target as Node;
            if (!menuRef.current?.contains(target) && !productsButtonRef.current?.contains(target)) {
                setProductsOpen(false);
            }
        };
        document.addEventListener('keydown', onKey);
        document.addEventListener('mousedown', onPointer);
        return () => {
            document.removeEventListener('keydown', onKey);
            document.removeEventListener('mousedown', onPointer);
        };
    }, [productsOpen]);

    return (
        <div className="supreme-marketing">
            <PageMeta />
            <a className="mkt-skip" href="#main">Skip to content</a>
            <header className="mkt-header">
                <div className="mkt-shell mkt-header-row">
                    <Link to="/" className="mkt-brand" aria-label="Supreme home">
                        <span className="mkt-brand-mark">Supreme</span>
                        <span className="mkt-brand-rule" aria-hidden="true" />
                    </Link>
                    <nav className="mkt-nav" aria-label="Primary">
                        <Link className="mkt-nav-link" to="/#platform">Platform</Link>
                        <div className={`mkt-menu${productsOpen ? ' open' : ''}`} ref={menuRef}>
                            <button
                                ref={productsButtonRef}
                                type="button"
                                className="mkt-nav-trigger"
                                aria-expanded={productsOpen}
                                aria-haspopup="true"
                                aria-controls={menuId}
                                onClick={() => setProductsOpen((open) => !open)}
                            >
                                Products
                            </button>
                            <div id={menuId} className="mkt-dropdown" role="menu" hidden={!productsOpen}>
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
                        {DESKTOP_LINKS.slice(1).map((link) => (
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
                        <Link className="mkt-btn mkt-btn-gold" to="/request-demo">Request a Demo</Link>
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
                <div id="mobile-nav" className={`mkt-shell mkt-mobile${mobileOpen ? ' open' : ''}`} hidden={!mobileOpen}>
                    {MOBILE_GROUPS.map((group) => (
                        <div key={group.title} className="mkt-mobile-group">
                            <h2>{group.title}</h2>
                            {group.links.map((link) => (
                                <Link key={`${group.title}-${link.href}-${link.label}`} to={link.href}>
                                    {link.label}
                                </Link>
                            ))}
                        </div>
                    ))}
                    {isAuthenticated ? <Link to="/dashboard">Launch Dashboard</Link> : <Link to="/login">Sign In</Link>}
                    <Link className="mkt-btn mkt-btn-gold" to="/request-demo">Request a Demo</Link>
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
                    </div>
                </div>
            </footer>
        </div>
    );
}
