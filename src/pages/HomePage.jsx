import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useLocationContext } from '../context/LocationContext';
import { weatherService, getConditionColor } from '../services/weatherService';
import { requestDeviceLocation, reverseGeocode } from '../services/locationService';
import {
  SunVisual,
  CloudVisual,
  DarkCloudVisual,
  RainCloudVisual,
  LightningCloudVisual
} from '../components/weather/CentralWeatherVisuals';
import '../styles/cinematicHome.css';
import {
  Bell,
  MapPin,
  User,
  Sun,
  SunMedium,
  CloudSun,
  Cloud,
  CloudFog,
  CloudDrizzle,
  CloudRain,
  CloudRainWind,
  CloudSnow,
  CloudLightning,
  Wind,
  ShieldAlert,
  ArrowRight,
  RefreshCw,
  Search,
  AlertCircle,
  Droplets,
  Eye,
  Clock,
  ChevronDown
} from 'lucide-react';

const ICON_MAP = {
  Sun, SunMedium, CloudSun, Cloud, CloudFog, CloudDrizzle,
  CloudRain, CloudRainWind, CloudSnow, CloudLightning, Wind
};

function renderWeatherIcon(iconName, size = 26, color = 'var(--text-primary)') {
  const IconComponent = ICON_MAP[iconName] || CloudSun;
  return <IconComponent size={size} color={color} strokeWidth={2} />;
}

function greetingPrefix() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'Good Morning';
  if (hour >= 12 && hour < 17) return 'Good Afternoon';
  if (hour >= 17 && hour < 21) return 'Good Evening';
  return 'Good Night';
}

/* Small brand sun beside WEATHERGPT title */
function BrandSun() {
  return (
    <span className="brand-sun-wrapper" aria-hidden="true">
      <svg viewBox="0 0 60 60" width="38" height="38" className="brand-sun-svg">
        <defs>
          <radialGradient id="brandSunCore" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FEF08A" />
            <stop offset="50%" stopColor="#FBBF24" />
            <stop offset="100%" stopColor="#D97706" />
          </radialGradient>
          <radialGradient id="brandSunHalo" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(251,191,36,0.5)" />
            <stop offset="100%" stopColor="rgba(251,191,36,0)" />
          </radialGradient>
        </defs>
        <circle cx="30" cy="30" r="28" fill="url(#brandSunHalo)" className="brand-sun-halo" />
        {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
          <g key={angle} transform={`rotate(${angle} 30 30)`}>
            <line x1="30" y1="6" x2="30" y2="12" stroke="#FBBF24" strokeWidth="2.5" strokeLinecap="round" opacity="0.9" />
          </g>
        ))}
        <circle cx="30" cy="30" r="13" fill="url(#brandSunCore)" className="brand-sun-core" />
        <ellipse cx="25" cy="25" rx="5" ry="3" transform="rotate(-25 25 25)" fill="rgba(255,255,255,0.4)" />
      </svg>
    </span>
  );
}

