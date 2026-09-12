import { FormEvent, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import MarketingLayout from '../marketing/MarketingLayout';
import { ApiClientError, demoAPI, DemoRequestPayload } from '../services/api';

const EMPTY: DemoRequestPayload = {
    name: '',
    email: '',
    company: '',
    role: '',
    companySize: '',
    primaryNeed: '',
};

const RECEIVED_COPY =
    'Thank you. Your request has been received. A member of the Supreme team will review your request and contact you using the business email address you provided.';

export default function RequestDemo() {
    const [searchParams] = useSearchParams();
    const intent = searchParams.get('intent') || 'demo';
    const plan = searchParams.get('selectedPlan') || searchParams.get('plan') || '';
    const source = searchParams.get('source') || '';
    const isSales = intent === 'pricing' || intent === 'enterprise-sales';
    const [form, setForm] = useState(EMPTY);
    const [submitting, setSubmitting] = useState(false);
    const [received, setReceived] = useState(false);
    const [error, setError] = useState('');
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

    const heading = useMemo(() => {
        if (isSales && plan) return `Contact sales about the ${plan} plan.`;
        if (isSales) return 'Contact sales about a Supreme plan.';
        return 'See Supreme against the work you already do.';
    }, [isSales, plan]);

    const onChange = (field: keyof DemoRequestPayload) => (
        event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
    ) => {
        setForm((current) => ({ ...current, [field]: event.target.value }));
        setFieldErrors((current) => {
            if (!current[field]) return current;
            const next = { ...current };
            delete next[field];
            return next;
        });
    };

    const onSubmit = async (event: FormEvent) => {
        event.preventDefault();
        if (submitting || received) return;
        setSubmitting(true);
        setError('');
        setFieldErrors({});
        try {
            await demoAPI.request({
                ...form,
                intent,
                plan: plan || undefined,
                selectedPlan: plan || undefined,
                source: source || undefined,
            });
            setReceived(true);
        } catch (err: unknown) {
            const clientError = err instanceof ApiClientError ? err : null;
            if (clientError?.status === 429) {
                setError('Too many requests have been submitted. Please wait a little while and try again.');
            } else if (clientError?.status === 400 && clientError.fields?.length) {
                const next: Record<string, string> = {};
                for (const item of clientError.fields) {
                    if (item.field && item.message) next[item.field] = item.message;
                }
                setFieldErrors(next);
                setError(clientError.message);
            } else if (clientError?.status && clientError.status >= 500) {
                setError("We couldn't submit your request right now. Please try again.");
            } else {
                setError(clientError?.message || "We couldn't submit your request right now. Please try again.");
            }
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <MarketingLayout>
            <section className="mkt-page">
                <div className="mkt-shell">
                    <p className="mkt-kicker">{isSales ? 'Contact sales' : 'Request a demo'}</p>
                    <h1 className="mkt-display">{heading}</h1>
                    <p className="mkt-lede">
                        {isSales
                            ? 'This is a sales conversation about plan fit. Published prices are list prices; Enterprise remains custom.'
                            : 'Tell us who you are and what you need to govern. This is a real request path, not a decorative button.'}
                    </p>
                    {plan && !received && <p className="mkt-status" role="status">Selected plan: {plan}</p>}
                    {received ? (
                        <div className="mkt-success-panel" role="status">
                            <div className="mkt-success-icon" aria-hidden="true">✓</div>
                            <p className="mkt-kicker">Request received</p>
                            <h2 className="mkt-success-heading">Thank you. Your request has been received.</h2>
                            <p>{RECEIVED_COPY}</p>
                            <p className="mkt-note">Please keep an eye on your inbox for our response.</p>
                            <div className="mkt-success-actions">
                                <Link className="mkt-btn mkt-btn-gold" to="/">Return to home</Link>
                                <Link className="mkt-btn mkt-btn-ghost" to="/pricing">Explore Supreme</Link>
                            </div>
                        </div>
                    ) : (
                        <form className="mkt-form mkt-request-form" onSubmit={onSubmit}>
                            <input type="hidden" name="intent" value={intent} />
                            {plan && <input type="hidden" name="plan" value={plan} />}
                            {plan && <input type="hidden" name="selectedPlan" value={plan} />}
                            {source && <input type="hidden" name="source" value={source} />}
                            <div className="mkt-field">
                                <label htmlFor="demo-name">Name</label>
                                <input id="demo-name" name="name" autoComplete="name" value={form.name} onChange={onChange('name')} required />
                                {fieldErrors.name && <p className="mkt-field-error">{fieldErrors.name}</p>}
                            </div>
                            <div className="mkt-field">
                                <label htmlFor="demo-email">Business email</label>
                                <input id="demo-email" name="email" type="email" autoComplete="email" value={form.email} onChange={onChange('email')} required />
                                {fieldErrors.email && <p className="mkt-field-error">{fieldErrors.email}</p>}
                            </div>
                            <div className="mkt-field">
                                <label htmlFor="demo-company">Company</label>
                                <input id="demo-company" name="company" autoComplete="organization" value={form.company} onChange={onChange('company')} required />
                                {fieldErrors.company && <p className="mkt-field-error">{fieldErrors.company}</p>}
                            </div>
                            <div className="mkt-field">
                                <label htmlFor="demo-role">Role</label>
                                <select id="demo-role" name="role" value={form.role} onChange={onChange('role')} required>
                                    <option value="">Select a role</option>
                                    <option>CISO</option>
                                    <option>CRO</option>
                                    <option>Compliance</option>
                                    <option>Privacy</option>
                                    <option>Procurement</option>
                                    <option>Internal Audit</option>
                                    <option>Other</option>
                                </select>
                                {fieldErrors.role && <p className="mkt-field-error">{fieldErrors.role}</p>}
                            </div>
                            <div className="mkt-field">
                                <label htmlFor="demo-size">Company size</label>
                                <select id="demo-size" name="companySize" value={form.companySize} onChange={onChange('companySize')} required>
                                    <option value="">Select a range</option>
                                    <option>1–50</option>
                                    <option>51–250</option>
                                    <option>251–1,000</option>
                                    <option>1,001–5,000</option>
                                    <option>5,000+</option>
                                </select>
                                {fieldErrors.companySize && <p className="mkt-field-error">{fieldErrors.companySize}</p>}
                            </div>
                            <div className="mkt-field mkt-span">
                                <label htmlFor="demo-need">Primary need</label>
                                <textarea id="demo-need" name="primaryNeed" value={form.primaryNeed} onChange={onChange('primaryNeed')} required />
                                {fieldErrors.primaryNeed && <p className="mkt-field-error">{fieldErrors.primaryNeed}</p>}
                            </div>
                            {error && <p className="mkt-span" role="alert">{error}</p>}
                            <button className="mkt-btn mkt-btn-gold mkt-span" type="submit" disabled={submitting || received}>
                                {submitting ? 'Submitting…' : isSales ? 'Contact sales' : 'Submit request'}
                            </button>
                        </form>
                    )}
                </div>
            </section>
        </MarketingLayout>
    );
}
