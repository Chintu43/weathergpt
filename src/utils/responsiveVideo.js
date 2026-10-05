import { useState, useEffect } from 'react';

/**
 * Determines whether to serve the landscape video or 9:16 portrait video based on
 * viewport aspect ratio and orientation.
 *
 * Expected behavior:
 * - Desktop/laptop landscape  -> original landscape video
 * - Tablet landscape          -> original landscape video
 * - Tablet portrait           -> 9:16 portrait video
 * - Mobile portrait           -> 9:16 portrait video
 * - Mobile landscape          -> original landscape video
 */
export function getResponsiveVideoSource(desktopSrc, mobileSrc) {
  if (typeof window === 'undefined' || !mobileSrc) return desktopSrc;

  const w = window.innerWidth;
  const h = window.innerHeight;

  // Viewport is portrait if height > width
  const isPortrait = h > w;

  // Portrait viewports (mobile portrait & tablet portrait) get 9:16 mobile video.
  // All landscape viewports (mobile landscape, tablet landscape, desktop/laptop) get landscape video.
  return isPortrait ? mobileSrc : desktopSrc;
}

export function useResponsiveVideoSource(desktopSrc, mobileSrc) {
  const [videoSrc, setVideoSrc] = useState(() =>
    getResponsiveVideoSource(desktopSrc, mobileSrc)
  );

  useEffect(() => {
    if (!mobileSrc) {
      setVideoSrc(desktopSrc);
      return;
    }

    const updateSource = () => {
      setVideoSrc(getResponsiveVideoSource(desktopSrc, mobileSrc));
    };

    updateSource();

    window.addEventListener('resize', updateSource);
    window.addEventListener('orientationchange', updateSource);

    const mql = window.matchMedia('(orientation: portrait)');
    if (mql.addEventListener) {
      mql.addEventListener('change', updateSource);
    } else if (mql.addListener) {
      mql.addListener(updateSource);
    }

    return () => {
      window.removeEventListener('resize', updateSource);
      window.removeEventListener('orientationchange', updateSource);
      if (mql.removeEventListener) {
        mql.removeEventListener('change', updateSource);
      } else if (mql.removeListener) {
        mql.removeListener(updateSource);
      }
    };
  }, [desktopSrc, mobileSrc]);

  return videoSrc;
}
