import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, CheckCircle2, AlertCircle, Lock, ArrowLeft } from 'lucide-react';
import { LOGIN_CLOUD_VIDEO_URL, LOGIN_CLOUD_VIDEO_MOBILE_URL } from '../components/background/videoUrls';
import { useResponsiveVideoSource } from '../utils/responsiveVideo';
import './LoginPage.css';

const ease = [0.16, 1, 0.3, 1];

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const email = searchParams.get('email') || '';

  const videoSrc = useResponsiveVideoSource(LOGIN_CLOUD_VIDEO_URL, LOGIN_CLOUD_VIDEO_MOBILE_URL);

  const [validating, setValidating] = useState(true);
  const [isValidToken, setIsValidToken] = useState(false);
  const [tokenError, setTokenError] = useState('');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  // Validate token on mount
  useEffect(() => {
    async function checkToken() {
      if (!token || !email) {
        setValidating(false);
        setIsValidToken(false);
        setTokenError('Reset link parameters are missing.');
        return;
      }

      try {
        setValidating(true);
        const res = await fetch(
          `${backendUrl}/api/auth/reset-password/validate?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`
        );
        const data = await res.json();

        if (res.ok && data.valid) {
          setIsValidToken(true);
          setTokenError('');
        } else {
          setIsValidToken(false);
          setTokenError(data.message || 'Reset link is invalid or has expired.');
        }
      } catch (err) {
        console.error('[ResetPasswordPage] Validation error:', err);
        setIsValidToken(false);
        setTokenError('Could not connect to password reset service.');
      } finally {
        setValidating(false);
      }
    }

    checkToken();
  }, [token, email, backendUrl]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!password) {
      setError('Please enter a new password.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch(`${backendUrl}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          email,
          password,
          confirmPassword
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.message || 'Failed to update password. Please try again.');
      } else {
        setSuccess('Password updated successfully. Redirecting to login...');
        setTimeout(() => {
          navigate('/login', { replace: true });
        }, 2200);
      }
    } catch (err) {
      console.error('[ResetPasswordPage] Reset error:', err);
      setError('Could not connect to backend password reset service.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="login-page">
      <video
        className="login-page-video"
        src={videoSrc}
        autoPlay
        muted
        playsInline
        preload="auto"
        aria-hidden="true"
      />

      <div className="login-page-overlay">
        <motion.div
          className="login-card"
          initial={{ opacity: 0, scale: 0.94, filter: 'blur(18px)' }}
          animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
          transition={{ duration: 0.9, ease }}
        >
          <h2 className="login-brand">WeatherGPT</h2>

          {validating ? (
            <div style={{ textAlign: 'center', padding: '2rem 0', color: '#e0f2fe' }}>
              <p className="login-heading">Validating reset link...</p>
            </div>
          ) : !isValidToken ? (
            <div style={{ textAlign: 'center' }}>
              <AlertCircle size={42} color="#f87171" style={{ margin: '0 auto 0.8rem' }} />
              <p className="login-heading" style={{ color: '#fecaca' }}>
                Reset Link Invalid
              </p>
              <p className="login-message login-error" style={{ marginBottom: '1.5rem' }}>
                {tokenError}
              </p>
              <button
                type="button"
                className="login-submit"
                onClick={() => navigate('/login')}
              >
                RETURN TO LOGIN
              </button>
            </div>
          ) : success ? (
            <div style={{ textAlign: 'center' }}>
              <CheckCircle2 size={44} color="#34d399" style={{ margin: '0 auto 0.8rem' }} />
              <p className="login-heading" style={{ color: '#a7f3d0' }}>
                Password Updated!
              </p>
              <p className="login-message login-info" style={{ marginBottom: '1.5rem' }}>
                {success}
              </p>
            </div>
          ) : (
            <>
              <p className="login-heading">Reset Your Password</p>
              <p style={{ textAlign: 'center', fontSize: '0.8rem', color: '#94a3b8', marginTop: '-1rem', marginBottom: '1.2rem' }}>
                Account: <strong style={{ color: '#38bdf8' }}>{email}</strong>
              </p>

              <form className="login-form" onSubmit={handleSubmit}>
                <div className="login-field">
                  <label htmlFor="reset-new-password">New Password</label>
                  <div className="login-password-wrap">
                    <input
                      id="reset-new-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      disabled={submitting}
                    />
                    <button
                      type="button"
                      className="login-eye"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="login-field">
                  <label htmlFor="reset-confirm-password">Confirm New Password</label>
                  <div className="login-password-wrap">
                    <input
                      id="reset-confirm-password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      disabled={submitting}
                    />
                    <button
                      type="button"
                      className="login-eye"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="login-submit"
                  disabled={submitting}
                >
                  {submitting ? 'UPDATING...' : 'UPDATE PASSWORD'}
                </button>
              </form>

              {error ? <p className="login-message login-error">{error}</p> : null}

              <div style={{ marginTop: '1.2rem', textAlign: 'center' }}>
                <button
                  type="button"
                  className="login-link"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                  onClick={() => navigate('/login')}
                >
                  <ArrowLeft size={14} /> Return to Login
                </button>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </main>
  );
}
