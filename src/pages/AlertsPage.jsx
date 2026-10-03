import React, { useState, useEffect } from 'react';
import { weatherService } from '../services/weatherService';
import { BackButton } from '../components/common/BackButton';
import {
  ShieldAlert,
  Sparkles,
  MapPin,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Info,
  Filter,
  ExternalLink
} from 'lucide-react';

export function AlertsPage() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterMode, setFilterMode] = useState('all'); // 'all', 'official', 'ai'
  const [officialNote, setOfficialNote] = useState('');
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    async function loadAlerts() {
      setLoading(true);
      const data = await weatherService.getActiveAlerts();
      setAlerts(Array.isArray(data?.all) ? data.all : []);
      setOfficialNote(data.officialUnavailableReason || '');
      setLoadError(data.error || '');
      setLoading(false);
    }
    loadAlerts();
  }, []);

  const filteredAlerts = alerts.filter((alert) => {
    if (filterMode === 'official') return alert.isOfficial;
    if (filterMode === 'ai') return !alert.isOfficial;
    return true;
  });

  return (
    <div className="destination-page alerts-page-container">
      <BackButton />
      {/* Header */}
      <header className="page-header">
        <div>
          <h2 className="page-title">Active Weather Alerts & Advisories</h2>
          <p className="page-subtitle">
            Monitored natural hazards, official disaster warnings & AI meteorological risk advisories
          </p>
        </div>

        {/* Filter Pills */}
        <div className="alerts-filter-bar">
          <button
            type="button"
            className={`filter-btn ${filterMode === 'all' ? 'is-active' : ''}`}
            onClick={() => setFilterMode('all')}
          >
            All Alerts ({alerts.length})
          </button>
          <button
            type="button"
            className={`filter-btn ${filterMode === 'official' ? 'is-active' : ''}`}
            onClick={() => setFilterMode('official')}
          >
            <ShieldAlert size={14} />
            <span>Official Warnings</span>
          </button>
          <button
            type="button"
            className={`filter-btn ${filterMode === 'ai' ? 'is-active' : ''}`}
            onClick={() => setFilterMode('ai')}
          >
            <Sparkles size={14} />
            <span>WeatherGPT Advisories</span>
          </button>
        </div>
      </header>

      <div className="glass-card alerts-info-banner">
        <Info size={18} className="text-sky banner-icon" />
        <p>
          <strong>Official Warnings</strong> come only from government sources such as IMD, CWC or SACHET.{' '}
          <strong>WeatherGPT Advisories</strong> explain available weather observations. They are not official warnings.
        </p>
      </div>
      {officialNote && (
        <div className="dash-empty-box">
          <p>{officialNote}</p>
        </div>
      )}
      {loadError && (
        <div className="dash-empty-box">
          <p>{loadError}</p>
        </div>
      )}

      {/* Alerts Feed */}
      {loading ? (
        <div className="glass-card loading-state">
          <div className="skeleton-spinner" />
          <p className="loading-text">Synchronizing national alert telemetry…</p>
        </div>
      ) : filteredAlerts.length === 0 ? (
        <div className="glass-card empty-state">
          <CheckCircle2 size={36} color="#34d399" />
          <h3>No Active Alerts Found</h3>
          <p>There are currently no active warnings matching this filter criteria.</p>
        </div>
      ) : (
        <div className="alerts-cards-stack">
          {filteredAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`glass-card detailed-alert-card ${
                alert.isOfficial ? 'is-official' : 'is-advisory'
              }`}
            >
              <div className="alert-card-header">
                <div className="alert-badges-group">
                  {alert.isOfficial ? (
                    <span className="official-pill">
                      <ShieldAlert size={14} />
                      <span>OFFICIAL WARNING</span>
                    </span>
                  ) : (
                    <span className="ai-pill">
                      <Sparkles size={14} />
                      <span>WEATHERGPT ADVISORY</span>
                    </span>
                  )}
                  <span
                    className="severity-pill"
                    style={{
                      color: alert.severityColor,
                      borderColor: `${alert.severityColor}66`,
                      backgroundColor: `${alert.severityColor}18`
                    }}
                  >
                    {alert.severity}
                  </span>
                </div>

                <div className="alert-timing-group">
                  <span className="issued-txt">
                    <Clock size={13} />
                    Issued: {alert.issuedTime}
                  </span>
                  <span className="valid-txt">Valid: {alert.validUntil}</span>
                </div>
              </div>

              <h3 className="alert-type-heading">{alert.type}</h3>

              <div className="alert-affected-area">
                <MapPin size={15} className="text-sky" />
                <span>Affected Region: {alert.affectedArea}</span>
              </div>

              <p className="alert-body-copy">{alert.description}</p>

              <div className="alert-card-footer">
                <span className="alert-origin-source">
                  Authoritative Authority: <strong>{alert.source}</strong>
                </span>
                <span className="alert-live-tag">
                  <span className="live-dot" />
                  Active Telemetry
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
