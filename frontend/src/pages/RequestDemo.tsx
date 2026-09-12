import { FormEvent, useState } from 'react';
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
    const [form, setForm] = useState(EMPTY);
    const [submitting, setSubmitting] = useState(false);
    const [result, setResult] = useState<{ delivery: string; message: string } | null>(null);
    const [error, setError] = useState('');

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
            const response = await demoAPI.request(form);
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
                    <p className="mkt-kicker">Request a demo</p>
                    <h1 className="mkt-display">See Supreme against the work you already do.</h1>
                    <p className="mkt-lede">
                        Tell us who you are and what you need to govern. This is a real request path,
                        not a decorative button.
                    </p>
                    <form className="mkt-form" onSubmit={onSubmit}>
                        <div className="mkt-field">
                            <label htmlFor="demo-name">Name</label>
                            <input id="demo-name" name="name" value={form.name} onChange={onChange('name')} required />
                        </div>
                        <div className="mkt-field">
                            <label htmlFor="demo-email">Business email</label>
                            <input id="demo-email" name="email" type="email" value={form.email} onChange={onChange('email')} required />
                        </div>
                        <div className="mkt-field">
                            <label htmlFor="demo-company">Company</label>
                            <input id="demo-company" name="company" value={form.company} onChange={onChange('company')} required />
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
                        <div className="mkt-field">
                            <label htmlFor="demo-need">Primary need</label>
                            <textarea id="demo-need" name="primaryNeed" value={form.primaryNeed} onChange={onChange('primaryNeed')} required />
                        </div>
                        {error && <p role="alert">{error}</p>}
                        {result && (
                            <p className="mkt-status" role="status">
                                {result.message} Delivery: {result.delivery}.
                            </p>
                        )}
                        <button className="mkt-btn mkt-btn-gold" type="submit" disabled={submitting}>
                            {submitting ? 'Submitting…' : 'Submit request'}
                        </button>
                    </form>
                </div>
            </section>
        </MarketingLayout>
    );
}
