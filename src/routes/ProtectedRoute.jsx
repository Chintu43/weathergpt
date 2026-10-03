import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

/**
 * ProtectedRoute
 *
 * Guards normal user routes (Home, Map, Alerts, Travel, FarmerGPT, Profile).
 *
 * Rules:
 * - Not authenticated → redirect to /login
 * - Authenticated AND role === 'admin' → redirect to /admin/email
 *   (Admin users belong in the Admin Portal, not the normal user interface)
 * - Authenticated AND normal user → allow through
 */
export function ProtectedRoute({ children }) {
  const { isAuthenticated, user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="auth-loading">
        <p>Loading WeatherGPT…</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Admins must use the Admin Portal, not the normal user interface
  if (user?.role === 'admin') {
    return <Navigate to="/admin/email" replace />;
  }

  return children;
}

/**
 * AdminProtectedRoute
 *
 * Guards admin-only routes (/admin/email, /admin/...).
 *
 * Rules:
 * - Not authenticated → redirect to /admin/login
 * - Authenticated but role !== 'admin' → redirect to /admin/login
 *   (Normal users cannot access Admin Portal routes)
 * - Authenticated AND role === 'admin' → allow through
 */
export function AdminProtectedRoute({ children }) {
  const { isAuthenticated, user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="auth-loading">
        <p>Verifying Administrator Access…</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  if (user?.role !== 'admin') {
    return <Navigate to="/admin/login" replace />;
  }

  return children;
}
