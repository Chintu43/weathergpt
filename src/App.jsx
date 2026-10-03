import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { LocationProvider } from './context/LocationContext';
import { ProtectedRoute, AdminProtectedRoute } from './routes/ProtectedRoute';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { AdminLoginPage } from './pages/AdminLoginPage';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { AdminDashboardLayout } from './components/layout/AdminDashboardLayout';
import { HomePage } from './pages/HomePage';
import { MapPage } from './pages/MapPage';
import { AlertsPage } from './pages/AlertsPage';
import { TravelPlannerPage } from './pages/TravelPlannerPage';
import { FarmerGptPage } from './pages/FarmerGptPage';
import { ProfilePage } from './pages/ProfilePage';
import { AdminEmailPage } from './pages/AdminEmailPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';

export default function App() {
  return (
    <AuthProvider>
      <LocationProvider>
        <BrowserRouter>
        <Routes>
          {/* Public Pages */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          {/* ─────────────────────────────────────────────────────────────
              Normal User Routes
              Wrapped in ProtectedRoute which:
                - Redirects unauthenticated users → /login
                - Redirects admin users (role=admin) → /admin/email
              Uses DashboardLayout with BottomNav (user navigation)
          ───────────────────────────────────────────────────────────── */}
          <Route
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/home" element={<HomePage />} />
            <Route path="/app" element={<Navigate to="/home" replace />} />
            <Route path="/map" element={<MapPage />} />
            <Route path="/alerts" element={<AlertsPage />} />
            <Route path="/travel" element={<TravelPlannerPage />} />
            <Route path="/travel-planner" element={<Navigate to="/travel" replace />} />
            <Route path="/farmergpt" element={<FarmerGptPage />} />
            <Route path="/farmer" element={<Navigate to="/farmergpt" replace />} />
            <Route path="/ai" element={<Navigate to="/farmergpt" replace />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Route>

          {/* ─────────────────────────────────────────────────────────────
              Admin Portal Routes
              Wrapped in AdminProtectedRoute which:
                - Redirects unauthenticated users → /admin/login
                - Redirects non-admin users (role !== admin) → /admin/login
              Uses AdminDashboardLayout with AdminNav (admin-only navigation)
              Normal user-facing components (Home, Map, Alerts, etc.) are
              intentionally ABSENT from this route group.
          ───────────────────────────────────────────────────────────── */}
          <Route
            element={
              <AdminProtectedRoute>
                <AdminDashboardLayout />
              </AdminProtectedRoute>
            }
          >
            <Route path="/admin/email" element={<AdminEmailPage />} />
            <Route path="/admin/sms" element={<Navigate to="/admin/email" replace />} />
            <Route path="/admin" element={<Navigate to="/admin/email" replace />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      </LocationProvider>
    </AuthProvider>
  );
}
