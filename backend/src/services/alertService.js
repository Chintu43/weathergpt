/**
 * alertService.js
 *
 * India Weather Alert Service for WeatherGPT Admin Portal.
 *
 * IMPORTANT DATA RULES:
 * - NEVER invent or fabricate weather alerts.
 * - NEVER label open-meteo forecast data as an official government warning.
 * - Only return verified data from a configured official alert source.
 * - If no provider is configured: return structured "no alerts" state.
 * - If provider fetch fails: return structured "unavailable" state.
 *
 * Current provider support:
 *   - "none"     : No official provider configured (default). Returns empty alert list.
 *   - "gdacs"    : GDACS India GeoJSON feed (future — set ALERT_PROVIDER=gdacs + ALERT_GDACS_URL).
 *   - "imd_rss"  : IMD RSS feed (future — set ALERT_PROVIDER=imd_rss + ALERT_IMD_RSS_URL).
 *
 * Environment variables:
 *   ALERT_PROVIDER          one of: none | gdacs | imd_rss   (default: none)
 *   ALERT_GDACS_URL         override GDACS feed URL (optional)
 *   ALERT_IMD_RSS_URL       override IMD RSS URL (optional)
 */

import axios from 'axios';

/** Normalized alert structure used throughout the application. */
function buildAlert({ alertType, severity, affectedAreas, issued, expires, source, description, raw }) {
  return {
    alertType: alertType || 'Weather Alert',
    severity: severity || 'Unknown',
    affectedAreas: affectedAreas || 'India',
    issued: issued || null,
    expires: expires || null,
    source: source || 'Unknown Source',
    description: description || '',
    raw: raw || null
  };
}

/**
 * Returns the configured alert provider name (lower-cased).
 * Defaults to "none" if not set.
 */
function getProviderName() {
  return (process.env.ALERT_PROVIDER || 'none').trim().toLowerCase();
}

/**
 * Attempt to fetch alerts from the GDACS GeoJSON feed for India.
 * Only called if ALERT_PROVIDER=gdacs.
 */
async function fetchFromGdacs() {
  const gdacsUrl =
    (process.env.ALERT_GDACS_URL || '').trim() ||
    'https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?alertlevel=Orange,Red&country=IND';

  console.log(`[AlertService] Fetching GDACS alerts from: ${gdacsUrl}`);

  const response = await axios.get(gdacsUrl, {
    timeout: 10000,
    headers: { Accept: 'application/json' }
  });

  const features = (response.data?.features) || [];
  if (!Array.isArray(features) || features.length === 0) {
    return [];
  }

  return features.map((f) => {
    const props = f.properties || {};
    return buildAlert({
      alertType: props.eventtype || props.eventname || 'Natural Hazard',
      severity: props.alertscore >= 1.5 ? 'Red' : props.alertscore >= 0.5 ? 'Orange' : 'Green',
      affectedAreas: props.country || 'India',
      issued: props.fromdate || null,
      expires: props.todate || null,
      source: 'GDACS (Global Disaster Alerting Coordination System)',
      description: [props.eventname, props.htmldescription && props.htmldescription.replace(/<[^>]+>/g, ' ')]
        .filter(Boolean).join(' — ').slice(0, 500),
      raw: props
    });
  });
}

/**
 * Attempt to fetch alerts from an IMD-compatible RSS feed.
 * Only called if ALERT_PROVIDER=imd_rss.
 * Requires a valid ALERT_IMD_RSS_URL to be configured.
 */
