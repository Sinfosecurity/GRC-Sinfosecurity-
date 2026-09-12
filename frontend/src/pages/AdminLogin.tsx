import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { environmentLabel } from '../components/DevPreviewBanner';

export default function AdminLogin() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const staging = environmentLabel() === 'STAGING';

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setError('');
        setLoading(true);
        try {
            const result = await login(email, password, 'PLATFORM');
            if (result.mfaEnrollmentRequired) {
                navigate('/admin/mfa/enroll');
                return;
            }
            if (result.mfaRequired && typeof result.challengeToken === 'string') {
                navigate('/admin/mfa', { state: { challengeToken: result.challengeToken } });
                return;
            }
            navigate('/platform');
        } catch (err: unknown) {
            const status = typeof err === 'object' && err && 'status' in err ? Number((err as { status?: number }).status) : 0;
            setError(status === 429 ? 'Too many requests. Please try again later.' : 'Unable to sign in');
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="admin-login" style={{ minHeight: '100vh', background: '#140f0c', color: '#f3e8dc', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
            <section style={{ width: 'min(440px, 100%)', border: '1px solid rgba(196,149,92,0.25)', background: '#1b1410', padding: 32 }}>
                <p style={{ letterSpacing: '0.14em', textTransform: 'uppercase', color: '#c4955c', fontSize: 12 }}>Internal admin plane</p>
                <h1 style={{ fontFamily: 'Newsreader, serif', fontSize: 32, margin: '8px 0 12px' }}>Supreme operations</h1>
                {staging && <p>SUPREME RISK — STAGING</p>}
                <p style={{ color: '#d7c4ae' }}>Sign in with your Supreme identity. Privileged access requires MFA.</p>
                <form onSubmit={handleSubmit}>
                    <label htmlFor="admin-email" style={{ display: 'block', marginTop: 16 }}>Work email</label>
                    <input id="admin-email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ width: '100%', padding: 10 }} />
                    <label htmlFor="admin-password" style={{ display: 'block', marginTop: 16 }}>Password</label>
                    <input id="admin-password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required style={{ width: '100%', padding: 10 }} />
                    {error && <p role="alert">{error}</p>}
                    <button type="submit" disabled={loading} style={{ marginTop: 20, background: '#c4955c', color: '#140f0c', border: 0, padding: '10px 16px', fontWeight: 700 }}>
                        {loading ? 'Signing in…' : 'Continue'}
                    </button>
                </form>
                <p style={{ marginTop: 20 }}><Link to="/admin/forgot-password" style={{ color: '#e8c9a0' }}>Forgot password</Link></p>
            </section>
        </main>
    );
}
