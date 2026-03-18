import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Button from '../../components/ui/Button';
import { requestOTP, verifyOTP } from '../../api/auth';
import iconLogo from '../../assets/iconlogo.png';
import hasamexLogo from '../../assets/hasamex_logo.png';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [step, setStep] = useState('email'); // 'email', 'otp', 'verified'
    const [message, setMessage] = useState('');
    const [resetLink, setResetLink] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [timer, setTimer] = useState(120); // 2 minutes

    useEffect(() => {
        let interval;
        if (step === 'otp' && timer > 0) {
            interval = setInterval(() => {
                setTimer((prev) => prev - 1);
            }, 1000);
        } else if (timer === 0 && step === 'otp') {
            setError('OTP expired. Please request a new one.');
        }
        return () => clearInterval(interval);
    }, [step, timer]);

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const onRequestOTP = async (e) => {
        if (e) e.preventDefault();
        setError('');
        setMessage('');
        const cleanEmail = email.trim().toLowerCase();
        if (!cleanEmail) return setError('Email is required');

        setLoading(true);
        try {
            const result = await requestOTP({ email: cleanEmail });
            setMessage(result?.message || 'If this email exists, an OTP will be sent.');
            setStep('otp');
            setTimer(120);
            setOtp('');
            // In dev, the backend returns the OTP for easy testing
            if (result?.otp) {
                console.log('DEV ONLY - OTP:', result.otp);
            }
        } catch (err) {
            setError(err?.data?.error || 'Failed to request OTP');
        } finally {
            setLoading(false);
        }
    };

    const onVerifyOTP = async (e) => {
        e.preventDefault();
        setError('');
        if (!otp) return setError('OTP is required');
        if (timer === 0) return setError('OTP expired. Please request a new one.');

        setLoading(true);
        try {
            const result = await verifyOTP({ email: email.trim().toLowerCase(), otp });
            setMessage('OTP verified successfully.');
            if (result?.reset_link) setResetLink(result.reset_link);
            setStep('verified');
        } catch (err) {
            setError(err?.data?.error || 'Invalid OTP');
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
                            We’ll send a 6-digit OTP to your email for secure verification.
                        </div>
                        <ul className="auth-hero__bullets">
                            <li>Secure OTP verification</li>
                            <li>2-minute validity</li>
                            <li>No account leakage</li>
                        </ul>
                    </div>
                </div>

                <div className="auth-card">
                    <div className="auth-card__header">
                        <img className="auth-card__logo" src={hasamexLogo} alt="Hasamex" />
                        <h1 className="auth-title">Forgot password</h1>
                        <p className="auth-subtitle">
                            {step === 'email' ? 'Enter your registered email to get an OTP.' : 
                             step === 'otp' ? 'Enter the 6-digit OTP sent to your email.' : 
                             'Verification complete.'}
                        </p>
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

                    {step === 'email' && (
                        <form onSubmit={onRequestOTP} className="auth-form">
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
                                Send OTP
                            </Button>
                        </form>
                    )}

                    {step === 'otp' && (
                        <form onSubmit={onVerifyOTP} className="auth-form">
                            <label className="auth-label">
                                Enter 6-digit OTP
                                <input
                                    className="auth-input"
                                    type="text"
                                    maxLength="6"
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value)}
                                    placeholder="000000"
                                />
                            </label>

                            <div className="auth-timer" style={{ 
                                textAlign: 'center', 
                                marginBottom: 'var(--space-4)', 
                                color: timer < 30 ? '#ef4444' : 'inherit',
                                fontWeight: '500'
                            }}>
                                OTP expires in: {formatTime(timer)}
                            </div>

                            <Button variant="primary" type="submit" loading={loading} style={{ width: '100%' }} disabled={timer === 0}>
                                Verify OTP
                            </Button>

                            <div style={{ textAlign: 'center', marginTop: 'var(--space-4)' }}>
                                <button 
                                    type="button" 
                                    className="auth-link" 
                                    onClick={onRequestOTP}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                                >
                                    Resend OTP
                                </button>
                            </div>
                        </form>
                    )}

                    <div className="auth-actions auth-actions--between" style={{ marginTop: 'var(--space-4)' }}>
                        <Link to="/login" className="auth-link">
                            Back to Login
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
