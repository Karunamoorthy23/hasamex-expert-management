import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../../components/ui/Button';
import { login } from '../../api/auth';
import { setToken } from '../../auth/token';
import iconLogo from '../../assets/iconlogo.png';
import hasamexLogo from '../../assets/hasamex_logo.png';

export default function LoginPage() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const onSubmit = async (e) => {
        e.preventDefault();
        setError('');
        const cleanEmail = email.trim().toLowerCase();
        if (!cleanEmail) return setError('Email is required');
        if (!password) return setError('Password is required');

        setLoading(true);
        try {
            const result = await login({ email: cleanEmail, password });
            if (result?.access_token) {
                setToken(result.access_token);
                navigate('/', { replace: true });
            } else {
                setError('Login failed');
            }
        } catch (err) {
            const msg = err?.data?.error || 'Access Denied';
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-shell">
            <div className="auth-layout">
                <div className="auth-hero" aria-hidden="true">
                    <div className="auth-hero__inner">
                        <div className="auth-hero__brand">
                            <img className="auth-hero__icon" src={iconLogo} alt="" />
                            <img className="auth-hero__logo" src={hasamexLogo} alt="" />
                        </div>
                        <div className="auth-hero__headline">Expert Insight Delivered with Speed &amp; Trust</div>
                        <div className="auth-hero__subtext">
                            Secure access to Clients, Users, Projects, and Experts dashboards.
                        </div>
                        <ul className="auth-hero__bullets">
                            <li>JWT-based secure access</li>
                            <li>Argon2 password protection</li>
                            <li>Role-ready payload</li>
                        </ul>
                    </div>
                </div>

                <div className="auth-card">
                    <div className="auth-card__header">
                        <img className="auth-card__logo" src={hasamexLogo} alt="Hasamex" />
                        <h1 className="auth-title">Welcome back</h1>
                        <p className="auth-subtitle">Login with your registered email</p>
                    </div>

                    {error ? <div className="auth-error">{error}</div> : null}

                    <form onSubmit={onSubmit} className="auth-form">
                        <label className="auth-label">
                            Email
                            <input
                                className="auth-input"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@company.com"
                                autoComplete="email"
                            />
                        </label>

                        <label className="auth-label">
                            Password
                            <input
                                className="auth-input"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                autoComplete="current-password"
                            />
                        </label>

                        <div className="auth-actions">
                            <Link to="/forgot-password" className="auth-link">
                                Forgot password?
                            </Link>
                        </div>

                        <Button variant="primary" type="submit" loading={loading} style={{ width: '100%' }}>
                            Login
                        </Button>
                    </form>
                </div>
            </div>
        </div>
    );
}

