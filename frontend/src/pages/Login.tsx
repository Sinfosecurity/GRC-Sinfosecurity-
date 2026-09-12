import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { environmentLabel } from '../components/DevPreviewBanner';
import MarketingLayout from '../marketing/MarketingLayout';

export default function Login() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setError('');
        setLoading(true);
        try {
            const result = await login(email, password, 'CUSTOMER');
            if (result.mfaEnrollmentRequired) {
                navigate('/admin/mfa/enroll');
                return;
            }
            navigate(typeof result.nextPath === 'string' ? result.nextPath : '/dashboard');
        } catch (err: any) {
            setError(err.status === 429
                ? 'Too many requests. Please try again later.'
                : err.message || 'Unable to sign in');
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
                        <h1 className="mkt-display">Sign in</h1>
                        {environmentLabel() && (
                            <p className="mkt-kicker">
                                {environmentLabel() === 'STAGING' ? 'SUPREME RISK — STAGING' : 'SUPREME RISK — DEVELOPMENT PREVIEW'}
                            </p>
                        )}
                        <p className="mkt-lede">
                            {environmentLabel() === 'STAGING'
                                ? 'Sign in to the isolated staging organization'
                                : environmentLabel() === 'DEVELOPMENT'
                                    ? 'Sign in to the local demo organization'
                                    : 'Sign in to your organization'}
                        </p>
                        <form className="mkt-form" onSubmit={handleSubmit}>
                            <div className="mkt-field">
                                <label htmlFor="work-email">Work email</label>
                                <input
                                    id="work-email"
                                    name="username"
                                    type="email"
                                    autoComplete="username"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="mkt-field">
                                <label htmlFor="password">Password</label>
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    autoComplete="current-password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                            </div>
                            {error && <p role="alert">{error}</p>}
                            <button className="mkt-btn mkt-btn-gold" type="submit" disabled={loading}>
                                {loading ? 'Signing in…' : 'Sign in'}
                            </button>
                            <div className="mkt-legal" style={{ marginTop: 8, paddingTop: 8, border: 0 }}>
                                <Link to="/forgot-password">Forgot password</Link>
                                <Link to="/register">Create organization</Link>
                            </div>
                        </form>
                    </div>
                </div>
            </section>
        </MarketingLayout>
    );
}
