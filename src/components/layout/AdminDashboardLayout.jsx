import React, { useRef, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { DASHBOARD_VIDEO_URL } from '../background/videoUrls';
import { AdminNav } from '../navigation/AdminNav';

/**
 * AdminDashboardLayout
 *
 * Layout exclusively for the Admin Portal.
 * Renders the same atmospheric background video as DashboardLayout,
 * but shows AdminNav instead of the user-facing BottomNav.
 *
 * Normal users NEVER see this layout — App.jsx routing + ProtectedRoute guards
 * ensure only role="admin" users reach these routes.
 */
export function AdminDashboardLayout() {
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
      {/* Background Dashboard Video */}
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

      {/* Atmospheric Readability Overlay */}
      <div className="dashboard-readability-overlay" aria-hidden="true" />

      {/* Admin Top Navigation Bar */}
      <AdminNav />

      {/* Admin Page Content */}
      <div className="dashboard-content-scroll admin-layout-content">
        <Outlet />
      </div>
    </div>
  );
}
