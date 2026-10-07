import React, { useEffect, useRef, useState } from 'react';
import {
  Compass,
  MapPin,
  Calendar,
  Search,
  CloudRain,
  Wind,
  Droplets,
  Eye,
  Sunrise,
  Sunset,
  AlertTriangle,
  Sparkles,
  Plane,
  AlertCircle
} from 'lucide-react';
import { BackButton } from '../components/common/BackButton';
import { weatherService, interpretWeatherCode } from '../services/weatherService';
import { useTranslation } from '../i18n/LanguageContext';
import { getLocalizedLocationLabel } from '../utils/locationLocalization';
import { AiResponseErrorBoundary } from '../components/common/AiResponseErrorBoundary';

const POPULAR_DESTINATIONS = [
  { name: 'Goa, India', lat: 15.2993, lon: 74.124 },
  { name: 'Manali, Himachal Pradesh, India', lat: 32.2432, lon: 77.1892 },
  { name: 'Jaipur, Rajasthan, India', lat: 26.9124, lon: 75.7873 },
  { name: 'Ooty, Tamil Nadu, India', lat: 11.4102, lon: 76.695 },
  { name: 'Varanasi, Uttar Pradesh, India', lat: 25.3176, lon: 82.9739 }
];

export function TravelPlannerPage() {
  const { t, language, translateWeatherCondition } = useTranslation();
  const todayStr = new Date().toISOString().split('T')[0];
  const maxDate = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const [destQuery, setDestQuery] = useState('');
  const [destResults, setDestResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [selectedDest, setSelectedDest] = useState(null);

  const [travelDate, setTravelDate] = useState(todayStr);
  const [travelPlan, setTravelPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isVacation, setIsVacation] = useState(true);

  const searchBoxRef = useRef(null);

  useEffect(() => {
    if (!destQuery || destQuery.trim().length < 2) {
      setDestResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      const results = await weatherService.searchLocations(destQuery);
      setDestResults(results);
      setIsSearching(false);
      setDropdownOpen(true);
    }, 280);
    return () => clearTimeout(timer);
  }, [destQuery]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectDest = (loc) => {
    setSelectedDest(loc);
    setDestQuery(loc.name);
    setDropdownOpen(false);
    setErrorMsg('');
  };

  const handlePlanJourney = async (e) => {
    if (e) e.preventDefault();
    if (!selectedDest) {
      setErrorMsg('Please search and select a travel destination first.');
      return;
    }
    if (!travelDate) {
      setErrorMsg('Please select a travel date.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setTravelPlan(null);

    const res = await weatherService.getTravelPlanWeather(
      selectedDest.lat,
      selectedDest.lon,
      travelDate,
      selectedDest.name,
      language
    );

    setLoading(false);
    if (!res.success) {
      setErrorMsg(res.error || 'Live data currently unavailable.');
      return;
    }
    setTravelPlan(res);
  };

  return (
    <div className="destination-page travel-planner-view">
      <BackButton />

      <header className="dash-section-header">
        <div>
          <h2 className="dash-page-heading flex items-center gap-2">
            <Compass size={22} color="var(--travel-good)" />
            <span>{t('travel.title')}</span>
          </h2>
          <p className="dash-section-sub">
            {t('travel.subtitle')}
          </p>
        </div>
      </header>

      {/* Travel Input Form */}
      <section className="travel-form-card">
        <form onSubmit={handlePlanJourney} className="travel-inputs-grid">
          {/* Destination Search */}
          <div className="travel-field" ref={searchBoxRef}>
            <label className="travel-label">
              <MapPin size={14} />
              <span>{t('travel.destLabel')}</span>
            </label>
            <div className="travel-input-wrapper">
              <input
                type="text"
                className="travel-input"
                placeholder={t('travel.destPlaceholder')}
                value={destQuery}
                onChange={(e) => {
                  setDestQuery(e.target.value);
                  setSelectedDest(null);
                }}
                onFocus={() => {
                  if (destResults.length > 0) setDropdownOpen(true);
                }}
              />
              {isSearching && <span className="travel-inline-spinner" />}
            </div>

            {dropdownOpen && destResults.length > 0 && (
              <div className="dash-search-dropdown travel-dropdown">
                {destResults.map((loc) => (
                  <button
                    key={loc.id}
                    type="button"
                    className="dash-search-item"
                    onClick={() => handleSelectDest(loc)}
                  >
                    <MapPin size={14} className="dash-item-pin" />
                    <div className="dash-item-text">
                      <span className="dash-item-city">{getLocalizedLocationLabel(loc.cityName, language)}</span>
                      <span className="dash-item-meta">
                        {loc.state ? `${getLocalizedLocationLabel(loc.state, language)}, ` : ''}
                        {loc.country}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Travel Date */}
          <div className="travel-field">
            <label className="travel-label">
              <Calendar size={14} />
              <span>{t('travel.dateLabel')}</span>
            </label>
            <input
              type="date"
              className="travel-input travel-date-input"
              value={travelDate}
              min={todayStr}
              max={maxDate}
              onChange={(e) => {
                setTravelDate(e.target.value);
                setErrorMsg('');
              }}
            />
          </div>

          {/* Vacation Checkbox & Action Button */}
          <div className="travel-action-row">
            <label className="travel-vacation-toggle">
              <input
                type="checkbox"
                checked={isVacation}
                onChange={(e) => setIsVacation(e.target.checked)}
              />
              <span>{t('travel.leisureToggle')}</span>
            </label>

            <button
              type="submit"
              className="travel-submit-btn"
              disabled={loading || !destQuery}
            >
              <Plane size={16} />
              <span>{loading ? t('common.loading') : t('travel.submitBtn')}</span>
            </button>
          </div>
        </form>

        {/* Quick popular suggestions */}
        <div className="travel-quick-destinations">
          <span className="travel-quick-label">{t('home.popularLocations')}:</span>
          {POPULAR_DESTINATIONS.map((d) => (
            <button
              key={d.name}
              type="button"
              className="travel-quick-chip"
              onClick={() => handleSelectDest(d)}
            >
              {getLocalizedLocationLabel(d.name.split(',')[0], language)}
            </button>
          ))}
        </div>
      </section>

      {/* Error / Alert Message */}
      {errorMsg && (
        <div className="dash-error-box travel-error-banner">
          <AlertCircle size={20} color="#f87171" />
          <p>{errorMsg}</p>
        </div>
      )}

      {/* Travel Plan Results */}
      {loading && (
        <div className="dash-loading-box">
          <div className="dash-spinner" />
          <p>{t('travel.loading')}</p>
        </div>
      )}

      {travelPlan && !loading && (
        <AiResponseErrorBoundary>
        <section className="travel-result-section">
          {/* Main Hero Summary */}
          <div className="travel-result-hero">
            <div className="travel-hero-top">
              <div>
                <span className="travel-tag">{t('travel.forecastHeader')}</span>
                <h3 className="travel-dest-title">{getLocalizedLocationLabel(travelPlan.destination, language)}</h3>
                <p className="travel-date-badge">
                  <Calendar size={14} />
                  <span>
                    {t('travel.dateLabel')}: {travelPlan.date} • {travelPlan.timezone}
                  </span>
                </p>
              </div>

              <div className="travel-hero-temp">
                <span className="travel-temp-val">{travelPlan.temperatureDisplay}</span>
                <span className="travel-condition-val">{translateWeatherCondition(travelPlan.condition)}</span>
                <span className="travel-feels-val">
                  {t('home.feelsLike')} {travelPlan.feelsLike}°C
                </span>
              </div>
            </div>

            {/* Outdoor Advisory Banner */}
            <div
              className="travel-outdoor-card"
              style={{ borderColor: travelPlan.outdoorColor }}
            >
              <div className="travel-outdoor-header">
                <span
                  className="travel-outdoor-badge"
                  style={{ backgroundColor: travelPlan.outdoorColor }}
                >
                  {travelPlan.outdoorStatus}
                </span>
                <span className="travel-outdoor-note">{t('travel.recommendation')}</span>
              </div>
              <p className="travel-outdoor-advice">{travelPlan.outdoorAdvice}</p>
            </div>

            {/* Detailed Metric Cards */}
            <div className="travel-metrics-grid">
              <div className="travel-metric-item">
                <div className="travel-metric-icon">
                  <CloudRain size={18} color="var(--weather-rain)" />
                </div>
                <div>
                  <span className="travel-metric-label">{t('home.rainChance')}</span>
                  <span className="travel-metric-val" style={{ color: "var(--weather-rain)" }}>{travelPlan.rainProbability}</span>
                  <span className="travel-metric-sub">{travelPlan.rainfall}</span>
                </div>
              </div>

              <div className="travel-metric-item">
                <div className="travel-metric-icon">
                  <Wind size={18} color="var(--weather-wind)" />
                </div>
                <div>
                  <span className="travel-metric-label">{t('home.windSpeed')}</span>
                  <span className="travel-metric-val" style={{ color: "var(--weather-wind)" }}>{travelPlan.windSpeed}</span>
                  <span className="travel-metric-sub">{t('home.windSpeed')}</span>
                </div>
              </div>

              <div className="travel-metric-item">
                <div className="travel-metric-icon">
                  <Droplets size={18} color="var(--weather-rain)" />
                </div>
                <div>
                  <span className="travel-metric-label">{t('home.humidity')}</span>
                  <span className="travel-metric-val" style={{ color: "var(--weather-rain)" }}>{travelPlan.humidity}</span>
                </div>
              </div>

              <div className="travel-metric-item">
                <div className="travel-metric-icon">
                  <Eye size={18} color="var(--text-location)" />
                </div>
                <div>
                  <span className="travel-metric-label">{t('home.visibility')}</span>
                  <span className="travel-metric-val" style={{ color: "var(--text-location)" }}>{travelPlan.visibility}</span>
                </div>
              </div>

              <div className="travel-metric-item">
                <div className="travel-metric-icon">
                  <Sunrise size={18} className="text-amber-400" />
                </div>
                <div>
                  <span className="travel-metric-label">{t('home.sunrise')}</span>
                  <span className="travel-metric-val">{travelPlan.sunrise}</span>
                </div>
              </div>

              <div className="travel-metric-item">
                <div className="travel-metric-icon">
                  <Sunset size={18} className="text-orange-400" />
                </div>
                <div>
                  <span className="travel-metric-label">{t('home.sunset')}</span>
                  <span className="travel-metric-val">{travelPlan.sunset}</span>
                </div>
              </div>
            </div>

            {/* Official Alerts Section */}
            <div className="travel-alerts-card">
              <div className="travel-alerts-header">
                <AlertTriangle size={16} className="text-amber-400" />
                <h4>{t('alerts.title')} &amp; {t('home.majorEvents')}</h4>
              </div>
              {travelPlan.officialAlerts?.length > 0 ? (
                <div className="travel-alerts-list">
                  {travelPlan.officialAlerts.map((alt) => (
                    <div key={alt.id} className="travel-alert-entry">
                      <span className="travel-alert-badge">{t('alerts.officialSource')}</span>
                      <strong>{alt.title}</strong>
                      <p>{alt.description}</p>
                      <span className="travel-alert-source">{t('common.source')}: {alt.source}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="travel-no-alert">
                  {t('alerts.noAlertsMessage')} ({getLocalizedLocationLabel(travelPlan.destination, language)})
                </p>
              )}
            </div>

            {/* Closing Journey Greeting */}
            <div className="travel-closing-banner">
              <Sparkles size={20} className="text-amber-300 flex-shrink-0" />
              <p>
                {isVacation
                  ? travelPlan.vacationClosingMessage
                  : travelPlan.closingMessage}
              </p>
            </div>

            <div className="travel-source-footer">
              <span>{t('common.source')}: {travelPlan.dataSource}</span>
            </div>
          </div>
        </section>
        </AiResponseErrorBoundary>
      )}
    </div>
  );
}
