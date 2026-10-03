import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ShieldCheck, Mail, LogOut } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import '../../pages/AdminNav.css';

/**
 * AdminNav
 *
 * Top navigation bar exclusively for the Admin Portal.
 * Contains only admin-relevant navigation items.
 * Normal user nav items (Home, Map, Alerts, Travel, FarmerGPT, Profile)
 * are intentionally ABSENT from this component.
 */
export function AdminNav() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/admin/login', { replace: true });
  };

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path);

  return (
    <header className="admin-nav-bar" role="banner">
      <div className="admin-nav-inner">
        {/* Brand */}
        <div className="admin-nav-brand">
          <ShieldCheck size={20} className="admin-nav-brand-icon" aria-hidden="true" />
          <div className="admin-nav-brand-text">
            <span className="admin-nav-brand-title">WeatherGPT</span>
            <span className="admin-nav-brand-badge">Admin Portal</span>
          </div>
        </div>

        {/* Nav Links */}
        <nav className="admin-nav-links" aria-label="Admin Navigation">
          <button
            type="button"
            className={`admin-nav-link ${isActive('/admin/email') ? 'is-active' : ''}`}
            onClick={() => navigate('/admin/email')}
            aria-label="Navigate to Weather Email administration"
          >
            <Mail size={16} aria-hidden="true" />
            <span>Weather Email</span>
          </button>
        </nav>

        {/* Admin identity + Logout */}
        <div className="admin-nav-right">
          {user?.email && (
            <span className="admin-nav-user-email" title={user.email}>
              {user.name || user.email}
            </span>
          )}
          <button
            type="button"
            className="admin-nav-logout-btn"
            onClick={handleLogout}
            aria-label="Sign out of Admin Portal"
          >
            <LogOut size={16} aria-hidden="true" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </header>
  );
}