export function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { selectedLocation, setSelectedLocation } = useLocationContext();

  const [greetingTime, setGreetingTime] = useState(greetingPrefix());
  useEffect(() => { setGreetingTime(greetingPrefix()); }, []);

  const userName = user?.name?.trim();
  const fullGreeting = userName ? `${greetingTime}, ${userName.split(' ')[0]}` : greetingTime;

  /* ── Search State ── */
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchContainerRef = useRef(null);

  /* ── Location State ── */
  const [locationStatus, setLocationStatus] = useState('pending');
  const [locationLabel, setLocationLabel] = useState('');
  const [coords, setCoords] = useState(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationFeedback, setLocationFeedback] = useState('');

  /* ── Weather Data ── */
  const [weatherData, setWeatherData] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState(null);

  /* ── Nationwide Data ── */
  const [indiaEvents, setIndiaEvents] = useState([]);
  const [indiaLoading, setIndiaLoading] = useState(true);
  const [indiaError, setIndiaError] = useState(null);
  const [majorEvents, setMajorEvents] = useState([]);
  const [majorLoading, setMajorLoading] = useState(true);
  const [majorError, setMajorError] = useState(null);

  /* ══════════════════════════════════════════════════════════════════════
     CINEMATIC SCROLL EXPERIENCE & TRANSITION ORCHESTRATOR
     
     Sequence for EVERY section transition:
     1. SCROLL
     2. NEXT WEATHER IMAGE begins forming in the CENTER (1100ms)
        - Old content gently dims
     3. IMAGE REACHES FULL VISIBILITY -> brief hold (350ms)
        - Old content completes fade-out
     4. IMAGE SLOWLY FADES AWAY (900ms)
        - At 350ms into fade: target section content begins appearing
        - Content expands/settles into position
     5. IMAGE COMPLETELY FADES AWAY
     6. CONTENT FULLY VISIBLE & READABLE (settles, 400ms)
     7. Transition complete (idle)
  ══════════════════════════════════════════════════════════════════════ */
  const [activeSection, setActiveSection] = useState(0);
  const [targetSection, setTargetSection] = useState(null);
  const [phase, setPhase] = useState('idle'); // 'idle' | 'image-forming' | 'image-holding' | 'image-fading' | 'settling'
  const [contentPhase, setContentPhase] = useState('visible'); // 'visible' | 'outgoing' | 'hidden' | 'incoming'
  const [isReturningToTop, setIsReturningToTop] = useState(false);
  const [returnSunForming, setReturnSunForming] = useState(false);

  /* ── Right-Side Scroll Hint State ── */
  const [hasScrolled, setHasScrolled] = useState(false);
  const [hintRemoved, setHintRemoved] = useState(false);
  const hasScrolledRef = useRef(false);

  const markFirstScroll = useCallback(() => {
    if (!hasScrolledRef.current) {
      hasScrolledRef.current = true;
      setHasScrolled(true);
      setTimeout(() => {
        setHintRemoved(true);
      }, 600);
    }
  }, []);

  useEffect(() => {
    if (activeSection !== 0) {
      markFirstScroll();
    }
  }, [activeSection, markFirstScroll]);

  const stageRef = useRef(null);
  const activeSectionRef = useRef(0);
  const phaseRef = useRef('idle');
  const isReturningRef = useRef(false);
  const timeoutsRef = useRef([]);

  useEffect(() => { activeSectionRef.current = activeSection; }, [activeSection]);
  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { isReturningRef.current = isReturningToTop; }, [isReturningToTop]);

  const clearAllTimeouts = () => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
  };

  const addTimeout = (fn, delay) => {
    const id = setTimeout(fn, delay);
    timeoutsRef.current.push(id);
    return id;
  };

  useEffect(() => () => clearAllTimeouts(), []);

  /* ── Return-to-Top Storytelling Loop (Section 4 → 0) ── */
  const triggerReturnToTop = useCallback(() => {
    if (isReturningRef.current || phaseRef.current !== 'idle') return;
    clearAllTimeouts();

    setIsReturningToTop(true);
    setTargetSection(0);
    setPhase('image-forming');
    setContentPhase('outgoing'); // Section 4 content fades out

    // Sun visual begins forming in center
    setReturnSunForming(true);

    addTimeout(() => {
      setContentPhase('hidden');
      setPhase('image-holding'); // Sun fully formed in center (350ms hold)

      addTimeout(() => {
        setPhase('image-fading'); // Sun visual begins fading away

        // 350ms into fading, switch to Section 0 and begin content fade-in
        addTimeout(() => {
          setActiveSection(0);
          setContentPhase('incoming');
        }, 350);

        // Sun completely faded away (900ms)
        addTimeout(() => {
          setPhase('settling');
          setContentPhase('visible');
          setReturnSunForming(false);

          addTimeout(() => {
            setPhase('idle');
            setTargetSection(null);
            setIsReturningToTop(false);
          }, 400);
        }, 900);
      }, 350);
    }, 1100);
  }, []);

  /* ── Controlled Transition Orchestrator ── */
  const transitionToSection = useCallback((targetSec) => {
    markFirstScroll();
    if (
      targetSec === activeSectionRef.current ||
      phaseRef.current !== 'idle' ||
      isReturningRef.current ||
      targetSec < 0 ||
      targetSec > 4
    ) return;

    clearAllTimeouts();

    setTargetSection(targetSec);
    setPhase('image-forming');
    setContentPhase('outgoing'); // Current content gently dims

    // Step 1: Image forms in center (1100ms)
    addTimeout(() => {
      setContentPhase('hidden'); // Old content completely hidden
      setPhase('image-holding'); // Image at full visibility in center

      // Step 2: Hold briefly (350ms)
      addTimeout(() => {
        setPhase('image-fading'); // Image begins dissolving

        // Step 3: 350ms into fade, switch section & reveal new content
        addTimeout(() => {
          setActiveSection(targetSec);
          setContentPhase('incoming');
        }, 350);

        // Step 4: Image completely gone after 900ms
        addTimeout(() => {
          setPhase('settling');
          setContentPhase('visible');
          setTargetSection(null);

          // Step 5: Settled & unlocked
          addTimeout(() => {
            setPhase('idle');
          }, 400);
        }, 900);
      }, 350);
    }, 1100);
  }, [markFirstScroll]);

  const handleNext = useCallback(() => {
    const cur = activeSectionRef.current;
    if (phaseRef.current !== 'idle' || isReturningRef.current) return;
    if (cur < 4) transitionToSection(cur + 1);
    else triggerReturnToTop();
  }, [transitionToSection, triggerReturnToTop]);

  const handlePrev = useCallback(() => {
    const cur = activeSectionRef.current;
    if (cur > 0 && phaseRef.current === 'idle' && !isReturningRef.current) {
      transitionToSection(cur - 1);
    }
  }, [transitionToSection]);

  /* ── Wheel / Touch / Keyboard Navigation with Transition Locking ── */
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    let wheelAccumulator = 0;
    let wheelCooldown = false;

    const handleWheel = (e) => {
      e.preventDefault();
      markFirstScroll();
      if (phaseRef.current !== 'idle' || isReturningRef.current || wheelCooldown) return;
      wheelAccumulator += e.deltaY;
      if (Math.abs(wheelAccumulator) > 35) {
        wheelCooldown = true;
        if (wheelAccumulator > 0) handleNext();
        else handlePrev();
        wheelAccumulator = 0;
        setTimeout(() => { wheelCooldown = false; }, 450);
      }
    };

    const handleKeyDown = (e) => {
      if (['ArrowDown', 'PageDown', 'ArrowUp', 'PageUp'].includes(e.key)) {
        markFirstScroll();
      }
      if (phaseRef.current !== 'idle' || isReturningRef.current) return;
      if (e.key === 'ArrowDown' || e.key === 'PageDown') { e.preventDefault(); handleNext(); }
      else if (e.key === 'ArrowUp' || e.key === 'PageUp') { e.preventDefault(); handlePrev(); }
    };

    let touchStartY = 0;
    const handleTouchStart = (e) => { touchStartY = e.touches[0].clientY; };
    const handleTouchEnd = (e) => {
      markFirstScroll();
      if (phaseRef.current !== 'idle' || isReturningRef.current) return;
      const deltaY = touchStartY - e.changedTouches[0].clientY;
      if (Math.abs(deltaY) > 35) {
        if (deltaY > 0) handleNext();
        else handlePrev();
      }
    };

    stage.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('keydown', handleKeyDown);
    stage.addEventListener('touchstart', handleTouchStart, { passive: true });
    stage.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      stage.removeEventListener('wheel', handleWheel);
      window.removeEventListener('keydown', handleKeyDown);
      stage.removeEventListener('touchstart', handleTouchStart);
      stage.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleNext, handlePrev, markFirstScroll]);

  /* ── Data Fetching ── */
  const loadWeatherFor = async (lat, lon, name) => {
    setWeatherLoading(true);
    setWeatherError(null);
    const res = await weatherService.getCurrentWeather(lat, lon, name);
    if (res.success) {
      setWeatherData(res);
      setCoords({ lat, lon });
      setLocationLabel(name);
      setLocationStatus('ready');
    } else {
      setWeatherData(null);
      setWeatherError(res.error || 'Live data currently unavailable.');
    }
    setWeatherLoading(false);
  };

  const loadNationwide = async () => {
    setIndiaLoading(true);
    setIndiaError(null);
    const intel = await weatherService.getIndiaWeatherIntelligence();
    if (intel?.error) { setIndiaEvents([]); setIndiaError(intel.error); }
    else { setIndiaEvents(Array.isArray(intel) ? intel : []); }
    setIndiaLoading(false);

    setMajorLoading(true);
    setMajorError(null);
    const evts = await weatherService.getMajorWeatherEvents();
    if (evts?.error) { setMajorEvents([]); setMajorError(evts.error); }
    else { setMajorEvents(Array.isArray(evts) ? evts : []); }
    setMajorLoading(false);
  };

  useEffect(() => { loadNationwide(); }, []);

  useEffect(() => {
    if (
      selectedLocation &&
      typeof selectedLocation.lat === 'number' && !Number.isNaN(selectedLocation.lat) &&
      typeof selectedLocation.lon === 'number' && !Number.isNaN(selectedLocation.lon)
    ) {
      setLocationStatus('ready');
      setLocationFeedback('');
      loadWeatherFor(selectedLocation.lat, selectedLocation.lon, selectedLocation.name);
    } else {
      setLocationStatus('unavailable');
      setWeatherData(null);
      setCoords(null);
      setLocationLabel('');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLocation?.lat, selectedLocation?.lon, selectedLocation?.name]);

  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 2) { setSearchResults([]); return; }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      const results = await weatherService.searchLocations(searchQuery);
      setSearchResults(results);
      setIsSearching(false);
      setSearchOpen(true);
    }, 280);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSelectLocation = (loc) => {
    setSearchOpen(false);
    setSearchQuery('');
    setLocationFeedback('');
    setSelectedLocation({
      name: loc.name || loc.cityName,
      city: loc.cityName || loc.name?.split(',')[0] || '',
      district: loc.district || '',
      state: loc.state || '',
      country: loc.country || 'India',
      lat: loc.lat,
      lon: loc.lon
    });
  };

  const handleUseCurrentLocation = async () => {
    setIsLocating(true);
    setLocationFeedback('');
    try {
      const geo = await requestDeviceLocation();
      if (!geo.ok) { setLocationFeedback('Unable to access your location.'); setIsLocating(false); return; }
      const place = await reverseGeocode(geo.lat, geo.lon);
      const name = place.success ? place.name : `${geo.lat.toFixed(3)}, ${geo.lon.toFixed(3)}`;
      setSelectedLocation({
        name, city: place.cityName || name.split(',')[0],
        district: place.district || '', state: place.state || '',
        country: place.country || 'India', lat: geo.lat, lon: geo.lon
      });
    } catch (err) {
      console.error('[HomePage] Current location error:', err);
      setLocationFeedback('Unable to access your location.');
    } finally { setIsLocating(false); }
  };

  const handleSearchSubmit = async (e) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (q.length < 2) return;
    setIsSearching(true);
    const results = await weatherService.searchLocations(q);
    setIsSearching(false);
    if (results.length === 1) { handleSelectLocation(results[0]); return; }
    setSearchResults(results);
    setSearchOpen(true);
  };

  const handleRefresh = async () => {
    loadNationwide();
    if (selectedLocation) await loadWeatherFor(selectedLocation.lat, selectedLocation.lon, selectedLocation.name);
    else if (coords) await loadWeatherFor(coords.lat, coords.lon, locationLabel);
  };

  useEffect(() => {
    const handler = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) setSearchOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const showWeather = locationStatus === 'ready' && weatherData;

  /* ── Center Transition Visual Generator ── */
  const getTransitionVisualComponent = (secIndex) => {
    switch (secIndex) {
      case 0: return <SunVisual size={170} />;
      case 1: return <CloudVisual size={170} />;
      case 2: return <DarkCloudVisual size={170} />;
      case 3: return <RainCloudVisual size={170} />;
      case 4: return <LightningCloudVisual size={170} />;
      default: return null;
    }
  };

  // Determines whether the central transition image overlay should be displayed
  const isTransitioning = ['image-forming', 'image-holding', 'image-fading'].includes(phase);
  const visualToDisplay = returnSunForming
    ? 0
    : targetSection !== null
    ? targetSection
    : null;

  const getVisualAnimClass = () => {
    if (phase === 'image-forming') return 'weather-visual-materializing';
    if (phase === 'image-holding') return 'weather-visual-stable';
    if (phase === 'image-fading') return 'weather-visual-dissolving';
    return '';
  };

  const getSectionTitle = (sec) => {
    switch (sec) {
      case 1: return <h2 className="section-header-title sec-1-title">Weather Timeline</h2>;
      case 2: return <h2 className="section-header-title sec-2-title">Rain &amp; Outdoor Conditions</h2>;
      case 3: return <h2 className="section-header-title sec-3-title">What's Happening Across India Today?</h2>;
      case 4: return <h2 className="section-header-title sec-4-title">Today's Major Weather Events</h2>;
      default: return null;
    }
  };

  const getScrollHintText = () => {
    switch (activeSection) {
      case 1: return 'Rain & Outdoor Conditions ↓';
      case 2: return 'Across India Today ↓';
      case 3: return 'Major Weather Events ↓';
      case 4: return 'Moving back to Today\'s Weather ↻';
      default: return 'Explore Weather Timeline ↓';
    }
  };

  /* Map contentPhase → CSS class */
  const getContentClass = () => {
    switch (contentPhase) {
      case 'outgoing': return 'content-outgoing';
      case 'hidden': return 'content-hidden';
      case 'incoming': return 'content-incoming';
      case 'visible': return 'content-visible';
      default: return 'content-visible';
    }
  };

  return (
    <>
      {/* ═══════════════════════════════════════════════════════════════════
          FIXED WEATHERGPT HEADER (ZERO BLUR, ALWAYS FIXED AT TOP)
          ═══════════════════════════════════════════════════════════════════ */}
      <header className="home-fixed-header">
        <div className="fixed-header-inner">
          <div className="fixed-header-brand">
            <BrandSun />
            <div>
              <h1 className="dash-brand-title">WEATHERGPT</h1>
              <p className="dash-brand-sub">AI-Powered Weather Intelligence</p>
            </div>
          </div>
          <div className="fixed-header-actions">
            {showWeather && (
              <div className="dash-location-badge" title="Selected location">
                <MapPin size={12} />
                <span>{weatherData.location.split(',')[0]}</span>
              </div>
            )}
            <button type="button" className="dash-icon-btn" onClick={() => navigate('/alerts')} aria-label="Alerts">
              <Bell size={17} />
            </button>
            <button type="button" className="dash-icon-btn" onClick={() => navigate('/profile')} aria-label="Profile">
              <User size={17} />
            </button>
            <button type="button" className="dash-sync-btn" onClick={handleRefresh} title="Refresh">
              <RefreshCw size={13} className={weatherLoading ? 'spin-animation' : ''} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Return-to-Top Notification Banner ── */}
      {isReturningToTop && (
        <div className="return-loop-banner" role="status" aria-live="polite">
          <span className="return-loop-icon">↻</span>
          <span className="return-loop-text">Moving back to Today's Weather...</span>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          MAIN CINEMATIC VIEWPORT STAGE
          ═══════════════════════════════════════════════════════════════════ */}
      <div className="home-cinematic-stage" ref={stageRef}>

        {/* Floating Section Navigation Dots */}
        <nav className="floating-section-nav" aria-label="Cinematic Sections">
          {!hintRemoved && (
            <div className={`scroll-indicator-label ${hasScrolled ? 'fade-out' : ''}`} aria-hidden="true">
              <span className="hint-arrow">↓</span>
              <span className="hint-word">Scroll</span>
              <span className="hint-word">to</span>
              <span className="hint-word">know</span>
              <span className="hint-word">more</span>
            </div>
          )}
          {[
            { label: "Today's Weather", idx: 0 },
            { label: 'Weather Timeline', idx: 1 },
            { label: 'Rain & Outdoor', idx: 2 },
            { label: 'Across India', idx: 3 },
            { label: 'Major Events', idx: 4 }
          ].map((item) => (
            <button
              key={item.idx}
              type="button"
              className={`nav-dot-btn ${activeSection === item.idx ? 'active' : ''}`}
              onClick={() => transitionToSection(item.idx)}
              title={item.label}
              aria-label={`Go to ${item.label}`}
            />
          ))}
        </nav>

        {/* ── CENTRAL TRANSITION IMAGE OVERLAY ──
            Forms in the CENTER of the screen during transitions.
            Completely disappears once transition completes. Never kept behind text. */}
        {isTransitioning && visualToDisplay !== null && (
          <div className="cinematic-center-overlay" aria-hidden="true">
            <div className={`central-visual-box ${getVisualAnimClass()}`}>
              {getTransitionVisualComponent(visualToDisplay)}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            SECTION 0: TODAY'S WEATHER
            OPEN, BREATHABLE, FULL-VIEWPORT LAYOUT.
            NO HUGE DARK BOX. TEXT FLOATS DIRECTLY OVER VIDEO.
            ═══════════════════════════════════════════════════════════════ */}
        {activeSection === 0 && (
          <div className={`stage-section-wrapper ${getContentClass()}`}>
            <div className="s0-open-layout">

              {/* Top Group: Large Left-Aligned Greeting & Left-Aligned Search Bar */}
              <div className="s0-top-group">
                <h1 className="s0-greeting-heading">{fullGreeting}</h1>
                {locationFeedback && <p className="s0-feedback-msg">{locationFeedback}</p>}

                {/* Search Bar - directly below large greeting, left-aligned */}
                <div className="s0-search-area" ref={searchContainerRef}>
                  <form className="dash-search-bar" onSubmit={handleSearchSubmit}>
                    <Search size={16} className="dash-search-icon" />
                    <input
                      type="text"
                      className="dash-search-input"
                      placeholder="Search city, district or location..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onFocus={() => { if (searchResults.length > 0) setSearchOpen(true); }}
                    />
                    {searchQuery && (
                      <button type="button" className="dash-search-clear" onClick={() => setSearchQuery('')}>×</button>
                    )}
                    <button type="submit" className="dash-search-submit" disabled={isSearching}>Search</button>
                    <button
                      type="button"
                      className="dash-current-loc-btn"
                      onClick={handleUseCurrentLocation}
                      disabled={isLocating}
                      title="Use device location"
                    >
                      <MapPin size={13} />
                      <span>{isLocating ? 'Locating…' : 'Use Current Location'}</span>
                    </button>
                  </form>
                  {searchOpen && searchResults.length > 0 && (
                    <div className="dash-search-dropdown">
                      {searchResults.map((loc) => (
                        <button key={loc.id} type="button" className="dash-search-item" onClick={() => handleSelectLocation(loc)}>
                          <MapPin size={14} className="dash-item-pin" />
                          <div className="dash-item-text">
                            <span className="dash-item-city">{loc.cityName}</span>
                            <span className="dash-item-meta">{loc.state ? `${loc.state}, ` : ''}{loc.country}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Weather Content */}
              {weatherLoading ? (
                <div className="s0-state-box">
                  <div className="dash-spinner" />
                  <p className="s0-state-text">Fetching live weather…</p>
                </div>
              ) : !selectedLocation && !weatherData ? (
                <div className="s0-state-box">
                  <p className="s0-state-text">Search for a location to view weather.</p>
                  <p className="s0-state-hint">Search city, district or click Use Current Location.</p>
                </div>
              ) : weatherError ? (
                <div className="s0-state-box">
                  <AlertCircle size={28} color="#f87171" />
                  <p className="s0-state-text">{weatherError}</p>
                  {coords && <button type="button" className="dash-retry-btn" onClick={handleRefresh}>Retry</button>}
                </div>
              ) : showWeather ? (
                <div className="s0-weather-main">
                  {/* Today's Weather heading */}
                  <h2 className="s0-section-label">Today's Weather</h2>

                  {/* Location */}
                  <p className="s0-location-name">{weatherData.location}</p>

                  {/* Temperature + Icon */}
                  <div className="s0-temp-row">
                    <div className="s0-weather-icon">
                      {renderWeatherIcon(weatherData.iconName, 54, getConditionColor(weatherData.iconName))}
                    </div>
                    <div className="s0-temperature" style={{ color: getConditionColor(weatherData.iconName) }}>
                      {weatherData.temperature}°C
                    </div>
                  </div>

                  {/* Condition */}
                  <p className="s0-condition" style={{ color: getConditionColor(weatherData.iconName) }}>
                    {weatherData.condition}
                  </p>

                  {/* Feels Like */}
                  {weatherData.feelsLike !== null && (
                    <p className="s0-feels-like">Feels like {weatherData.feelsLike}°C</p>
                  )}

                  {/* Individual Metric Pills (clean, sharp, small individual elements) */}
                  <div className="s0-metric-pills">
                    {weatherData.humidity && (
                      <div className="s0-metric-pill">
                        <span className="s0-pill-label">Humidity</span>
                        <span className="s0-pill-value">{weatherData.humidity}</span>
                      </div>
                    )}
                    {weatherData.windSpeed && (
                      <div className="s0-metric-pill">
                        <span className="s0-pill-label">Wind</span>
                        <span className="s0-pill-value">{weatherData.windSpeed}</span>
                      </div>
                    )}
                    {weatherData.windDirection && (
                      <div className="s0-metric-pill">
                        <span className="s0-pill-label">Direction</span>
                        <span className="s0-pill-value">{weatherData.windDirection}</span>
                      </div>
                    )}
                    {weatherData.visibility && (
                      <div className="s0-metric-pill">
                        <span className="s0-pill-label">Visibility</span>
                        <span className="s0-pill-value">{weatherData.visibility}</span>
                      </div>
                    )}
                    {weatherData.precipitation && (
                      <div className="s0-metric-pill">
                        <span className="s0-pill-label">Rainfall</span>
                        <span className="s0-pill-value">{weatherData.precipitation}</span>
                      </div>
                    )}
                    {weatherData.pressure && (
                      <div className="s0-metric-pill">
                        <span className="s0-pill-label">Pressure</span>
                        <span className="s0-pill-value">{weatherData.pressure}</span>
                      </div>
                    )}
                    {weatherData.cloudCover && (
                      <div className="s0-metric-pill">
                        <span className="s0-pill-label">Cloud Cover</span>
                        <span className="s0-pill-value">{weatherData.cloudCover}</span>
                      </div>
                    )}
                    {weatherData.uvIndex != null && (
                      <div className="s0-metric-pill">
                        <span className="s0-pill-label">UV</span>
                        <span className="s0-pill-value">{weatherData.uvIndex}</span>
                      </div>
                    )}
                  </div>

                  {/* Forecast Line */}
                  {(weatherData.forecast?.todayMax != null || weatherData.rainChanceForecast) && (
                    <div className="s0-forecast-line">
                      <span>Forecast:</span>
                      {weatherData.forecast?.todayMax != null && (
                        <span>
                          High {Math.round(weatherData.forecast.todayMax)}°C
                          {weatherData.forecast.todayMin != null
                            ? ` / Low ${Math.round(weatherData.forecast.todayMin)}°C`
                            : ''}
                        </span>
                      )}
                      {weatherData.rainChanceForecast && (
                        <span>• Rain chance {weatherData.rainChanceForecast}</span>
                      )}
                    </div>
                  )}

                  {/* Source & Updated Line */}
                  <div className="s0-source-line">
                    <span>Source: {weatherData.dataSource}</span>
                    <span>•</span>
                    <span>Updated: {weatherData.updateTime}</span>
                  </div>
                </div>
              ) : null}

              {/* Scroll Down Prompt */}
              <div className="s0-scroll-hint-area">
                <button
                  type="button"
                  onClick={() => transitionToSection(1)}
                  className="section-scroll-hint"
                >
                  <span>Explore Weather Timeline</span>
                  <ChevronDown size={14} />
                </button>
              </div>

            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            SECTIONS 1–4: CONTENT-FIRST LAYOUT
            TOP: Section Title & Navigation Hint
            LEFT: Context Briefing Card  |  RIGHT: Primary Data Content
            Image is purely for transition and does not block content.
            ═══════════════════════════════════════════════════════════════ */}
        {activeSection > 0 && (
          <div className={`stage-section-wrapper ${getContentClass()}`}>
            <div className="cinematic-section-container">

              {/* Section Header with Title and Scroll Hint */}
              <div className="cinematic-section-header">
                <div className="section-title-wrap">
                  {getSectionTitle(activeSection)}
                </div>
                <button
                  type="button"
                  className="section-scroll-hint"
                  onClick={() => {
                    if (activeSection === 4) triggerReturnToTop();
                    else handleNext();
                  }}
                  aria-label="Section navigation"
                >
                  {activeSection === 4 ? <RefreshCw size={13} /> : <ChevronDown size={13} />}
                  <span>{getScrollHintText()}</span>
                </button>
              </div>

              {/* Two-Column Content Layout (LEFT BRIEFING | RIGHT DATA) */}
              <div className="cinematic-two-columns">

                {/* ─── LEFT COLUMN: CONTEXT BRIEFING CARD ─── */}
                <div className="cinematic-left-col">
                  {activeSection === 1 && (
                    <div className="left-card-glass">
                      <span className="section-badge-pill badge-blue">
                        <Clock size={12} /><span>Hourly Telemetry</span>
                      </span>
                      <h3 className="section-info-headline">Today's weather through the day</h3>
                      <p className="section-info-desc">
                        High-resolution 8-point forecast progression based on live Open-Meteo atmospheric metrics for {selectedLocation?.city || 'your area'}.
                      </p>
                      {(weatherData?.forecast?.todayMax != null || weatherData?.rainChanceForecast) && (
                        <div className="left-summary-box">
                          {weatherData.forecast?.todayMax != null && (
                            <div className="left-summary-row">
                              <span className="left-summary-label">Day High / Low</span>
                              <span className="left-summary-value">
                                {Math.round(weatherData.forecast.todayMax)}°C / {Math.round(weatherData.forecast.todayMin || 0)}°C
                              </span>
                            </div>
                          )}
                          {weatherData.rainChanceForecast && (
                            <div className="left-summary-row">
                              <span className="left-summary-label">Peak Rain Chance</span>
                              <span className="left-summary-value sky">{weatherData.rainChanceForecast}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {activeSection === 2 && (
                    <div className="left-card-glass">
                      <span className="section-badge-pill badge-teal">
                        <Droplets size={12} /><span>Atmospheric Insights</span>
                      </span>
                      <h3 className="section-info-headline">Outdoor Advisory &amp; Solar Cycle</h3>
                      <p className="section-info-desc">
                        Atmospheric clarity, humidity, and localized sunrise &amp; sunset schedule for {selectedLocation?.city || 'your location'}.
                      </p>
                      {weatherData?.outdoorCondition && (
                        <div
                          className="dash-outdoor-banner"
                          style={{
                            borderColor: `${weatherData.outdoorCondition.color}40`,
                            background: 'linear-gradient(135deg, rgba(16,28,44,0.65), rgba(16,28,44,0.85))'
                          }}
                        >
                          <div className="dash-outdoor-status-row">
                            <span
                              className="dash-outdoor-status-pill"
                              style={{ backgroundColor: weatherData.outdoorCondition.color }}
                            >
                              {weatherData.outdoorCondition.status}
                            </span>
                            <span className="dash-outdoor-title">{weatherData.outdoorCondition.badge}</span>
                          </div>
                          <p className="dash-outdoor-desc">{weatherData.outdoorCondition.advice}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {activeSection === 3 && (
                    <div className="left-card-glass">
                      <span className="section-badge-pill badge-teal">
                        <MapPin size={12} /><span>Subcontinent Radar</span>
                      </span>
                      <h3 className="section-info-headline">Major weather activity across India today</h3>
                      <p className="section-info-desc">
                        India Weather Intelligence monitors live monsoon movements, thermal indices, and localized alerts across all Indian states.
                      </p>
                    </div>
                  )}

                  {activeSection === 4 && (
                    <div className="left-card-glass">
                      <span className="section-badge-pill badge-purple">
                        <ShieldAlert size={12} /><span>Critical Alerts</span>
                      </span>
                      <h3 className="section-info-headline">Today's Major Weather Events</h3>
                      <p className="section-info-desc">
                        High-priority meteorological warnings, active storm tracking, and national weather anomalies.
                      </p>
                      <button
                        type="button"
                        className="dash-link-action"
                        onClick={() => navigate('/alerts')}
                        aria-label="View all detailed alerts"
                      >
                        <span>View all detailed alerts</span>
                        <ArrowRight size={14} />
                      </button>
                    </div>
                  )}
                </div>

                {/* ─── RIGHT COLUMN: PRIMARY DATA CONTENT ─── */}
                <div className="cinematic-right-col">

                  {/* Section 1: Weather Timeline Complete 4 Columns × 2 Rows Grid (8 Cards) */}
                  {activeSection === 1 && (
                    showWeather && weatherData?.timeline?.length > 0 ? (
                      <div className="timeline-grid-4x2">
                        {weatherData.timeline.slice(0, 8).map((item, idx) => (
                          <div
                            key={`${item.timeIso || idx}`}
                            className={`weather-timeline-card ${item.isNow ? 'is-now-card' : ''}`}
                          >
                            <div className="timeline-card-badge">{item.isNow ? 'Observed' : 'Forecast'}</div>
                            <span className="timeline-time">{item.time}</span>
                            <div className="timeline-icon">
                              {renderWeatherIcon(item.iconName, 24, getConditionColor(item.iconName))}
                            </div>
                            <span className="timeline-temp" style={{ color: getConditionColor(item.iconName) }}>
                              {item.temp}°C
                            </span>
                            <span className="timeline-cond">{item.condition}</span>
                            {item.rainChance && (
                              <div className="timeline-rain-chip">
                                <CloudRain size={11} />
                                <span>{item.rainChance}</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="dash-empty-box">
                        <p>Select a location to view the 8-point timeline.</p>
                      </div>
                    )
                  )}

                  {/* Section 2: Rain & Outdoor 6 Metric Cards */}
                  {activeSection === 2 && (
                    showWeather ? (
                      <div className="dash-rain-grid">
                        <div className="dash-rain-stat">
                          <div className="dash-rain-icon-box"><CloudRain size={18} color="var(--weather-rain)" /></div>
                          <div className="dash-rain-info">
                            <span className="dash-rain-label">Rain Chance</span>
                            <span className="dash-rain-value">{weatherData.rainChanceForecast || 'Data unavailable'}</span>
                            <span className="dash-rain-sub">{weatherData.rainIntensity || 'Data unavailable'}</span>
                          </div>
                        </div>

                        <div className="dash-rain-stat">
                          <div className="dash-rain-icon-box"><Wind size={18} color="var(--weather-wind)" /></div>
                          <div className="dash-rain-info">
                            <span className="dash-rain-label">Wind Speed</span>
                            <span className="dash-rain-value">{weatherData.windSpeed || 'Data unavailable'}</span>
                            <span className="dash-rain-sub">{weatherData.windDirection || 'Direction unavailable'}</span>
                          </div>
                        </div>

                        <div className="dash-rain-stat">
                          <div className="dash-rain-icon-box"><Droplets size={18} color="var(--weather-rain)" /></div>
                          <div className="dash-rain-info">
                            <span className="dash-rain-label">Relative Humidity</span>
                            <span className="dash-rain-value">{weatherData.humidity || 'Data unavailable'}</span>
                            <span className="dash-rain-sub">Observed</span>
                          </div>
                        </div>

                        <div className="dash-rain-stat">
                          <div className="dash-rain-icon-box"><Eye size={18} color="var(--text-location)" /></div>
                          <div className="dash-rain-info">
                            <span className="dash-rain-label">Visibility</span>
                            <span className="dash-rain-value">{weatherData.visibility || 'Data unavailable'}</span>
                            <span className="dash-rain-sub">Atmospheric clarity</span>
                          </div>
                        </div>

                        {/* Warm Highlighted Sunrise Card */}
                        <div className="dash-rain-stat sunrise-highlight-card">
                          <div className="dash-rain-icon-box">
                            <span style={{ fontSize: '20px' }}>🌅</span>
                          </div>
                          <div className="dash-rain-info">
                            <span className="dash-rain-label">SUNRISE</span>
                            <span className="dash-rain-value">{weatherData.sunrise || 'Data unavailable'}</span>
                            <span className="dash-rain-sub">{selectedLocation?.city || selectedLocation?.name || 'Local Time'}</span>
                          </div>
                        </div>

                        {/* Warm Highlighted Sunset Card */}
                        <div className="dash-rain-stat sunset-highlight-card">
                          <div className="dash-rain-icon-box">
                            <span style={{ fontSize: '20px' }}>🌇</span>
                          </div>
                          <div className="dash-rain-info">
                            <span className="dash-rain-label">SUNSET</span>
                            <span className="dash-rain-value">{weatherData.sunset || 'Data unavailable'}</span>
                            <span className="dash-rain-sub">{selectedLocation?.city || selectedLocation?.name || 'Local Time'}</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="dash-empty-box"><p>Connect a location to inspect outdoor telemetry.</p></div>
                    )
                  )}

                  {/* Section 3: India Weather Intelligence Cards */}
                  {activeSection === 3 && (
                    indiaLoading ? (
                      <div className="dash-loading-box compact"><p>Checking nationwide updates…</p></div>
                    ) : indiaError ? (
                      <div className="dash-empty-box"><p>{indiaError}</p></div>
                    ) : indiaEvents.length === 0 ? (
                      <div className="dash-empty-box"><p>No major weather event reported across India.</p></div>
                    ) : (
                      <div className="cinematic-events-stack">
                        {indiaEvents.slice(0, 2).map((evt) => (
                          <div key={evt.id} className="dash-simple-card">
                            <div className="dash-card-top">
                              <div className="dash-card-title-group">
                                <h4 className="dash-card-title">{evt.type}</h4>
                                <span className="dash-card-place">{evt.location}</span>
                              </div>
                              <span
                                className="dash-status-tag"
                                style={{ color: evt.severityColor, borderColor: `${evt.severityColor}40` }}
                              >
                                {evt.severity}
                              </span>
                            </div>
                            <p className="dash-card-desc">{evt.explanation}</p>
                            <div className="dash-card-meta-line">
                              <span>Source: {evt.source}</span>
                              <span>Updated: {evt.updated}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  )}

                  {/* Section 4: Today's Major Weather Events */}
                  {activeSection === 4 && (
                    majorLoading ? (
                      <div className="dash-loading-box compact"><p>Loading weather anomalies…</p></div>
                    ) : majorError ? (
                      <div className="dash-empty-box"><p>{majorError}</p></div>
                    ) : majorEvents.length === 0 ? (
                      <div className="dash-empty-box"><p>No major weather events currently reported.</p></div>
                    ) : (
                      <div className="cinematic-events-stack">
                        {majorEvents.slice(0, 2).map((evt) => (
                          <div key={evt.id} className="dash-simple-card">
                            <div className="dash-card-top">
                              <div className="dash-card-title-group">
                                <h4 className="dash-card-title">{evt.title}</h4>
                                <span className="dash-card-place">{evt.location}</span>
                              </div>
                              <span className="dash-simple-pill">{evt.severity}</span>
                            </div>
                            <p className="dash-card-desc">{evt.description}</p>
                            <div className="dash-card-meta-line">
                              <span>Source: {evt.source}</span>
                              <span>Updated: {evt.updated}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  )}

                </div>

              </div>

            </div>
          </div>
        )}

      </div>
    </>
  );
}
