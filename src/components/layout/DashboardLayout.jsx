import React, { useRef, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { DASHBOARD_VIDEO_URL, DASHBOARD_VIDEO_MOBILE_URL } from '../background/videoUrls';
import { BottomNav } from '../navigation/BottomNav';
import { useResponsiveVideoSource } from '../../utils/responsiveVideo';

export function DashboardLayout() {
  const videoRef = useRef(null);
  const videoSrc = useResponsiveVideoSource(DASHBOARD_VIDEO_URL, DASHBOARD_VIDEO_MOBILE_URL);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.loop = true;

    const playPromise = video.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(() => {});
    }
  }, [videoSrc]);

  return (
    <div className="dashboard-root">
      {/* Background Dashboard Video (Exact URL) */}
      <video
        ref={videoRef}
        className="dashboard-bg-video"
        src={videoSrc}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        aria-hidden="true"
      />

      {/* Atmospheric Readability Overlay to guarantee crisp text contrast */}
      <div className="dashboard-readability-overlay" aria-hidden="true" />

      {/* Main Page Content Scroll Container */}
      <div className="dashboard-content-scroll">
        <Outlet />
      </div>

      {/* Floating/Fixed Bottom Navigation */}
      <BottomNav />
    </div>
  );
}
