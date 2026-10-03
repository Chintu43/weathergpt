import React, { useCallback, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { LOGIN_CLOUD_VIDEO_URL } from '../components/background/videoUrls';
import { AnimatedLoginForm } from '../components/auth/AnimatedLoginForm';
import { usePauseCloudAtThree } from '../hooks/usePauseCloudAtThree';
import './LoginPage.css';

export function LoginPage() {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const [showForm, setShowForm] = useState(false);

  usePauseCloudAtThree({
    videoRef,
    active: true,
    onFrozen: () => setShowForm(true)
  });

  const handleAuthSuccess = useCallback(() => {
    navigate('/home', { replace: true });
  }, [navigate]);

  return (
    <main className="login-page">
      <video
        ref={videoRef}
        className="login-page-video"
        src={LOGIN_CLOUD_VIDEO_URL}
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
          <AnimatedLoginForm onSuccess={handleAuthSuccess} />
        </motion.div>
      ) : null}
    </main>
  );
}
