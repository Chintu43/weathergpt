import React from 'react';
import { useTranslation } from '../../i18n/LanguageContext';
import './LoginButton.css';

export function LoginButton({ onClick, disabled = false }) {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      className="landing-login-btn"
      onClick={onClick}
      disabled={disabled}
      aria-label="Log in to WeatherGPT"
    >
      {t('landing.loginBtn', 'LOGIN')}
    </button>
  );
}
