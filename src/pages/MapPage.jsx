import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useLocationContext } from '../context/LocationContext';
import { weatherService } from '../services/weatherService';
import { BackButton } from '../components/common/BackButton';
import {
  MapPin,
  Search,
  Wind,
  CloudRain,
  Thermometer,
  Cloud,
  AlertCircle
} from 'lucide-react';

const INDIA_CENTER = [22.3511, 78.6677];

function thermalColor(temp) {
  if (temp == null) return '#94a3b8';
  if (temp < 20) return '#38bdf8';
  if (temp < 28) return '#facc15';
  if (temp < 35) return '#fb923c';
  return '#ef4444';
}

export function MapPage() {
  const { selectedLocation, setSelectedLocation } = useLocationContext();
  const mapRef = useRef(null);
  const mapElRef = useRef(null);
  const layersRef = useRef({
    osm: null,
    radar: null,
    thermal: null,
    wind: null,
    marker: null
  });

  const [activeLayer, setActiveLayer] = useState('weather');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedLoc, setSelectedLoc] = useState(selectedLocation || null);
  const [weatherData, setWeatherData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [radarMeta, setRadarMeta] = useState(null);
  const [layerError, setLayerError] = useState('');
  const searchBoxRef = useRef(null);

  useEffect(() => {
    if (mapRef.current || !mapElRef.current) return;

    const initialCenter =
      selectedLocation && typeof selectedLocation.lat === 'number'
        ? [selectedLocation.lat, selectedLocation.lon]
        : INDIA_CENTER;
    const initialZoom = selectedLocation ? 9 : 5;

    const map = L.map(mapElRef.current, {
      zoomControl: true,
      attributionControl: true
    }).setView(initialCenter, initialZoom);

    const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '&copy; OpenStreetMap'
    }).addTo(map);

    layersRef.current.osm = osm;
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  const clearOverlayLayers = () => {
    const map = mapRef.current;
    if (!map) return;
    ['radar', 'thermal', 'wind'].forEach((key) => {
      if (layersRef.current[key]) {
        map.removeLayer(layersRef.current[key]);
        layersRef.current[key] = null;
      }
    });
  };

  const setMarker = (loc) => {
    const map = mapRef.current;
    if (!map || !loc) return;
    if (layersRef.current.marker) {
      map.removeLayer(layersRef.current.marker);
    }
    layersRef.current.marker = L.marker([loc.lat, loc.lon], {
      icon: L.divIcon({
        className: 'map-selected-pin',
        html: '<span class="map-pin-dot"></span>',
        iconSize: [18, 18],
        iconAnchor: [9, 9]
      })
    }).addTo(map);
    map.setView([loc.lat, loc.lon], 9);
  };

  const fetchLocationWeather = async (loc) => {
    setLoading(true);
    setLayerError('');
    const wData = await weatherService.getCurrentWeather(loc.lat, loc.lon, loc.name);
    setWeatherData(wData.success ? wData : null);
    if (!wData.success) {
      setLayerError(wData.error || 'Live data currently unavailable.');
    }
    setLoading(false);
  };

  const applyLayer = async (layer, loc) => {
    const map = mapRef.current;
    if (!map) return;
    clearOverlayLayers();
    setLayerError('');

    if (layer === 'radar') {
      const radar = await weatherService.getRainViewerLayer();
      if (!radar.success) {
        setRadarMeta(null);
        setLayerError(radar.error || 'Live data currently unavailable.');
        return;
      }
      setRadarMeta(radar);
      layersRef.current.radar = L.tileLayer(radar.tileUrl, {
        opacity: 0.7,
        zIndex: 400
      }).addTo(map);
      return;
    }

    if (!loc) return;

    if (layer === 'thermal' || layer === 'wind') {
      try {
        const grid = await weatherService.getAreaGrid(loc.lat, loc.lon);
        if (layer === 'thermal') {
          const group = L.layerGroup();
          grid.forEach((cell) => {
            if (cell.temperature == null) return;
            L.circleMarker([cell.lat, cell.lon], {
              radius: 16,
              color: thermalColor(cell.temperature),
              fillColor: thermalColor(cell.temperature),
              fillOpacity: 0.45,
              weight: 1
            })
              .bindTooltip(`${Math.round(cell.temperature)}°C (observed)`, { direction: 'top' })
              .addTo(group);
          });
          layersRef.current.thermal = group.addTo(map);
        }

        if (layer === 'wind') {
          const group = L.layerGroup();
          grid.forEach((cell) => {
            if (cell.windSpeed == null || cell.windDirection == null) return;
            const icon = L.divIcon({
              className: 'wind-vector-icon',
              html: `<div style="transform:rotate(${cell.windDirection}deg);font-size:18px;color:#fff;text-shadow:0 1px 4px #000">↑</div>`,
              iconSize: [24, 24],
              iconAnchor: [12, 12]
            });
            L.marker([cell.lat, cell.lon], { icon })
              .bindTooltip(
                `${Math.round(cell.windSpeed)} km/h • ${Math.round(cell.windDirection)}° (observed)`,
                { direction: 'top' }
              )
              .addTo(group);
          });
          layersRef.current.wind = group.addTo(map);
        }
      } catch {
        setLayerError('Live data currently unavailable.');
      }
    }
  };

  useEffect(() => {
    applyLayer(activeLayer, selectedLoc);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeLayer, selectedLoc]);

  // Synchronize with shared selectedLocation
  useEffect(() => {
    if (!mapRef.current) return;
    if (
      selectedLocation &&
      typeof selectedLocation.lat === 'number' &&
      !Number.isNaN(selectedLocation.lat) &&
      typeof selectedLocation.lon === 'number' &&
      !Number.isNaN(selectedLocation.lon)
    ) {
      setSelectedLoc(selectedLocation);
      setMarker(selectedLocation);
      fetchLocationWeather(selectedLocation);
    } else {
      setSelectedLoc(null);
      setWeatherData(null);
      clearOverlayLayers();
      if (layersRef.current.marker) {
        mapRef.current.removeLayer(layersRef.current.marker);
        layersRef.current.marker = null;
      }
      mapRef.current.setView(INDIA_CENTER, 5);
    }
  }, [selectedLocation?.lat, selectedLocation?.lon, selectedLocation?.name]);

  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      const results = await weatherService.searchLocations(searchQuery);
      setSearchResults(results);
      setSearchOpen(true);
    }, 280);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSelectLocation = (loc) => {
    setSearchOpen(false);
    setSearchQuery('');
    const normalized = {
      name: loc.name || loc.cityName,
      city: loc.cityName || loc.name?.split(',')[0] || '',
      district: loc.district || '',
      state: loc.state || '',
      country: loc.country || 'India',
      lat: loc.lat,
      lon: loc.lon
    };
    setSelectedLocation(normalized);
  };

  const handleSearchSubmit = async (event) => {
    event.preventDefault();
    const q = searchQuery.trim();
    if (q.length < 2) return;
    const results = await weatherService.searchLocations(q);
    if (results.length === 1) {
      handleSelectLocation(results[0]);
      return;
    }
    setSearchResults(results);
    setSearchOpen(true);
  };

  useEffect(() => {
    function handleClickOutside(e) {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target)) {
        setSearchOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="destination-page map-page-view">
      <BackButton />
      <header className="dash-section-header">
        <div>
          <h2 className="dash-page-heading">Map</h2>
          <p className="dash-section-sub">Live weather layers for any Indian location</p>
        </div>

        <div className="map-layer-tabs">
          <button
            type="button"
            className={`map-layer-tab ${activeLayer === 'weather' ? 'is-active' : ''}`}
            onClick={() => setActiveLayer('weather')}
          >
            <Cloud size={14} />
            <span>Weather</span>
          </button>
          <button
            type="button"
            className={`map-layer-tab ${activeLayer === 'radar' ? 'is-active' : ''}`}
            onClick={() => setActiveLayer('radar')}
          >
            <CloudRain size={14} />
            <span>Doppler Radar</span>
          </button>
          <button
            type="button"
            className={`map-layer-tab ${activeLayer === 'thermal' ? 'is-active' : ''}`}
            onClick={() => setActiveLayer('thermal')}
          >
            <Thermometer size={14} />
            <span>Thermal Index</span>
          </button>
          <button
            type="button"
            className={`map-layer-tab ${activeLayer === 'wind' ? 'is-active' : ''}`}
            onClick={() => setActiveLayer('wind')}
          >
            <Wind size={14} />
            <span>Wind Vectors</span>
          </button>
        </div>
      </header>

      <div className="map-search-container" ref={searchBoxRef}>
        <form className="map-search-bar" onSubmit={handleSearchSubmit}>
          <Search size={16} className="dash-search-icon" />
          <input
            type="text"
            className="map-search-input"
            placeholder="Search any Indian city, district or location…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => {
              if (searchResults.length > 0) setSearchOpen(true);
            }}
          />
          <button type="submit" className="dash-search-submit">
            Search
          </button>
        </form>

        {searchOpen && searchResults.length > 0 && (
          <div className="map-search-dropdown">
            {searchResults.map((loc) => (
              <button
                key={loc.id}
                type="button"
                className="map-search-result-row"
                onClick={() => handleSelectLocation(loc)}
              >
                <MapPin size={14} className="text-white" />
                <span className="result-name">{loc.name}</span>
                <span className="result-coords">
                  {loc.lat.toFixed(2)}° N, {loc.lon.toFixed(2)}° E
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {activeLayer === 'radar' && (
        <div className="map-layer-info-banner">
          <CloudRain size={16} className="text-white" />
          <div>
            <strong>Radar</strong>
            <div className="banner-subtext">
              {radarMeta
                ? `Updated: ${radarMeta.updated} • Source: ${radarMeta.source}`
                : layerError || 'Loading radar…'}
            </div>
            <div className="banner-subtext">
              Color scale is from the radar provider (light → heavy precipitation).
            </div>
          </div>
        </div>
      )}

      {activeLayer === 'thermal' && (
        <div className="map-layer-info-banner">
          <Thermometer size={16} />
          <div>
            <strong>Thermal Index</strong>
            <div className="banner-subtext">
              Observed 2 m temperature grid. Cool = blue, warm = yellow, hot = orange, very hot = red.
            </div>
          </div>
        </div>
      )}

      {activeLayer === 'wind' && weatherData && (
        <div className="map-layer-info-banner">
          <Wind size={16} className="text-white" />
          <div>
            <strong>Wind Vectors</strong>
            <div className="banner-subtext">
              Speed: {weatherData.windSpeed} • Direction: {weatherData.windDirection} • Updated:{' '}
              {weatherData.updateTime} • Source: {weatherData.dataSource}
            </div>
          </div>
        </div>
      )}

      {layerError && (
        <div className="dash-error-box">
          <AlertCircle size={18} color="#f87171" />
          <p>{layerError}</p>
        </div>
      )}

      <div className="map-live-stage">
        <div ref={mapElRef} className="leaflet-map-host" />

        <aside className="map-compact-panel">
          {!selectedLoc ? (
            <p>Search for a location to view weather on the map.</p>
          ) : loading ? (
            <p>Fetching observation…</p>
          ) : weatherData ? (
            <>
              <h3>{weatherData.location}</h3>
              <p className="map-compact-temp">
                {weatherData.temperature}°C
                <span>{weatherData.condition}</span>
              </p>
              <ul className="map-compact-list">
                {weatherData.humidity && <li>Humidity: {weatherData.humidity}</li>}
                {weatherData.windSpeed && <li>Wind: {weatherData.windSpeed}</li>}
                {weatherData.windDirection && <li>Direction: {weatherData.windDirection}</li>}
                {weatherData.precipitation && <li>Rainfall: {weatherData.precipitation}</li>}
                {weatherData.visibility && <li>Visibility: {weatherData.visibility}</li>}
              </ul>
              <p className="map-compact-source">
                Updated: {weatherData.updateTime}
                <br />
                Source: {weatherData.dataSource}
              </p>
            </>
          ) : (
            <p>Live data currently unavailable.</p>
          )}
        </aside>
      </div>
    </div>
  );
}
