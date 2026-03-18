import { useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../../components/ui/Button';
import { forgotPassword } from '../../api/auth';
import iconLogo from '../../assets/iconlogo.png';
import hasamexLogo from '../../assets/hasamex_logo.png';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [resetLink, setResetLink] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const onSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');
        setResetLink('');
        const cleanEmail = email.trim().toLowerCase();
        if (!cleanEmail) return setError('Email is required');

        setLoading(true);
        try {
            const result = await forgotPassword({ email: cleanEmail });
            setMessage(result?.message || 'If this email exists, a reset link will be sent.');
            if (result?.reset_link) setResetLink(result.reset_link);
        } catch (err) {
            setError(err?.data?.error || 'Failed to request reset link');
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
                        <div className="auth-hero__headline">Reset your password</div>
                        <div className="auth-hero__subtext">
                            We’ll generate a secure reset link if the email exists and is active.
                        </div>
                        <ul className="auth-hero__bullets">
                            <li>Secure reset token</li>
                            <li>No account leakage</li>
                        </ul>
                    </div>
                </div>

                <div className="auth-card">
                    <div className="auth-card__header">
                        <img className="auth-card__logo" src={hasamexLogo} alt="Hasamex" />
                        <h1 className="auth-title">Forgot password</h1>
                        <p className="auth-subtitle">Enter your registered email to get a reset link.</p>
                    </div>

                    {error ? <div className="auth-error">{error}</div> : null}
                    {message ? (
                        <div className="auth-success">
                            <div>{message}</div>
                            {resetLink ? (
                                <div style={{ marginTop: 'var(--space-2)' }}>
                                    <a className="auth-link" href={resetLink}>
                                        Open reset password page
                                    </a>
                                </div>
                            ) : null}
                        </div>
                    ) : null}

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

                        <Button variant="primary" type="submit" loading={loading} style={{ width: '100%' }}>
                            Send Reset Link
                        </Button>

                        <div className="auth-actions auth-actions--between">
                            <Link to="/login" className="auth-link">
                                Back to Login
                            </Link>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

