import React, { useEffect, useRef } from 'react';
import { useResponsiveVideoSource } from '../../utils/responsiveVideo';

export function BackgroundVideo({
  src,
  mobileSrc,
  className = 'app-background-video',
  loop = true,
  preload = 'auto',
  opacity = 1,
  videoRef,
  onPlaying
}) {
  const internalRef = useRef(null);
  const resolvedRef = videoRef || internalRef;
  const activeSrc = useResponsiveVideoSource(src, mobileSrc);

  useEffect(() => {
    const video = resolvedRef.current;
    if (!video) return;

    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.loop = loop;

    const tryPlay = () => {
      if (!loop) return;
      const playPromise = video.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(() => {});
      }
    };

    const handlePlaying = () => {
      if (onPlaying) onPlaying();
    };

    if (loop) tryPlay();

    video.addEventListener('canplay', tryPlay);
    video.addEventListener('loadeddata', tryPlay);
    video.addEventListener('playing', handlePlaying);

    return () => {
      video.removeEventListener('canplay', tryPlay);
      video.removeEventListener('loadeddata', tryPlay);
      video.removeEventListener('playing', handlePlaying);
    };
  }, [activeSrc, loop, onPlaying, resolvedRef]);

  return (
    <video
      ref={resolvedRef}
      className={className}
      src={activeSrc}
      autoPlay={loop}
      muted
      loop={loop}
      playsInline
      preload={preload}
      aria-hidden="true"
      style={{ opacity }}
    />
  );
}
