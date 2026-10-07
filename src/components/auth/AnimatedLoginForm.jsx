import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { useTranslation } from '../../i18n/LanguageContext';

const ease = [0.16, 1, 0.3, 1];

const fadeUp = (delay) => ({
  initial: { opacity: 0, y: 16, filter: 'blur(10px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
  transition: { duration: 0.9, delay, ease }
});

export function AnimatedLoginForm({ onSuccess }) {
  const { t } = useTranslation();
  const { login, register } = useAuth();
  const [mode, setMode] = useState('login'); // 'login' | 'register' | 'forgot'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setInfo('');

    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }

    if (mode === 'forgot') {
      try {
        setIsSubmitting(true);
        const res = await fetch(`${backendUrl}/api/auth/forgot-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim() })
        });
        const data = await res.json();
        setInfo(data.message || 'If an account exists for this email, a password reset link has been sent.');
      } catch (err) {
        console.error('[AnimatedLoginForm] Forgot password request error:', err);
        setError('Unable to connect to password reset service.');
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    if (mode === 'register' && !name.trim()) {
      setError('Please enter your name.');
      return;
    }

    if (!password) {
      setError('Please fill in all required fields.');
      return;
    }

    if (!phone.trim()) {
      setError('Please enter your phone number.');
      return;
    }

    const digitsOnly = phone.replace(/\D/g, '');
    if (digitsOnly.length < 7 || digitsOnly.length > 15) {
      setError('Please enter a valid phone number.');
      return;
    }

    if (mode === 'register' && password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    try {
      setIsSubmitting(true);
      if (mode === 'register') {
        await register(name, email, password, phone);
      } else {
        await login(email, password, phone);
      }
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err.message || 'Unable to save user information. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const switchMode = (nextMode) => {
    setMode(nextMode);
    setError('');
    setInfo('');
  };

  return (
    <motion.div
      className="login-card"
      initial={{ opacity: 0, scale: 0.94, filter: 'blur(18px)' }}
      animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
      transition={{ duration: 1.15, ease }}
    >
      <motion.h2 className="login-brand" {...fadeUp(0.15)}>
        WeatherGPT
      </motion.h2>
      <motion.p className="login-heading" {...fadeUp(0.35)}>
        {mode === 'login' ? t('login.title') : mode === 'register' ? t('login.createAccountTitle') : t('login.forgotPassword')}
      </motion.p>

      <form className="login-form" onSubmit={handleSubmit}>
        <AnimatePresence initial={false}>
          {mode === 'register' && (
            <motion.div className="login-field" {...fadeUp(0.45)} exit={{ opacity: 0, height: 0 }}>
              <label htmlFor="login-name">{t('login.nameLabel')}</label>
              <input
                id="login-name"
                type="text"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('login.namePlaceholder')}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div className="login-field" {...fadeUp(mode === 'register' ? 0.55 : 0.5)}>
          <label htmlFor="login-email">{t('login.emailLabel')}</label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t('login.emailPlaceholder')}
          />
        </motion.div>

        {mode !== 'forgot' && (
          <>
            <motion.div className="login-field" {...fadeUp(mode === 'register' ? 0.65 : 0.6)}>
              <label htmlFor="login-phone">{t('login.phoneLabel')}</label>
              <input
                id="login-phone"
                type="tel"
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={t('login.phonePlaceholder')}
              />
            </motion.div>

            <motion.div className="login-field" {...fadeUp(mode === 'register' ? 0.75 : 0.7)}>
              <label htmlFor="login-password">{t('login.passwordLabel')}</label>
              <div className="login-password-wrap">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  className="login-eye"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </motion.div>
          </>
        )}

        <motion.button
          type="submit"
          className="login-submit"
          disabled={isSubmitting}
          {...fadeUp(0.9)}
        >
          {isSubmitting
            ? t('common.loading')
            : mode === 'login'
            ? t('login.loginBtn')
            : mode === 'register'
            ? t('login.registerLink')
            : t('login.forgotPassword')}
        </motion.button>
      </form>

      <motion.div className="login-links" {...fadeUp(1.05)}>
        {mode === 'forgot' ? (
          <button type="button" className="login-link" onClick={() => switchMode('login')}>
            {t('common.back')}
          </button>
        ) : mode === 'login' ? (
          <>
            <button type="button" className="login-link" onClick={() => switchMode('register')}>
              {t('login.registerLink')}
            </button>
            <button type="button" className="login-link" onClick={() => switchMode('forgot')}>
              {t('login.forgotPassword')}
            </button>
          </>
        ) : (
          <button type="button" className="login-link" onClick={() => switchMode('login')}>
            {t('common.login')}
          </button>
        )}
      </motion.div>

      <div style={{ marginTop: '0.9rem', textAlign: 'center' }}>
        <button
          type="button"
          className="login-link"
          style={{ color: '#38bdf8', fontWeight: '600' }}
          onClick={() => (window.location.href = '/admin/login')}
        >
          {t('login.adminLoginBtn')}
        </button>
      </div>

      <motion.p
        className="login-email-notice"
        {...fadeUp(1.1)}
        style={{
          marginTop: '0.9rem',
          fontSize: '0.785rem',
          color: 'rgba(224, 242, 254, 0.72)',
          textAlign: 'center',
          lineHeight: 1.45,
          maxWidth: '320px',
          marginLeft: 'auto',
          marginRight: 'auto',
          letterSpacing: '0.01em'
        }}
      >
        After entering your email, you will receive alerts and updates about weather conditions.
      </motion.p>

      {error ? <p className="login-message login-error">{error}</p> : null}
      {info ? <p className="login-message login-info">{info}</p> : null}
    </motion.div>
  );
}
