import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { authAPI } from '../services/api';
import MarketingLayout from '../marketing/MarketingLayout';

export default function Activate() {
    const [params] = useSearchParams();
    const token = params.get('token') || '';
    const navigate = useNavigate();
    const [form, setForm] = useState({ firstName: '', lastName: '', password: '' });
    const [error, setError] = useState(token ? '' : 'This activation link is missing a token.');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setError('');
        setLoading(true);
        try {
            await authAPI.activate({
                token,
                password: form.password,
                firstName: form.firstName,
                lastName: form.lastName,
            });
            navigate('/login');
        } catch (err: any) {
            setError(err.message || 'Unable to activate this invitation');
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
                        <h1 className="mkt-display">Activate account</h1>
                        <p className="mkt-lede">Use the single-use invitation link to create your password.</p>
                        {error && <p role="alert">{error}</p>}
                        <form className="mkt-form" onSubmit={handleSubmit}>
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
                            <button className="mkt-btn mkt-btn-gold" type="submit" disabled={loading || !token}>
                                {loading ? 'Activating…' : 'Activate account'}
                            </button>
                        </form>
                        <Link to="/login">Back to sign in</Link>
                    </div>
                </div>
            </section>
        </MarketingLayout>
    );
}
