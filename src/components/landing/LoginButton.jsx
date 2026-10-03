import React from 'react';
import './LoginButton.css';

export function LoginButton({ onClick, disabled = false }) {
  return (
    <button
      type="button"
      className="landing-login-btn"
      onClick={onClick}
      disabled={disabled}
      aria-label="Log in to WeatherGPT"
    >
      LOGIN
    </button>
  );
}
