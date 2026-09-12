import { KeyboardEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import MarketingLayout from '../marketing/MarketingLayout';
import CommandCenter from '../marketing/visuals/CommandCenter';
import DecisionBriefCard from '../marketing/visuals/DecisionBriefCard';
import ExplainableScore from '../marketing/visuals/ExplainableScore';
import ReportPreviews from '../marketing/visuals/ReportPreviews';

const SECTIONS = [
    {
        title: 'Dashboard',
        body: 'Attention queue for vendors that need assessment, evidence, or a recorded decision.',
        sample: '3 vendors need review in this demo workspace.',
        visual: 'command' as const,
    },
    {
        title: 'Third Parties',
        body: 'Tenant-scoped third-party inventory with inherent and residual risk.',
        sample: 'Northwind Cloud — residual 49, band MEDIUM.',
        visual: 'vendors' as const,
    },
    {
        title: 'Explainable Risk',
        body: 'Scores show contributing factors. AI does not own the residual number.',
        sample: 'Criticality +20, sensitive data +18, methodology supreme-risk-1.1.0.',
        visual: 'score' as const,
    },
    {
        title: 'Assessments',
        body: 'Questionnaire responses are saved to the database and can complete a due-diligence cycle.',
        sample: 'INITIAL_DUE_DILIGENCE — COMPLETED.',
        visual: 'list' as const,
    },
    {
        title: 'Evidence',
        body: 'Uploads are checksummed, tenant-prefixed, and blocked from download until a scan is CLEAN.',
        sample: 'soc2-summary.pdf — scan NOT_CONFIGURED — download blocked.',
        visual: 'list' as const,
    },
    {
        title: 'Findings',
        body: 'Issues carry a corrective action plan, validation, and close workflow.',
        sample: 'Missing encryption evidence — CAP recorded — CLOSED.',
        visual: 'list' as const,
    },
    {
        title: 'Decision Briefs',
        body: 'A human records APPROVE, REJECT, or RISK_ACCEPTED. The score snapshot does not change.',
        sample: 'Decision APPROVE WITH CONDITIONS. Residual snapshot 49 unchanged.',
        visual: 'brief' as const,
    },
    {
        title: 'Reports',
        body: 'Executive, scorecard, assessment, findings, monitoring, and board exports download from live tenant data.',
        sample: 'PDF / CSV / XLSX / PPTX generated from this organization only.',
        visual: 'reports' as const,
    },
];

function tabId(title: string) {
    return `tour-tab-${title.toLowerCase().replace(/\s+/g, '-')}`;
}

function panelId(title: string) {
    return `tour-panel-${title.toLowerCase().replace(/\s+/g, '-')}`;
}

export default function ProductDemo() {
    const [activeIndex, setActiveIndex] = useState(0);
    const section = SECTIONS[activeIndex];

    const select = (index: number) => {
        const next = (index + SECTIONS.length) % SECTIONS.length;
        setActiveIndex(next);
        document.getElementById(tabId(SECTIONS[next].title))?.focus();
    };

    const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        if (event.key === 'ArrowRight') {
            event.preventDefault();
            select(activeIndex + 1);
        } else if (event.key === 'ArrowLeft') {
            event.preventDefault();
            select(activeIndex - 1);
        } else if (event.key === 'Home') {
            event.preventDefault();
            select(0);
        } else if (event.key === 'End') {
            event.preventDefault();
            select(SECTIONS.length - 1);
        }
    };

    return (
        <MarketingLayout>
            <section className="mkt-page">
                <div className="mkt-shell">
                    <p className="mkt-kicker">DEMO EXPERIENCE</p>
                    <h1 className="mkt-display">Read-only walkthrough of the third-party path</h1>
                    <p className="mkt-lede">
                        This page uses labelled demo copy only. It cannot write production data, switch
                        tenants, open other organizations, or reach administration.
                    </p>
                    <div className="mkt-chip-row" style={{ marginBottom: 24 }}>
                        <span className="mkt-pill">DEMO WORKSPACE</span>
                        <span className="mkt-pill">NOT PRODUCTION DATA</span>
                    </div>
                    <div className="mkt-tour">
                        <div className="mkt-tour-nav" role="tablist" aria-label="Product tour" onKeyDown={onKeyDown}>
                            {SECTIONS.map((item, index) => (
                                <button
                                    key={item.title}
                                    id={tabId(item.title)}
                                    type="button"
                                    className="mkt-btn mkt-btn-ghost"
                                    role="tab"
                                    aria-selected={index === activeIndex}
                                    aria-controls={panelId(item.title)}
                                    tabIndex={index === activeIndex ? 0 : -1}
                                    onClick={() => setActiveIndex(index)}
                                >
                                    {item.title}
                                </button>
                            ))}
                        </div>
                        <article
                            role="tabpanel"
                            id={panelId(section.title)}
                            aria-labelledby={tabId(section.title)}
                        >
                            <h2 className="mkt-display">{section.title}</h2>
                            <p>{section.body}</p>
                            <p className="mkt-note">DEMO DATA: {section.sample}</p>
                            {section.visual === 'command' && <CommandCenter />}
                            {section.visual === 'score' && <ExplainableScore />}
                            {section.visual === 'brief' && <DecisionBriefCard />}
                            {section.visual === 'reports' && <ReportPreviews />}
                            {section.visual === 'vendors' && (
                                <div className="mkt-command">
                                    <div className="mkt-row"><strong>Northwind Cloud</strong><span>49 MEDIUM</span></div>
                                    <div className="mkt-row"><strong>Helios Payroll</strong><span>72 HIGH</span></div>
                                    <div className="mkt-row"><strong>Harbor Analytics</strong><span>38 MEDIUM</span></div>
                                </div>
                            )}
                            {section.visual === 'list' && (
                                <div className="mkt-command">
                                    <p>DEMO DATA: {section.sample}</p>
                                </div>
                            )}
                        </article>
                    </div>
                    <div className="mkt-hero-actions">
                        <Link className="mkt-btn mkt-btn-gold" to="/request-demo">Request a Demo</Link>
                        <Link className="mkt-btn mkt-btn-ghost" to="/login">Sign in to a real workspace</Link>
                    </div>
                </div>
            </section>
        </MarketingLayout>
    );
}
