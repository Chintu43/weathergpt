import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Mail,
  Users,
  CheckCircle2,
  AlertCircle,
  Search,
  Filter,
  Send,
  Eye,
  X,
  ExternalLink,
  ShieldAlert,
  Info,
  AlertTriangle,
  RefreshCw,
  PlusSquare,
  Loader
} from 'lucide-react';
import { BackButton } from '../components/common/BackButton';
import { useAuth } from '../auth/AuthContext';
import './AdminEmailPage.css';
import './AdminNav.css';

const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// ─── Severity pill helper ─────────────────────────────────────────────────────
function SeverityPill({ severity }) {
  const s = (severity || '').toLowerCase();
  const cls =
    s.includes('red') || s.includes('extreme') || s.includes('severe')
      ? 'severity-red'
      : s.includes('orange') || s.includes('high') || s.includes('moderate')
      ? 'severity-orange'
      : s.includes('yellow') || s.includes('low')
      ? 'severity-yellow'
      : 'severity-unknown';
  return (
    <span className={`india-alert-severity-pill ${cls}`}>
      {severity || 'Unknown'}
    </span>
  );
}

// ─── India Alerts Section Component ──────────────────────────────────────────
function IndiaAlertsSection({ adminHeaders, onInsertAlert }) {
  const [alertState, setAlertState] = useState({ status: 'idle' }); // idle | loading | done | error
  const [insertedSet, setInsertedSet] = useState(new Set());

  const fetchAlerts = useCallback(async () => {
    setAlertState({ status: 'loading' });
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/alerts/india`, {
        headers: adminHeaders
      });
      if (!res.ok) {
        setAlertState({ status: 'error', reason: 'Could not connect to alerts backend.' });
        return;
      }
      const data = await res.json();
      setAlertState({ status: 'done', data });
    } catch (err) {
      console.error('[IndiaAlerts] Fetch error:', err);
      setAlertState({ status: 'error', reason: 'Live alert data is currently unavailable.' });
    }
  }, [adminHeaders]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const handleInsert = (alert, idx) => {
    // Build a structured text block from the real alert data — no fabrication
    const lines = [
      `⚠️ ACTIVE WEATHER ALERT`,
      `Alert Type: ${alert.alertType}`,
      alert.severity ? `Severity: ${alert.severity}` : null,
      alert.affectedAreas ? `Affected Areas: ${alert.affectedAreas}` : null,
      alert.issued ? `Issued: ${new Date(alert.issued).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}` : null,
      alert.expires ? `Expires: ${new Date(alert.expires).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}` : null,
      alert.source ? `Source: ${alert.source}` : null,
      alert.description ? `\n${alert.description}` : null,
    ]
      .filter(Boolean)
      .join('\n');

    onInsertAlert(lines);
    setInsertedSet((prev) => new Set(prev).add(idx));
  };

  return (
    <section className="india-alerts-section" aria-label="Active India Weather Alerts">
      <div className="india-alerts-header">
        <div className="india-alerts-header-left">
          <AlertTriangle size={16} color="#fbbf24" aria-hidden="true" />
          <h3 className="india-alerts-title">Active India Weather Alerts</h3>
          {alertState.status === 'done' && alertState.data?.provider && alertState.data.provider !== 'none' && (
            <span className="india-alerts-source-badge">{alertState.data.provider}</span>
          )}
        </div>
        <button
          type="button"
          className="india-alerts-refresh-btn"
          onClick={fetchAlerts}
          disabled={alertState.status === 'loading'}
          aria-label="Refresh India weather alerts"
        >
          <RefreshCw size={13} aria-hidden="true" />
          Refresh
        </button>
      </div>

      <div className="india-alerts-body">
        {/* Loading */}
        {alertState.status === 'idle' || alertState.status === 'loading' ? (
          <div className="india-alerts-loading" role="status" aria-live="polite">
            <Loader size={16} aria-hidden="true" />
            <span>Fetching India weather alerts…</span>
          </div>
        ) : alertState.status === 'error' ? (
          /* Network / auth error */
          <div className="india-alerts-unavailable" role="alert">
            <AlertCircle size={16} aria-hidden="true" />
            <div>
              <div>Live alert data is currently unavailable.</div>
              {alertState.reason && (
                <div className="india-alerts-unavailable-reason">{alertState.reason}</div>
              )}
            </div>
          </div>
        ) : alertState.data?.available === false ? (
          /* Provider not configured or fetch failed */
          <div className="india-alerts-unavailable" role="status">
            <Info size={16} aria-hidden="true" />
            <div>
              <div>
                {alertState.data.alerts?.length === 0 && !alertState.data.providerConfigured
                  ? 'No active India-wide weather alerts available.'
                  : 'Live alert data is currently unavailable.'}
              </div>
              {alertState.data.reason && (
                <div className="india-alerts-unavailable-reason">{alertState.data.reason}</div>
              )}
            </div>
          </div>
        ) : alertState.data?.alerts?.length === 0 ? (
          /* Provider configured but returned 0 alerts */
          <div className="india-alerts-empty" role="status">
            <CheckCircle2 size={16} color="#34d399" aria-hidden="true" />
            <span>No active alerts from {alertState.data.provider} for India at this time.</span>
          </div>
        ) : (
          /* Alert cards */
          alertState.data.alerts.map((alert, idx) => (
            <div key={idx} className="india-alert-card">
              <div className="india-alert-card-header">
                <span className="india-alert-type-label">{alert.alertType}</span>
                <SeverityPill severity={alert.severity} />
              </div>

              <div className="india-alert-meta-grid">
                {alert.affectedAreas && (
                  <div className="india-alert-meta-row">
                    <span className="india-alert-meta-label">Affected Areas</span>
                    <span className="india-alert-meta-value">{alert.affectedAreas}</span>
                  </div>
                )}
                {alert.issued && (
                  <div className="india-alert-meta-row">
                    <span className="india-alert-meta-label">Issued</span>
                    <span className="india-alert-meta-value">
                      {new Date(alert.issued).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                    </span>
                  </div>
                )}
                {alert.expires && (
                  <div className="india-alert-meta-row">
                    <span className="india-alert-meta-label">Expires</span>
                    <span className="india-alert-meta-value">
                      {new Date(alert.expires).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                    </span>
                  </div>
                )}
                {alert.source && (
                  <div className="india-alert-meta-row">
                    <span className="india-alert-meta-label">Source</span>
                    <span className="india-alert-meta-value">{alert.source}</span>
                  </div>
                )}
              </div>

              {alert.description && (
                <p className="india-alert-description">{alert.description}</p>
              )}

              {insertedSet.has(idx) ? (
                <span className="india-alert-inserted-notice">
                  <CheckCircle2 size={13} aria-hidden="true" />
                  Inserted into message
                </span>
              ) : (
                <button
                  type="button"
                  className="india-alert-insert-btn"
                  onClick={() => handleInsert(alert, idx)}
                  aria-label={`Insert ${alert.alertType} alert into email message`}
                >
                  <PlusSquare size={14} aria-hidden="true" />
                  Insert into Email
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </section>
  );
}

// ─── Main AdminEmailPage Component ───────────────────────────────────────────
export function AdminEmailPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedUserEmails, setSelectedUserEmails] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Email Composer State
  const [subject, setSubject] = useState('WeatherGPT Weather Update');
  const [message, setMessage] = useState('');
  const [includeDashboardLink, setIncludeDashboardLink] = useState(true);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [sending, setSending] = useState(false);
  const [dispatchResult, setDispatchResult] = useState(null);

  // Resend Provider Status
  const [emailProviderStatus, setEmailProviderStatus] = useState(null);

  const userRole = user?.role || 'admin';
  const userEmail = user?.email || '';
  const dashboardUrl = import.meta.env.VITE_WEATHERGPT_DASHBOARD_URL || `${window.location.origin}/home`;

  // Admin auth headers — sent to all admin API endpoints
  const adminHeaders = useMemo(() => ({
    'Content-Type': 'application/json',
    'x-user-role': userRole,
    'x-user-email': userEmail
  }), [userRole, userEmail]);

  // Fetch users and email provider status on mount
  useEffect(() => {
    async function fetchAdminUsers() {
      try {
        setLoading(true);
        setError('');
        const res = await fetch(`${BACKEND_URL}/api/admin/users`, {
          headers: adminHeaders
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          setError(data.message || 'Unable to load users.');
          setUsers([]);
        } else {
          setUsers(data.users || []);
        }
      } catch (err) {
        console.error('[AdminEmailPage] Error fetching users:', err);
        setError('Could not connect to backend admin service.');
      } finally {
        setLoading(false);
      }
    }

    async function fetchProviderStatus() {
      try {
        const res = await fetch(`${BACKEND_URL}/api/admin/email/status`, {
          headers: adminHeaders
        });
        if (res.ok) {
          const data = await res.json();
          setEmailProviderStatus(data);
        }
      } catch (err) {
        console.warn('[AdminEmailPage] Could not fetch email provider status:', err.message);
      }
    }

    fetchAdminUsers();
    fetchProviderStatus();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userEmail, userRole]);

  // Valid email regex
  const isValidEmail = (email) =>
    email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  // Filter users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (u.name && u.name.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.city && u.city.toLowerCase().includes(q)) ||
        (u.state && u.state.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      if (statusFilter === 'ADMIN') return u.role === 'admin';
      if (statusFilter === 'USER') return u.role !== 'admin';
      if (statusFilter === 'VALID_EMAIL') return isValidEmail(u.email);

      return true;
    });
  }, [users, searchQuery, statusFilter]);

  const eligibleVisibleUsers = useMemo(
    () => filteredUsers.filter((u) => isValidEmail(u.email)),
    [filteredUsers]
  );

  // Selection handlers
  const isAllEligibleSelected =
    eligibleVisibleUsers.length > 0 &&
    eligibleVisibleUsers.every((u) => selectedUserEmails.includes(u.email));

  const handleToggleSelectAll = () => {
    if (isAllEligibleSelected) {
      const visibleEmails = eligibleVisibleUsers.map((u) => u.email);
      setSelectedUserEmails((prev) => prev.filter((e) => !visibleEmails.includes(e)));
    } else {
      const visibleEmails = eligibleVisibleUsers.map((u) => u.email);
      setSelectedUserEmails((prev) => Array.from(new Set([...prev, ...visibleEmails])));
    }
  };

  const handleToggleSelectUser = (email, isEligible) => {
    if (!isEligible) return;
    setSelectedUserEmails((prev) =>
      prev.includes(email) ? prev.filter((item) => item !== email) : [...prev, email]
    );
  };

  // Metrics
  const totalCount = users.length;
  const withEmailCount = users.filter((u) => isValidEmail(u.email)).length;
  const adminCount = users.filter((u) => u.role === 'admin').length;
  const selectedCount = selectedUserEmails.length;

  // ── Insert alert text into message composer ──────────────────────────────
  const handleInsertAlert = useCallback((alertText) => {
    setMessage((prev) => {
      const trimmed = prev.trim();
      return trimmed ? `${trimmed}\n\n${alertText}` : alertText;
    });
  }, []);

  // Compiled preview text
  const compiledMessageText = useMemo(() => {
    if (!message.trim()) return '';
    return includeDashboardLink
      ? `${message.trim()}\n\nCheck live updates:\n${dashboardUrl}`
      : message.trim();
  }, [message, includeDashboardLink, dashboardUrl]);

  // Generate preview
  const handleOpenPreview = async () => {
    if (selectedUserEmails.length === 0) {
      alert('Please select at least one recipient user.');
      return;
    }
    if (!message.trim()) {
      alert('Please enter an email message body.');
      return;
    }

    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/email/preview`, {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({
          userEmails: selectedUserEmails,
          subject: subject.trim() || 'WeatherGPT Weather Update',
          message: message.trim(),
          includeDashboardLink
        })
      });
      const data = await res.json();
      if (data.success && data.preview) {
        setPreviewData(data.preview);
        setPreviewModalOpen(true);
      } else {
        alert(data.message || 'Failed to generate preview.');
      }
    } catch (err) {
      console.error('Preview error:', err);
      alert('Failed to connect to admin preview API.');
    }
  };

  // Submit Email Send
  const handleSendEmail = async () => {
    if (selectedUserEmails.length === 0 || !message.trim()) return;

    setSending(true);
    setDispatchResult(null);
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/email/send`, {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({
          userEmails: selectedUserEmails,
          subject: subject.trim() || 'WeatherGPT Weather Update',
          message: message.trim(),
          includeDashboardLink
        })
      });
      const data = await res.json();
      setDispatchResult(data);
      setPreviewModalOpen(false);
    } catch (err) {
      console.error('Send error:', err);
      setDispatchResult({
        success: false,
        error: 'DISPATCH_FAILED',
        message: 'Could not connect to backend email dispatch service.'
      });
    } finally {
      setSending(false);
    }
  };

  // Human-readable status helper
  function getDispatchStatusText(result) {
    if (!result) return '';
    if (result.error === 'EMAIL_PROVIDER_NOT_CONFIGURED') {
      return 'Resend API key is not configured. Set RESEND_API_KEY in backend/.env and restart the server.';
    }
    if (result.error === 'RESEND_AUTH_ERROR') {
      return 'Resend authentication failed. Check your RESEND_API_KEY in backend/.env.';
    }
    if (result.error === 'RESEND_DISPATCH_ERROR') {
      return 'Resend rejected the email request. Verify domain/sender verification in Resend dashboard.';
    }
    return result.message || 'Error occurred while dispatching emails.';
  }

  return (
    <div className="destination-page admin-email-page">
      <BackButton />

      {/* Header */}
      <header className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <h2 className="page-title">Weather Email</h2>
            <span className="profile-role-badge" style={{ background: 'rgba(2, 132, 199, 0.25)', borderColor: '#38bdf8', color: '#38bdf8' }}>
              Admin Console
            </span>
          </div>
          <p className="page-subtitle">
            Broadcast meteorological intelligence, alerts, and advisories to registered users via email
          </p>
        </div>

        {/* Resend Provider Status Badge */}
        {emailProviderStatus && (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.4rem 0.85rem',
              borderRadius: '20px',
              fontSize: '0.75rem',
              fontWeight: '600',
              background: emailProviderStatus.apiKeyConfigured
                ? 'rgba(16, 185, 129, 0.15)'
                : 'rgba(245, 158, 11, 0.15)',
              border: `1px solid ${emailProviderStatus.apiKeyConfigured ? 'rgba(16, 185, 129, 0.4)' : 'rgba(245, 158, 11, 0.4)'}`,
              color: emailProviderStatus.apiKeyConfigured ? '#34d399' : '#fbbf24'
            }}
          >
            <span
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                background: emailProviderStatus.apiKeyConfigured ? '#34d399' : '#fbbf24',
                boxShadow: `0 0 8px ${emailProviderStatus.apiKeyConfigured ? '#34d399' : '#fbbf24'}`
              }}
            />
            <span>
              {emailProviderStatus.apiKeyConfigured
                ? `Resend Active (${emailProviderStatus.from})`
                : 'Resend: RESEND_API_KEY Not Configured'}
            </span>
          </div>
        )}
      </header>

      {/* Top Counters Grid */}
      <div className="admin-stats-grid">
        <div className="admin-stat-card">
          <Users size={22} className="text-sky" />
          <div>
            <span className="stat-value">{loading ? '…' : totalCount}</span>
            <span className="stat-label">Total Users</span>
          </div>
        </div>

        <div className="admin-stat-card">
          <Mail size={22} color="#38bdf8" />
          <div>
            <span className="stat-value">{loading ? '…' : withEmailCount}</span>
            <span className="stat-label">With Email</span>
          </div>
        </div>

        <div className="admin-stat-card">
          <CheckCircle2 size={22} color="#34d399" />
          <div>
            <span className="stat-value">{loading ? '…' : adminCount}</span>
            <span className="stat-label">Admins</span>
          </div>
        </div>

        <div className={`admin-stat-card ${selectedCount > 0 ? 'active-selection' : ''}`}>
          <Send size={22} color={selectedCount > 0 ? '#fbbf24' : '#94a3b8'} />
          <div>
            <span className="stat-value" style={{ color: selectedCount > 0 ? '#fbbf24' : undefined }}>
              {selectedCount}
            </span>
            <span className="stat-label">Selected Recipients</span>
          </div>
        </div>
      </div>

      {/* Main Dual Panel Grid */}
      <div className="admin-main-grid">
        {/* Left Column: Registered Users Table */}
        <div className="admin-panel user-selection-panel">
          <div className="panel-header">
            <h3>Registered Recipients</h3>
            <span className="panel-subtitle">Select users to receive the email notification</span>
          </div>

          {/* Search & Filter Bar */}
          <div className="admin-search-filter-bar">
            <div className="search-input-wrap">
              <Search size={16} className="search-icon" />
              <input
                type="text"
                placeholder="Search by name, email, location…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="admin-search-input"
              />
              {searchQuery && (
                <button
                  type="button"
                  className="clear-search-btn"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="filter-select-wrap">
              <Filter size={16} className="filter-icon" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="admin-filter-select"
              >
                <option value="ALL">All Users</option>
                <option value="VALID_EMAIL">Valid Email Only</option>
                <option value="ADMIN">Admins Only</option>
                <option value="USER">General Users Only</option>
              </select>
            </div>
          </div>

          {/* Table Container */}
          <div className="table-responsive-wrapper">
            {loading ? (
              <div className="table-loading-state">
                <p>Loading recipients from database…</p>
              </div>
            ) : error ? (
              <div className="table-error-state">
                <AlertCircle size={24} color="#f87171" />
                <p>{error}</p>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="table-empty-state">
                <p>No recipients match your search or filter.</p>
              </div>
            ) : (
              <table className="admin-users-table">
                <thead>
                  <tr>
                    <th style={{ width: '40px', textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={isAllEligibleSelected}
                        onChange={handleToggleSelectAll}
                        disabled={eligibleVisibleUsers.length === 0}
                        aria-label="Select all eligible users"
                      />
                    </th>
                    <th>User Details</th>
                    <th>Email Address</th>
                    <th>Role</th>
                    <th>Location</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u) => {
                    const isEligible = isValidEmail(u.email);
                    const isSelected = selectedUserEmails.includes(u.email);

                    return (
                      <tr
                        key={u.email}
                        className={`${isSelected ? 'selected-row' : ''} ${!isEligible ? 'ineligible-row' : ''}`}
                        onClick={() => handleToggleSelectUser(u.email, isEligible)}
                        style={{ cursor: isEligible ? 'pointer' : 'not-allowed' }}
                      >
                        <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            disabled={!isEligible}
                            onChange={() => handleToggleSelectUser(u.email, isEligible)}
                            aria-label={`Select ${u.name || u.email}`}
                          />
                        </td>
                        <td>
                          <div className="user-name-cell">
                            <span className="user-primary-name">{u.name || 'Anonymous User'}</span>
                          </div>
                        </td>
                        <td>
                          <div className="user-phone-cell">
                            <span className="phone-number-text">{u.email || '—'}</span>
                            {isEligible ? (
                              <CheckCircle2 size={13} color="#34d399" title="Valid Email" />
                            ) : (
                              <ShieldAlert size={13} color="#f87171" title="Missing or invalid email" />
                            )}
                          </div>
                        </td>
                        <td>
                          <span
                            className="role-pill"
                            style={{
                              background: u.role === 'admin' ? 'rgba(2, 132, 199, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                              color: u.role === 'admin' ? '#38bdf8' : '#e2e8f0',
                              border: `1px solid ${u.role === 'admin' ? 'rgba(56, 189, 248, 0.4)' : 'rgba(255, 255, 255, 0.1)'}`
                            }}
                          >
                            {u.role || 'user'}
                          </span>
                        </td>
                        <td>
                          <span className="user-location-text">
                            {[u.city, u.district, u.state, u.country].filter(Boolean).join(', ') || 'India'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Table Footer info */}
          <div className="table-footer-info">
            <span>Showing {filteredUsers.length} of {users.length} users</span>
            <span>{selectedCount} selected</span>
          </div>
        </div>

        {/* Right Column: India Alerts + Email Composer */}
        <div className="admin-panel email-composer-panel">
          {/* ── India Weather Alerts ─────────────────────────────── */}
          <IndiaAlertsSection
            adminHeaders={adminHeaders}
            onInsertAlert={handleInsertAlert}
          />

          {/* ── Email Composer ───────────────────────────────────── */}
          <div className="panel-header">
            <h3>Compose Weather Email</h3>
            <span className="panel-subtitle">Draft meteorological update and broadcast to recipients</span>
          </div>

          {/* Selected Recipients Badge Bar */}
          <div className="composer-recipients-summary">
            <div className="recipients-summary-header">
              <span className="summary-title">Recipients</span>
              <span className="summary-count-badge">
                {selectedCount} selected
              </span>
            </div>
            {selectedCount > 0 ? (
              <div className="selected-chips-scroll">
                {selectedUserEmails.map((email) => (
                  <span key={email} className="recipient-chip">
                    {email}
                    <button
                      type="button"
                      onClick={() => handleToggleSelectUser(email, true)}
                      aria-label={`Remove ${email}`}
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <p className="no-recipients-hint">
                <Info size={14} />
                Please select one or more recipients from the list.
              </p>
            )}
          </div>

          {/* Subject Field */}
          <div className="composer-field-group" style={{ marginTop: '0.85rem' }}>
            <label className="composer-label">
              <span>Email Subject</span>
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="WeatherGPT Weather Update"
              className="admin-search-input"
              style={{ width: '100%', marginBottom: '0.5rem' }}
            />
          </div>

          {/* Message Textarea */}
          <div className="composer-field-group">
            <label className="composer-label">
              <span>Message Body</span>
              <span className="char-counter-text">
                {message.length} characters
              </span>
            </label>
            <textarea
              className="email-textarea"
              rows={6}
              placeholder="Type your weather update message here, or use 'Insert into Email' from an active alert above…"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>

          {/* Live Dashboard Link Option */}
          <div className="dashboard-link-toggle-wrap">
            <label className="dashboard-toggle-label">
              <input
                type="checkbox"
                checked={includeDashboardLink}
                onChange={(e) => setIncludeDashboardLink(e.target.checked)}
              />
              <span>Include WeatherGPT Live Dashboard Link</span>
            </label>
            {includeDashboardLink && (
              <span className="dashboard-link-preview">
                <ExternalLink size={12} />
                {dashboardUrl}
              </span>
            )}
          </div>

          {/* Composer Actions */}
          <div className="composer-actions-grid">
            <button
              type="button"
              className="preview-email-btn"
              onClick={handleOpenPreview}
              disabled={selectedCount === 0 || !message.trim()}
            >
              <Eye size={16} />
              <span>Preview Email</span>
            </button>

            <button
              type="button"
              className="send-email-btn"
              onClick={handleSendEmail}
              disabled={selectedCount === 0 || !message.trim() || sending}
            >
              <Send size={16} />
              <span>{sending ? 'Sending via Resend…' : 'Send Weather Email'}</span>
            </button>
          </div>

          {/* Dispatch Result Card */}
          {dispatchResult && (
            <div className={`dispatch-result-card ${dispatchResult.success ? 'is-success' : 'is-failure'}`}>
              <div className="result-header">
                {dispatchResult.success ? (
                  <CheckCircle2 size={18} color="#34d399" />
                ) : (
                  <AlertCircle size={18} color="#f87171" />
                )}
                <h4>{dispatchResult.success ? 'Dispatch Completed' : 'Dispatch Failed'}</h4>
              </div>
              <p className="result-message">{getDispatchStatusText(dispatchResult)}</p>

              {dispatchResult.results && dispatchResult.results.length > 0 && (
                <div className="result-recipients-breakdown" style={{ marginTop: '0.75rem', maxHeight: '160px', overflowY: 'auto' }}>
                  {dispatchResult.results.map((r) => (
                    <div
                      key={r.email}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.4rem 0.6rem',
                        fontSize: '0.78rem',
                        background: 'rgba(0,0,0,0.2)',
                        borderRadius: '6px',
                        marginBottom: '4px'
                      }}
                    >
                      <span style={{ color: '#e2e8f0' }}>{r.email}</span>
                      <span style={{ color: r.success ? '#34d399' : '#f87171', fontWeight: '600' }}>
                        {r.success ? 'Delivered' : (r.error || 'Failed')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Preview Modal */}
      {previewModalOpen && previewData && (
        <div className="admin-modal-backdrop" onClick={() => setPreviewModalOpen(false)}>
          <div className="admin-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Mail size={20} className="text-sky" />
                <h3>Email Notification Preview</h3>
              </div>
              <button
                type="button"
                className="close-modal-btn"
                onClick={() => setPreviewModalOpen(false)}
                aria-label="Close Preview"
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              <div className="preview-meta-row">
                <span className="meta-label">From:</span>
                <span className="meta-value">{previewData.from}</span>
              </div>

              <div className="preview-meta-row">
                <span className="meta-label">To ({previewData.recipientCount} selected):</span>
                <span className="meta-value" style={{ wordBreak: 'break-all' }}>
                  {previewData.to.join(', ')}
                </span>
              </div>

              <div className="preview-meta-row">
                <span className="meta-label">Subject:</span>
                <span className="meta-value" style={{ fontWeight: '600', color: '#ffffff' }}>
                  {previewData.subject}
                </span>
              </div>

              <div className="preview-message-box">
                <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>
                  {previewData.compiledMessage}
                </p>
              </div>

              <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: '0.75rem 0 0 0', textAlign: 'center' }}>
                ℹ️ Preview only. No email is sent until you click "Send Weather Email".
              </p>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="cancel-modal-btn"
                onClick={() => setPreviewModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="send-email-btn"
                onClick={handleSendEmail}
                disabled={sending}
              >
                <Send size={16} />
                <span>{sending ? 'Sending via Resend…' : 'Send Weather Email'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