async function fetchFromImdRss() {
  const rssUrl = (process.env.ALERT_IMD_RSS_URL || '').trim();
  if (!rssUrl) {
    console.warn('[AlertService] ALERT_PROVIDER=imd_rss but ALERT_IMD_RSS_URL is not set.');
    return null; // signals "not configured"
  }

  console.log(`[AlertService] Fetching IMD RSS alerts from: ${rssUrl}`);

  const response = await axios.get(rssUrl, {
    timeout: 10000,
    headers: { Accept: 'application/xml,text/xml' }
  });

  // Basic XML parsing — extract <item> blocks without external XML parser dependency
  const xml = response.data || '';
  const items = [];
  const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const itemXml = match[1];
    const getText = (tag) => {
      const m = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>|<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i').exec(itemXml);
      return m ? (m[1] || m[2] || '').trim() : '';
    };

    items.push(buildAlert({
      alertType: getText('category') || 'Weather Warning',
      severity: getText('severity') || 'Unknown',
      affectedAreas: getText('areaDesc') || getText('title') || 'India',
      issued: getText('pubDate') || getText('onset') || null,
      expires: getText('expires') || null,
      source: 'India Meteorological Department (IMD)',
      description: getText('description') || getText('title') || '',
      raw: null
    }));
  }

  return items;
}

/**
 * Main entry point.
 *
 * Returns:
 *   {
 *     available: true,
 *     providerConfigured: true,
 *     alerts: [{ alertType, severity, affectedAreas, issued, expires, source, description }],
 *     fetchedAt: ISO string,
 *     provider: string
 *   }
 *
 * Or (no provider configured):
 *   { available: false, providerConfigured: false, reason: '...', alerts: [], fetchedAt }
 *
 * Or (fetch failed):
 *   { available: false, providerConfigured: true, reason: '...', alerts: [], fetchedAt }
 */
export async function getIndiaAlerts() {
  const fetchedAt = new Date().toISOString();
  const provider = getProviderName();

  // ── No provider configured ─────────────────────────────────────────────────
  if (provider === 'none' || !provider) {
    console.log('[AlertService] No official alert provider configured (ALERT_PROVIDER=none).');
    return {
      available: false,
      providerConfigured: false,
      reason:
        'No official India weather alert provider is currently configured. ' +
        'Set ALERT_PROVIDER in backend/.env to enable live alerts (supported: gdacs, imd_rss).',
      alerts: [],
      fetchedAt,
      provider: 'none'
    };
  }

  // ── GDACS provider ─────────────────────────────────────────────────────────
  if (provider === 'gdacs') {
    try {
      const alerts = await fetchFromGdacs();
      return {
        available: true,
        providerConfigured: true,
        alerts,
        fetchedAt,
        provider: 'GDACS'
      };
    } catch (err) {
      console.error('[AlertService] GDACS fetch error:', err.message);
      return {
        available: false,
        providerConfigured: true,
        reason: 'Live alert data is currently unavailable (GDACS fetch failed).',
        alerts: [],
        fetchedAt,
        provider: 'GDACS'
      };
    }
  }

  // ── IMD RSS provider ───────────────────────────────────────────────────────
  if (provider === 'imd_rss') {
    try {
      const result = await fetchFromImdRss();
      if (result === null) {
        // Not configured (missing URL)
        return {
          available: false,
          providerConfigured: false,
          reason: 'IMD RSS provider selected but ALERT_IMD_RSS_URL is not configured in backend/.env.',
          alerts: [],
          fetchedAt,
          provider: 'imd_rss'
        };
      }
      return {
        available: true,
        providerConfigured: true,
        alerts: result,
        fetchedAt,
        provider: 'India Meteorological Department (IMD)'
      };
    } catch (err) {
      console.error('[AlertService] IMD RSS fetch error:', err.message);
      return {
        available: false,
        providerConfigured: true,
        reason: 'Live alert data is currently unavailable (IMD RSS fetch failed).',
        alerts: [],
        fetchedAt,
        provider: 'imd_rss'
      };
    }
  }

  // ── Unknown provider ───────────────────────────────────────────────────────
  console.warn(`[AlertService] Unknown ALERT_PROVIDER value: "${provider}".`);
  return {
    available: false,
    providerConfigured: false,
    reason: `Unknown alert provider "${provider}". Set ALERT_PROVIDER to one of: none, gdacs, imd_rss.`,
    alerts: [],
    fetchedAt,
    provider
  };
}
