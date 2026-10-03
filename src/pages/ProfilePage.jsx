import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { BackButton } from '../components/common/BackButton';
import {
  User,
  Mail,
  Shield,
  MapPin,
  LogOut,
  Sliders,
  Bell,
  Thermometer,
  Radio,
  CheckCircle2
} from 'lucide-react';

export function ProfilePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [tempUnit, setTempUnit] = useState('Celsius (°C)');
  const [alertsEnabled, setAlertsEnabled] = useState(true);
  const [radarRefresh, setRadarRefresh] = useState('5 Minutes');
  const [isSaved, setIsSaved] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const handleSavePreferences = () => {
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  return (
    <div className="destination-page profile-page-container">
      <BackButton />
      <header className="page-header">
        <div>
          <h2 className="page-title">User Profile & Intelligence Settings</h2>
          <p className="page-subtitle">Manage credentials, telemetry feeds, and station preferences</p>
        </div>
      </header>

      <div className="profile-grid-layout">
        {/* User Card */}
        <div className="glass-card profile-info-card">
          <div className="profile-avatar-circle">
            <User size={42} className="text-sky" />
          </div>
          <h3 className="profile-name">{user?.name || 'Weather Analyst'}</h3>
          <span className="profile-role-badge">{user?.role || 'Senior Meteorologist'}</span>

          <div className="profile-detail-rows">
            <div className="detail-row">
              <Mail size={16} className="text-sky" />
              <span>{user?.email || 'demo@weathergpt.ai'}</span>
            </div>
            <div className="detail-row">
              <MapPin size={16} className="text-sky" />
              <span>{user?.location || 'New Delhi, India'}</span>
            </div>
            <div className="detail-row">
              <Shield size={16} className="text-sky" />
              <span>Access Level: Level-4 Telemetry</span>
            </div>
          </div>

          <button
            type="button"
            className="logout-button"
            onClick={handleLogout}
            aria-label="Sign out of WeatherGPT session"
          >
            <LogOut size={16} />
            <span>Sign Out Session</span>
          </button>
        </div>

        {/* Preferences Card */}
        <div className="glass-card profile-settings-card">
          <div className="settings-header">
            <Sliders size={20} className="text-sky" />
            <h3>Meteorological Station Preferences</h3>
          </div>

          <div className="settings-field-group">
            <label className="settings-label">
              <Thermometer size={16} />
              <span>Temperature Metric Unit</span>
            </label>
            <div className="pill-toggle-group">
              {['Celsius (°C)', 'Fahrenheit (°F)'].map((unit) => (
                <button
                  key={unit}
                  type="button"
                  className={`toggle-option-btn ${tempUnit === unit ? 'is-selected' : ''}`}
                  onClick={() => setTempUnit(unit)}
                >
                  {unit}
                </button>
              ))}
            </div>
          </div>

          <div className="settings-field-group">
            <label className="settings-label">
              <Bell size={16} />
              <span>Active Hazard & Cyclone Notifications</span>
            </label>
            <div className="switch-toggle-row">
              <span>{alertsEnabled ? 'Push Notifications Active' : 'Notifications Muted'}</span>
              <button
                type="button"
                className={`switch-track ${alertsEnabled ? 'is-on' : ''}`}
                onClick={() => setAlertsEnabled(!alertsEnabled)}
                aria-label="Toggle Hazard Notifications"
              >
                <div className="switch-thumb" />
              </button>
            </div>
          </div>

          <div className="settings-field-group">
            <label className="settings-label">
              <Radio size={16} />
              <span>Satellite & Radar Polling Frequency</span>
            </label>
            <select
              value={radarRefresh}
              onChange={(e) => setRadarRefresh(e.target.value)}
              className="settings-select-input"
            >
              <option value="Realtime Stream">Realtime Live Stream</option>
              <option value="5 Minutes">5 Minutes (Recommended)</option>
              <option value="15 Minutes">15 Minutes</option>
              <option value="Manual Only">Manual Refresh Only</option>
            </select>
          </div>

          <div className="settings-actions-footer">
            <button
              type="button"
              className="save-preferences-btn"
              onClick={handleSavePreferences}
            >
              {isSaved ? (
                <>
                  <CheckCircle2 size={16} color="#34d399" />
                  <span>Preferences Saved!</span>
                </>
              ) : (
                <span>Save Preferences</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
