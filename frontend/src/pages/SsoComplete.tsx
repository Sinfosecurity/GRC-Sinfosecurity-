import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import MarketingLayout from '../marketing/MarketingLayout';
import { authAPI } from '../services/api';
import { setAccessToken } from '../services/sessionStore';

export default function SsoComplete() {
    const [params] = useSearchParams();
    const navigate = useNavigate();
    const [error, setError] = useState('');

    useEffect(() => {
        const code = params.get('code');
        if (!code) {
            setError('The sign-in request could not be completed. Try again.');
            return;
        }
        authAPI.exchangeSso(code)
            .then((response) => {
                const data = response.data.data;
                if (!data?.token || !data?.user) {
                    throw new Error('The sign-in request could not be completed. Try again.');
                }
                setAccessToken(data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                window.location.assign('/dashboard');
            })
            .catch((err: { message?: string }) => {
                setError(err.message || 'The sign-in request could not be completed. Try again.');
                navigate('/login', { replace: true });
            });
    }, [navigate, params]);

    return (
        <MarketingLayout>
            <section className="mkt-page">
                <div className="mkt-shell">
                    <p className="mkt-kicker">Workspace access</p>
                    <h1 className="mkt-display">Completing Company SSO</h1>
                    {error && <p role="alert">{error}</p>}
                </div>
            </section>
        </MarketingLayout>
    );
}
