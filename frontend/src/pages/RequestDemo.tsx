import { FormEvent, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import MarketingLayout from '../marketing/MarketingLayout';
import { demoAPI, DemoRequestPayload } from '../services/api';

const EMPTY: DemoRequestPayload = {
    name: '',
    email: '',
    company: '',
    role: '',
    companySize: '',
    primaryNeed: '',
};

export default function RequestDemo() {
    const [searchParams] = useSearchParams();
    const intent = searchParams.get('intent') || 'demo';
    const plan = searchParams.get('selectedPlan') || searchParams.get('plan') || '';
    const source = searchParams.get('source') || '';
    const isSales = intent === 'pricing' || intent === 'enterprise-sales';
    const [form, setForm] = useState(EMPTY);
    const [submitting, setSubmitting] = useState(false);
    const [result, setResult] = useState<{ delivery: string; message: string } | null>(null);
    const [error, setError] = useState('');

    const heading = useMemo(() => {
        if (isSales && plan) return `Contact sales about the ${plan} plan.`;
        if (isSales) return 'Contact sales about a Supreme plan.';
        return 'See Supreme against the work you already do.';
    }, [isSales, plan]);

    const onChange = (field: keyof DemoRequestPayload) => (
        event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
    ) => {
        setForm((current) => ({ ...current, [field]: event.target.value }));
    };

    const onSubmit = async (event: FormEvent) => {
        event.preventDefault();
        setSubmitting(true);
        setError('');
        setResult(null);
        try {
            const response = await demoAPI.request({
                ...form,
                intent,
                plan: plan || undefined,
                selectedPlan: plan || undefined,
                source: source || undefined,
            });
            const delivery = response.data.delivery;
            setResult({
                delivery,
                message: delivery === 'SENT'
                    ? 'Request accepted and emailed to the Supreme inquiry inbox.'
                    : 'Request accepted. Email delivery is NOT_CONFIGURED in this environment, so the inquiry was stored for follow-up.',
            });
            setForm(EMPTY);
        } catch (err: any) {
            setError(err.message || 'Unable to submit the demo request.');
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
                    {plan && <p className="mkt-status" role="status">Selected plan: {plan}</p>}
                    <form className="mkt-form mkt-request-form" onSubmit={onSubmit}>
                        <input type="hidden" name="intent" value={intent} />
                        {plan && <input type="hidden" name="plan" value={plan} />}
                        {plan && <input type="hidden" name="selectedPlan" value={plan} />}
                        {source && <input type="hidden" name="source" value={source} />}
                        <div className="mkt-field">
                            <label htmlFor="demo-name">Name</label>
                            <input id="demo-name" name="name" autoComplete="name" value={form.name} onChange={onChange('name')} required />
                        </div>
                        <div className="mkt-field">
                            <label htmlFor="demo-email">Business email</label>
                            <input id="demo-email" name="email" type="email" autoComplete="email" value={form.email} onChange={onChange('email')} required />
                        </div>
                        <div className="mkt-field">
                            <label htmlFor="demo-company">Company</label>
                            <input id="demo-company" name="company" autoComplete="organization" value={form.company} onChange={onChange('company')} required />
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
                        </div>
                        <div className="mkt-field mkt-span">
                            <label htmlFor="demo-need">Primary need</label>
                            <textarea id="demo-need" name="primaryNeed" value={form.primaryNeed} onChange={onChange('primaryNeed')} required />
                        </div>
                        {error && <p className="mkt-span" role="alert">{error}</p>}
                        {result && (
                            <p className="mkt-status mkt-span" role="status">
                                {result.message} Delivery: {result.delivery}.
                            </p>
                        )}
                        <button className="mkt-btn mkt-btn-gold mkt-span" type="submit" disabled={submitting}>
                            {submitting ? 'Submitting…' : isSales ? 'Contact sales' : 'Submit request'}
                        </button>
                    </form>
                </div>
            </section>
        </MarketingLayout>
    );
}
