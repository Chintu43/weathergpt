import React, { useRef, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { DASHBOARD_VIDEO_URL } from '../background/videoUrls';
import { BottomNav } from '../navigation/BottomNav';

export function DashboardLayout() {
  const videoRef = useRef(null);

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
  }, []);

  return (
    <div className="dashboard-root">
      {/* Background Dashboard Video (Exact URL) */}
      <video
        ref={videoRef}
        className="dashboard-bg-video"
        src={DASHBOARD_VIDEO_URL}
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
