import React, { useCallback, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, ShieldCheck, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { LOGIN_CLOUD_VIDEO_URL, LOGIN_CLOUD_VIDEO_MOBILE_URL } from '../components/background/videoUrls';
import { usePauseCloudAtThree } from '../hooks/usePauseCloudAtThree';
import { useResponsiveVideoSource } from '../utils/responsiveVideo';
import '../pages/LoginPage.css';

const ease = [0.16, 1, 0.3, 1];

const fadeUp = (delay) => ({
  initial: { opacity: 0, y: 16, filter: 'blur(10px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
  transition: { duration: 0.9, delay, ease }
});

export function AdminLoginPage() {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const [showForm, setShowForm] = useState(false);
  const { adminLogin } = useAuth();

  const videoSrc = useResponsiveVideoSource(LOGIN_CLOUD_VIDEO_URL, LOGIN_CLOUD_VIDEO_MOBILE_URL);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  usePauseCloudAtThree({
    videoRef,
    active: true,
    onFrozen: () => setShowForm(true)
  });

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!email.trim() || !password) {
      setError('Please fill in all required fields.');
      return;
    }

    try {
      setIsSubmitting(true);
      await adminLogin(email, password, phone);
      navigate('/admin/email', { replace: true });
    } catch (err) {
      setError(err.message || 'Unable to verify administrator access. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="login-page">
      <video
        ref={videoRef}
        className="login-page-video"
        src={videoSrc}
        autoPlay
        muted
        playsInline
        preload="auto"
        aria-hidden="true"
      />

      {showForm ? (
        <motion.div
          className="login-page-overlay"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        >
          <motion.div
            className="login-card"
            initial={{ opacity: 0, scale: 0.94, filter: 'blur(18px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            transition={{ duration: 1.15, ease }}
            style={{ borderColor: 'rgba(56, 189, 248, 0.4)' }}
          >
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.4rem' }}>
              <ShieldCheck size={36} color="#38bdf8" />
            </div>
            <motion.h2 className="login-brand" {...fadeUp(0.15)}>
              WeatherGPT
            </motion.h2>
            <motion.p className="login-heading" {...fadeUp(0.35)} style={{ color: '#38bdf8' }}>
              Admin Login
            </motion.p>

            <form className="login-form" onSubmit={handleSubmit}>
              <motion.div className="login-field" {...fadeUp(0.45)}>
                <label htmlFor="admin-email">Admin Email</label>
                <input
                  id="admin-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@weathergpt.ai"
                />
              </motion.div>

              <motion.div className="login-field" {...fadeUp(0.55)}>
                <label htmlFor="admin-phone">Phone Number (Optional)</label>
                <input
                  id="admin-phone"
                  type="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                />
              </motion.div>

              <motion.div className="login-field" {...fadeUp(0.65)}>
                <label htmlFor="admin-password">Password</label>
                <div className="login-password-wrap">
                  <input
                    id="admin-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    className="login-eye"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </motion.div>

              <motion.button
                type="submit"
                className="login-submit"
                style={{
                  background: 'linear-gradient(180deg, rgba(56, 189, 248, 0.4), rgba(2, 132, 199, 0.4))',
                  borderColor: '#38bdf8'
                }}
                disabled={isSubmitting}
                {...fadeUp(0.8)}
              >
                {isSubmitting ? 'VERIFYING ADMIN ACCESS…' : 'ADMIN LOGIN'}
              </motion.button>
            </form>

            <div style={{ marginTop: '1.2rem', textAlign: 'center' }}>
              <button
                type="button"
                className="login-link"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#e0f2fe' }}
                onClick={() => navigate('/login')}
              >
                <ArrowLeft size={14} />
                <span>Back to User Login</span>
              </button>
            </div>

            {error ? <p className="login-message login-error">{error}</p> : null}
          </motion.div>
        </motion.div>
      ) : null}
    </main>
  );
}
