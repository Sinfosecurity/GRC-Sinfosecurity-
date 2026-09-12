import { useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { authAPI } from '../services/api';

export function AdminMfaChallenge() {
    const { completeMfa } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const challengeToken = (location.state as { challengeToken?: string } | null)?.challengeToken || '';
    const [code, setCode] = useState('');
    const [error, setError] = useState(challengeToken ? '' : 'Start from the operations sign-in page.');
    const [loading, setLoading] = useState(false);

    return (
        <MfaShell title="Authenticator code">
            <form onSubmit={async (event) => {
                event.preventDefault();
                setLoading(true);
                setError('');
                try {
                    await completeMfa(challengeToken, code);
                    navigate('/platform');
                } catch {
                    setError('Invalid verification code');
                } finally {
                    setLoading(false);
                }
            }}>
                <label htmlFor="mfa-code">Authentication code</label>
                <input id="mfa-code" inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value)} required />
                {error && <p role="alert">{error}</p>}
                <button type="submit" disabled={loading}>{loading ? 'Verifying…' : 'Verify'}</button>
            </form>
        </MfaShell>
    );
}

export function AdminMfaEnroll() {
    const { confirmMfaEnrollment } = useAuth();
    const navigate = useNavigate();
    const [secret, setSecret] = useState('');
    const [otpauth, setOtpauth] = useState('');
    const [code, setCode] = useState('');
    const [recovery, setRecovery] = useState<string[]>([]);
    const [error, setError] = useState('');
    const [started, setStarted] = useState(false);

    return (
        <MfaShell title="Enroll authenticator">
            {!started ? (
                <button type="button" onClick={() => {
                    authAPI.startMfaEnrollment().then((response) => {
                        setSecret(response.data.data.secret);
                        setOtpauth(response.data.data.otpauthUrl);
                        setStarted(true);
                    }).catch(() => setError('Unable to start MFA enrollment'));
                }}>Generate authenticator secret</button>
            ) : recovery.length ? (
                <div>
                    <p>Store these recovery codes now. They will not be shown again.</p>
                    <ul>{recovery.map((item) => <li key={item}><code>{item}</code></li>)}</ul>
                    <button type="button" onClick={() => navigate('/platform')}>Enter operations console</button>
                </div>
            ) : (
                <form onSubmit={async (event) => {
                    event.preventDefault();
                    try {
                        const result = await confirmMfaEnrollment(code) as { recoveryCodes?: string[] };
                        setRecovery(result.recoveryCodes || []);
                    } catch {
                        setError('Invalid verification code');
                    }
                }}>
                    <p>Add this secret to an authenticator app. It is shown only during enrollment.</p>
                    <p><code>{secret}</code></p>
                    <p style={{ wordBreak: 'break-all' }}>{otpauth}</p>
                    <label htmlFor="enroll-code">Authentication code</label>
                    <input id="enroll-code" inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value)} required />
                    {error && <p role="alert">{error}</p>}
                    <button type="submit">Confirm enrollment</button>
                </form>
            )}
            {error && !started && <p role="alert">{error}</p>}
        </MfaShell>
    );
}

function MfaShell({ title, children }: { title: string; children: ReactNode }) {
    return (
        <main style={{ minHeight: '100vh', background: '#140f0c', color: '#f3e8dc', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
            <section style={{ width: 'min(480px, 100%)', border: '1px solid rgba(196,149,92,0.25)', background: '#1b1410', padding: 32 }}>
                <p style={{ letterSpacing: '0.14em', textTransform: 'uppercase', color: '#c4955c', fontSize: 12 }}>Privileged MFA</p>
                <h1 style={{ fontFamily: 'Newsreader, serif' }}>{title}</h1>
                {children}
            </section>
        </main>
    );
}
