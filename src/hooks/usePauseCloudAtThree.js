import { useEffect, useRef } from 'react';

const FREEZE_AT_SECONDS = 3;

export function usePauseCloudAtThree({ videoRef, active, onFrozen }) {
  const onFrozenRef = useRef(onFrozen);
  onFrozenRef.current = onFrozen;

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !active) return undefined;

    let playbackStarted = false;
    let frozen = false;
    let rafId = 0;

    const freezeFrame = () => {
      if (frozen) return;
      frozen = true;
      cancelAnimationFrame(rafId);

      const duration = Number.isFinite(video.duration) ? video.duration : FREEZE_AT_SECONDS;
      const freezeTime = Math.min(FREEZE_AT_SECONDS, duration);

      video.pause();
      video.loop = false;

      const applyFreezeTime = () => {
        try {
          video.currentTime = freezeTime;
        } catch {
          /* ignore seek errors while metadata is still settling */
        }
      };

      applyFreezeTime();
      onFrozenRef.current?.();
    };

    const watchPlaybackTime = () => {
      if (!playbackStarted || frozen) return;
      if (video.currentTime >= FREEZE_AT_SECONDS) {
        freezeFrame();
        return;
      }
      rafId = requestAnimationFrame(watchPlaybackTime);
    };

    const handlePlaying = () => {
      if (frozen || playbackStarted) return;
      playbackStarted = true;
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(watchPlaybackTime);
    };

    const handleTimeUpdate = () => {
      if (!playbackStarted || frozen) return;
      if (video.currentTime >= FREEZE_AT_SECONDS) freezeFrame();
    };

    const handleEnded = () => {
      if (!playbackStarted || frozen) return;
      freezeFrame();
    };

    const startFromBeginning = () => {
      video.loop = false;
      video.muted = true;
      video.defaultMuted = true;
      video.playsInline = true;

      const playFromStart = () => {
        const playPromise = video.play();
        if (playPromise && typeof playPromise.catch === 'function') {
          playPromise.catch(() => {});
        }
      };

      if (video.currentTime > 0.01) {
        const onSeeked = () => {
          video.removeEventListener('seeked', onSeeked);
          playFromStart();
        };
        video.addEventListener('seeked', onSeeked);
        try {
          video.currentTime = 0;
        } catch {
          playFromStart();
        }
      } else {
        playFromStart();
      }
    };

    video.addEventListener('playing', handlePlaying);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('ended', handleEnded);

    startFromBeginning();

    return () => {
      cancelAnimationFrame(rafId);
      video.removeEventListener('playing', handlePlaying);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('ended', handleEnded);
    };
  }, [active, videoRef]);
}
