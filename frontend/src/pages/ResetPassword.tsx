import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { authAPI } from '../services/api';
import MarketingLayout from '../marketing/MarketingLayout';

export default function ResetPassword() {
    const [params] = useSearchParams();
    const token = params.get('token') || '';
    const navigate = useNavigate();
    const [password, setPassword] = useState('');
    const [error, setError] = useState(token ? '' : 'This reset link is missing a token.');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setError('');
        setLoading(true);
        try {
            await authAPI.resetPassword(token, password);
            navigate('/login');
        } catch (err: any) {
            setError(err.message || 'Unable to reset password');
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
                        <h1 className="mkt-display">Choose a new password</h1>
                        <p className="mkt-lede">This reset link can be used once and then expires.</p>
                        {error && <p role="alert">{error}</p>}
                        <form className="mkt-form" onSubmit={handleSubmit}>
                            <div className="mkt-field">
                                <label htmlFor="password">New password</label>
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    autoComplete="new-password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                                <p className="mkt-note">At least 10 characters with upper, lower, and a number.</p>
                            </div>
                            <button className="mkt-btn mkt-btn-gold" type="submit" disabled={loading || !token}>
                                {loading ? 'Saving…' : 'Save password'}
                            </button>
                        </form>
                        <Link to="/login">Back to sign in</Link>
                    </div>
                </div>
            </section>
        </MarketingLayout>
    );
}
