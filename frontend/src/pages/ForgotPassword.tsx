import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authAPI } from '../services/api';
import MarketingLayout from '../marketing/MarketingLayout';

export default function ForgotPassword() {
    const [email, setEmail] = useState('');
    const [sent, setSent] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (loading) return;
        setError('');
        setLoading(true);
        try {
            await authAPI.forgotPassword(email);
            setSent(true);
        } catch (err: any) {
            setError(err.status === 429
                ? 'Too many requests. Please try again later.'
                : err.message || 'Unable to request a reset');
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
                        <h1 className="mkt-display">Reset password</h1>
                        <p className="mkt-lede">If an account exists, a reset email will be sent.</p>
                        {error && <p role="alert">{error}</p>}
                        {sent ? (
                            <p className="mkt-status" role="status">If an account exists, a reset email will be sent.</p>
                        ) : (
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
                                <button className="mkt-btn mkt-btn-gold" type="submit" disabled={loading}>
                                    {loading ? 'Sending…' : 'Send reset link'}
                                </button>
                            </form>
                        )}
                        <Link to="/login">Back to sign in</Link>
                    </div>
                </div>
            </section>
        </MarketingLayout>
    );
}
