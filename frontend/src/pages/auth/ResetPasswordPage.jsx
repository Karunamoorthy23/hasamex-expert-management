import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Button from '../../components/ui/Button';
import { resetPassword } from '../../api/auth';
import iconLogo from '../../assets/iconlogo.png';
import hasamexLogo from '../../assets/hasamex_logo.png';

export default function ResetPasswordPage() {
    const navigate = useNavigate();
    const [params] = useSearchParams();
    const token = useMemo(() => params.get('token') || '', [params]);

    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const onSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');
        if (!token) return setError('Missing reset token');
        if (!newPassword) return setError('New password is required');
        if (newPassword.length < 8) return setError('Password must be at least 8 characters');
        if (newPassword !== confirmPassword) return setError('Passwords do not match');

        setLoading(true);
        try {
            const result = await resetPassword({ token, newPassword, confirmPassword });
            setMessage(result?.message || 'Password reset successful');
            setTimeout(() => navigate('/login', { replace: true }), 800);
        } catch (err) {
            setError(err?.data?.error || 'Reset failed');
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
                        <div className="auth-hero__headline">Set a new password</div>
                        <div className="auth-hero__subtext">
                            Choose a strong password to keep your Hasamex access secure.
                        </div>
                        <ul className="auth-hero__bullets">
                            <li>Reset token expires in 15 minutes</li>
                            <li>Argon2 hashing for storage</li>
                            <li>JWT access after login</li>
                        </ul>
                    </div>
                </div>

                <div className="auth-card">
                    <div className="auth-card__header">
                        <img className="auth-card__logo" src={hasamexLogo} alt="Hasamex" />
                        <h1 className="auth-title">Reset password</h1>
                        <p className="auth-subtitle">Enter and confirm your new password.</p>
                    </div>

                    {!token ? (
                        <div className="auth-error">Missing reset token. Please request a new reset link.</div>
                    ) : null}

                    {error ? <div className="auth-error">{error}</div> : null}
                    {message ? <div className="auth-success">{message}</div> : null}

                    <form onSubmit={onSubmit} className="auth-form">
                        <label className="auth-label">
                            New Password
                            <input
                                className="auth-input"
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="••••••••"
                                autoComplete="new-password"
                                disabled={!token}
                            />
                        </label>

                        <label className="auth-label">
                            Confirm Password
                            <input
                                className="auth-input"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="••••••••"
                                autoComplete="new-password"
                                disabled={!token}
                            />
                        </label>

                        <Button variant="primary" type="submit" loading={loading} style={{ width: '100%' }} disabled={!token}>
                            Reset Password
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

