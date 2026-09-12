import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import MarketingLayout from '../marketing/MarketingLayout';

export default function Register() {
    const { signup } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const selectedPlan = searchParams.get('selectedPlan') || '';
    const source = searchParams.get('source') || '';
    const intent = searchParams.get('intent') || '';
    const [form, setForm] = useState({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        organizationName: '',
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setError('');
        setLoading(true);
        try {
            await signup(form);
            navigate('/dashboard');
        } catch (err: any) {
            setError(err.message || 'Unable to create account');
        } finally {
            setLoading(false);
        }
    };

    return (
        <MarketingLayout>
            <section className="mkt-page">
                <div className="mkt-shell">
                    <div className="mkt-login">
                        <p className="mkt-kicker">Workspace access</p>
                        <h1 className="mkt-display">Create your organization</h1>
                        <p className="mkt-lede">Start a Supreme workspace. No demo data is invented.</p>
                        {selectedPlan && (
                            <p className="mkt-status" role="status">
                                Selected plan: {selectedPlan}
                                {source ? ` · Source: ${source}` : ''}
                                {intent ? ` · Intent: ${intent}` : ''}
                            </p>
                        )}
                        <form className="mkt-form" onSubmit={handleSubmit}>
                            {selectedPlan && <input type="hidden" name="selectedPlan" value={selectedPlan} />}
                            {source && <input type="hidden" name="source" value={source} />}
                            {intent && <input type="hidden" name="intent" value={intent} />}
                            <div className="mkt-field">
                                <label htmlFor="first-name">First name</label>
                                <input
                                    id="first-name"
                                    name="firstName"
                                    autoComplete="given-name"
                                    value={form.firstName}
                                    onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="mkt-field">
                                <label htmlFor="last-name">Last name</label>
                                <input
                                    id="last-name"
                                    name="lastName"
                                    autoComplete="family-name"
                                    value={form.lastName}
                                    onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="mkt-field">
                                <label htmlFor="organization">Organization</label>
                                <input
                                    id="organization"
                                    name="organization"
                                    autoComplete="organization"
                                    value={form.organizationName}
                                    onChange={(e) => setForm({ ...form, organizationName: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="mkt-field">
                                <label htmlFor="work-email">Work email</label>
                                <input
                                    id="work-email"
                                    name="username"
                                    type="email"
                                    autoComplete="username"
                                    value={form.email}
                                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="mkt-field">
                                <label htmlFor="password">Password</label>
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    autoComplete="new-password"
                                    value={form.password}
                                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                                    required
                                />
                                <p className="mkt-note">At least 10 characters with upper, lower, and a number.</p>
                            </div>
                            {error && <p role="alert">{error}</p>}
                            <button className="mkt-btn mkt-btn-gold" type="submit" disabled={loading}>
                                {loading ? 'Creating…' : 'Create organization'}
                            </button>
                            <Link to="/login">Already have an account? Sign in</Link>
                        </form>
                    </div>
                </div>
            </section>
        </MarketingLayout>
    );
}
