import React, { useCallback, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { BackgroundVideo } from '../components/background/BackgroundVideo';
import { LANDING_VIDEO_URL, LOGIN_CLOUD_VIDEO_URL } from '../components/background/videoUrls';
import { WeatherGPTIntro } from '../components/landing/WeatherGPTIntro';
import { LoginButton } from '../components/landing/LoginButton';
import { AnimatedLoginForm } from '../components/auth/AnimatedLoginForm';
import { usePauseCloudAtThree } from '../hooks/usePauseCloudAtThree';

const PHASE = {
  LANDING: 'LANDING',
  CLOUD_PLAYING: 'CLOUD_PLAYING',
  LOGIN: 'LOGIN'
};

export function LandingPage() {
  const navigate = useNavigate();
  const cloudVideoRef = useRef(null);
  const [phase, setPhase] = useState(PHASE.LANDING);

  const cloudActive = phase !== PHASE.LANDING;

  usePauseCloudAtThree({
    videoRef: cloudVideoRef,
    active: phase === PHASE.CLOUD_PLAYING,
    onFrozen: () => setPhase(PHASE.LOGIN)
  });

  const handleLoginClick = () => {
    if (phase !== PHASE.LANDING) return;
    navigate('/login');
  };

  const handleAuthSuccess = useCallback(() => {
    navigate('/home', { replace: true });
  }, [navigate]);

  return (
    <main className="landing-stage">
      <BackgroundVideo
        src={LANDING_VIDEO_URL}
        className="app-background-video landing-video"
        loop
        opacity={cloudActive ? 0 : 1}
      />

      <BackgroundVideo
        src={LOGIN_CLOUD_VIDEO_URL}
        className="app-background-video cloud-video"
        loop={false}
        preload="auto"
        opacity={cloudActive ? 1 : 0}
        videoRef={cloudVideoRef}
      />

      <header className={`landing-topbar ${phase === PHASE.LANDING ? 'is-visible' : 'is-hidden'}`}>
        <span className="landing-topbar-brand">WeatherGPT</span>
        <LoginButton onClick={handleLoginClick} disabled={phase !== PHASE.LANDING} />
      </header>

      <AnimatePresence>
        {phase === PHASE.LANDING && (
          <motion.div
            key="landing-content"
            className="landing-content"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, y: -10, filter: 'blur(6px)' }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          >
            <WeatherGPTIntro />
          </motion.div>
        )}
      </AnimatePresence>

      {phase === PHASE.LANDING && (
        <footer className="landing-footer">
          WeatherGPT © 2026 — AI Meteorological Warning & Risk Assessment Platform
        </footer>
      )}

      <AnimatePresence>
        {phase === PHASE.LOGIN && (
          <motion.div
            key="login-ui"
            className="login-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          >
            <AnimatedLoginForm onSuccess={handleAuthSuccess} />
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
