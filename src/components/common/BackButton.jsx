import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export function BackButton({ fallback = '/home', className = '' }) {
  const navigate = useNavigate();

  const handleBack = () => {
    // If there is history state from prior navigation, go back
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate(fallback);
    }
  };

  return (
    <button
      type="button"
      className={`app-back-btn ${className}`}
      onClick={handleBack}
      aria-label="Go back to previous page"
      title="Go back"
    >
      <ArrowLeft size={16} />
      <span>Back</span>
    </button>
  );
}
