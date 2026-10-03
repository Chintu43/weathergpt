/**
 * Weather API layer for WeatherGPT.
 * Open-Meteo: current observations + forecast (labeled separately).
 * Geocoding: Open-Meteo search.
 * Nationwide summaries are derived from live observations, never hardcoded events.
 */

const WMO_CODES = {
  0: { label: 'Clear Sky', icon: 'Sun' },
  1: { label: 'Mainly Clear', icon: 'SunMedium' },
  2: { label: 'Partly Cloudy', icon: 'CloudSun' },
  3: { label: 'Overcast', icon: 'Cloud' },
  45: { label: 'Foggy Weather', icon: 'CloudFog' },
  48: { label: 'Heavy Fog', icon: 'CloudFog' },
  51: { label: 'Light Drizzle', icon: 'CloudDrizzle' },
  53: { label: 'Moderate Drizzle', icon: 'CloudDrizzle' },
  55: { label: 'Dense Drizzle', icon: 'CloudDrizzle' },
  61: { label: 'Slight Rain', icon: 'CloudRain' },
  63: { label: 'Moderate Rain', icon: 'CloudRain' },
  65: { label: 'Heavy Rain', icon: 'CloudRainWind' },
  71: { label: 'Slight Snow', icon: 'CloudSnow' },
  73: { label: 'Moderate Snow', icon: 'CloudSnow' },
  75: { label: 'Heavy Snow', icon: 'CloudSnow' },
  80: { label: 'Rain Showers', icon: 'CloudRain' },
  81: { label: 'Passing Rain Showers', icon: 'CloudRain' },
  82: { label: 'Heavy Rain Showers', icon: 'CloudLightning' },
  95: { label: 'Thunderstorm', icon: 'CloudLightning' },
  96: { label: 'Thunderstorm with Hail', icon: 'CloudLightning' },
  99: { label: 'Severe Thunderstorm', icon: 'CloudLightning' }
};

export function interpretWeatherCode(code) {
  return WMO_CODES[code] || { label: 'Variable Weather', icon: 'CloudSun' };
}

export function degreesToCompass(deg) {
  if (deg === undefined || deg === null || Number.isNaN(Number(deg))) return null;
  const val = Math.floor(Number(deg) / 22.5 + 0.5);
  const arr = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  return `${Math.round(Number(deg))}° (${arr[val % 16]})`;
}

export function computeThermalIndex(temp, humidity) {
  if (temp === undefined || temp === null) return null;
  if (temp < 26) {
    return {
      level: 'Normal',
      color: '#7dd3fc',
      description: 'Comfortable temperature for outdoor work.',
      label: 'Calculated from observed temperature',
      kind: 'calculated'
    };
  }
  const rh = humidity ?? 50;
  const hi = -8.784 + 1.611 * temp + 2.338 * (rh / 100 * 20) - 0.146 * temp * (rh / 100);
  if (temp >= 38 || hi > 40) {
    return {
      level: 'Very Hot',
      color: '#ef4444',
      description: 'Very hot conditions. Rest in shade and drink water during outdoor work.',
      label: 'Calculated from observed temperature and humidity',
      kind: 'calculated'
    };
  }
  if (temp >= 33 || hi > 34) {
    return {
      level: 'Hot',
      color: '#f97316',
      description: 'Hot afternoon conditions. Outdoor work may feel uncomfortable.',
      label: 'Calculated from observed temperature and humidity',
      kind: 'calculated'
    };
  }
  return {
    level: 'Warm',
    color: '#fbbf24',
    description: 'Warm conditions. Rest in the shade during peak sunlight hours.',
    label: 'Calculated from observed temperature and humidity',
    kind: 'calculated'
  };
}

export function formatTimeFromIso(isoStr) {
  if (!isoStr) return null;
  try {
    const d = new Date(isoStr);
    if (!Number.isNaN(d.getTime())) {
      const hours = d.getHours();
      const mins = d.getMinutes();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const formattedHour = hours % 12 || 12;
      const formattedMins = mins < 10 ? `0${mins}` : mins;
      return `${formattedHour}:${formattedMins} ${ampm}`;
    }
    const parts = isoStr.split('T')[1];
    if (parts) {
      const [h, m] = parts.split(':');
      const hour = parseInt(h, 10);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const formattedHour = hour % 12 || 12;
      return `${formattedHour}:${m} ${ampm}`;
    }
    return isoStr;
  } catch {
    return isoStr;
  }
}

export function computeOutdoorCondition(temp, weatherCode, rainProb, windSpeed, humidity) {
  if ([95, 96, 99].includes(weatherCode)) {
    return {
      status: 'Unfavorable',
      color: '#ef4444',
      badge: 'Storm Warning',
      advice: 'Thunderstorm & lightning detected. Avoid all outdoor activities and remain indoors.'
    };
  }
  if ([65, 75, 82].includes(weatherCode) || (rainProb && rainProb >= 75)) {
    return {
      status: 'Unfavorable',
      color: '#ef4444',
      badge: 'Heavy Rain',
      advice: 'Heavy rainfall expected. Postpone non-essential outdoor work and monitor local drainage.'
    };
  }
  if ([51, 53, 55, 61, 63, 80, 81].includes(weatherCode) || (rainProb && rainProb >= 40)) {
    return {
      status: 'Caution Required',
      color: '#f59e0b',
      badge: 'Showers Likely',
      advice: 'Rain showers in the area. Carry an umbrella and plan travel with extra time.'
    };
  }
  if (temp >= 38) {
    return {
      status: 'Heat Caution',
      color: '#f97316',
      badge: 'High Heat',
      advice: 'Elevated daytime temperatures. Maintain hydration and restrict outdoor exposure during midday peak.'
    };
  }
  if (windSpeed >= 35) {
    return {
      status: 'Windy Conditions',
      color: '#f59e0b',
      badge: 'High Winds',
      advice: 'Strong wind gusts observed. Drive cautiously and secure lightweight items.'
    };
  }
  return {
    status: 'Favorable',
    color: '#22c55e',
    badge: 'Good Conditions',
    advice: 'Clear and stable conditions. Favorable for commuting, travel, and outdoor sports.'
  };
}

const INDIA_SCAN_POINTS = [
  { name: 'Srinagar', region: 'North India', lat: 34.0837, lon: 74.7973 },
  { name: 'Amritsar', region: 'North India', lat: 31.634, lon: 74.8723 },
  { name: 'Delhi', region: 'North India', lat: 28.6139, lon: 77.209 },
  { name: 'Lucknow', region: 'North India', lat: 26.8467, lon: 80.9462 },
  { name: 'Kolkata', region: 'East India', lat: 22.5726, lon: 88.3639 },
  { name: 'Guwahati', region: 'Northeast India', lat: 26.1445, lon: 91.7362 },
  { name: 'Bhubaneswar', region: 'East India', lat: 20.2961, lon: 85.8245 },
  { name: 'Mumbai', region: 'West Coast', lat: 19.076, lon: 72.8777 },
  { name: 'Ahmedabad', region: 'West India', lat: 23.0225, lon: 72.5714 },
  { name: 'Goa', region: 'West Coast', lat: 15.4909, lon: 73.8278 },
  { name: 'Chennai', region: 'South India', lat: 13.0827, lon: 80.2707 },
  { name: 'Bengaluru', region: 'South India', lat: 12.9716, lon: 77.5946 },
  { name: 'Hyderabad', region: 'South India', lat: 17.385, lon: 78.4867 },
  { name: 'Kochi', region: 'South India', lat: 9.9312, lon: 76.2673 },
  { name: 'Bhopal', region: 'Central India', lat: 23.2599, lon: 77.4126 },
  { name: 'Nagpur', region: 'Central India', lat: 21.1458, lon: 79.0882 }
];

function formatClock(iso) {
  if (!iso) {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function classifyObservation(obs) {
  const code = obs.weatherCode;
  const events = [];

  if ([95, 96, 99].includes(code)) {
    events.push({
      type: 'Thunderstorm',
      title: 'Thunderstorm',
      simple: 'Thunderstorm',
      rank: 90,
      explanation: 'Thunderstorms are being observed. Stay indoors if lightning starts.'
    });
  } else if ([65, 82].includes(code) || (obs.precipitation ?? 0) >= 4) {
    events.push({
      type: 'Heavy Rain',
      title: 'Heavy Rain',
      simple: 'Heavy Rain',
      rank: 80,
      explanation: 'Heavy rain is being observed. Travel carefully and avoid low-lying roads if water collects.'
    });
  } else if ([61, 63, 80, 81].includes(code) || (obs.precipitation ?? 0) >= 0.4) {
    events.push({
      type: 'Rain',
      title: 'Rain',
      simple: 'Rain',
      rank: 55,
      explanation: 'Rain is being observed. Carry rain protection if you are outdoors.'
    });
  }

  if ((obs.windSpeed ?? 0) >= 40) {
    events.push({
      type: 'Strong Winds',
      title: 'Strong Winds',
      simple: 'Strong Winds',
      rank: 75,
      explanation: 'Strong winds are being observed. Secure loose outdoor items and take care near the coast.'
    });
  } else if ((obs.windSpeed ?? 0) >= 28) {
    events.push({
      type: 'Strong Winds',
      title: 'Strong Winds',
      simple: 'Strong Winds',
      rank: 60,
      explanation: 'Windy conditions are being observed. Be careful while travelling in open areas.'
    });
  }

  if ((obs.temperature ?? 0) >= 40) {
    events.push({
      type: 'High Heat',
      title: 'High Heat',
      simple: 'High Heat',
      rank: 70,
      explanation: 'It is very hot. Drink water and avoid long outdoor work in the afternoon.'
    });
  } else if ((obs.temperature ?? 0) >= 36) {
    events.push({
      type: 'High Heat',
      title: 'High Heat',
      simple: 'High Heat',
      rank: 50,
      explanation: 'Temperatures are high. Rest in the shade during the hottest hours.'
    });
  }

  return events;
}

async function fetchIndiaObservations() {
  const lats = INDIA_SCAN_POINTS.map((p) => p.lat).join(',');
  const lons = INDIA_SCAN_POINTS.map((p) => p.lon).join(',');
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lons}` +
    `&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,precipitation&timezone=auto`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`India scan failed (${res.status})`);
  const payload = await res.json();
  const rows = Array.isArray(payload) ? payload : [payload];

  return rows.map((row, index) => {
    const point = INDIA_SCAN_POINTS[index];
    const current = row.current || {};
    return {
      ...point,
      temperature: current.temperature_2m,
      humidity: current.relative_humidity_2m,
      weatherCode: current.weather_code,
      condition: interpretWeatherCode(current.weather_code).label,
      windSpeed: current.wind_speed_10m,
      precipitation: current.precipitation,
      observedAt: current.time
    };
  });
}

function significantFromObservations(observations) {
  const scored = [];
  observations.forEach((obs) => {
    classifyObservation(obs).forEach((evt) => {
      scored.push({
        ...evt,
        location: `${obs.name}, ${obs.region}`,
        region: obs.region,
        source: 'Open-Meteo current observations',
        updated: formatClock(obs.observedAt),
        observedAt: obs.observedAt,
        temperature: obs.temperature,
        windSpeed: obs.windSpeed
      });
    });
  });

  scored.sort((a, b) => b.rank - a.rank);
  const unique = [];
  const seen = new Set();
  for (const item of scored) {
    const key = `${item.type}:${item.region}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(item);
    if (unique.length >= 3) break;
  }
  return unique;
}

export const weatherService = {
  async searchLocations(query) {
    if (!query || query.trim().length < 2) return [];
    try {
      const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query.trim())}&count=10&language=en&format=json`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Geocoding service unavailable');
      const data = await res.json();
      if (!data.results?.length) return [];

      const sorted = [...data.results].sort((a, b) => {
        if (a.country_code === 'IN' && b.country_code !== 'IN') return -1;
        if (a.country_code !== 'IN' && b.country_code === 'IN') return 1;
        return 0;
      });

      return sorted.map((loc) => ({
        id: `${loc.id}`,
        name: `${loc.name}${loc.admin1 ? `, ${loc.admin1}` : ''}${loc.country ? `, ${loc.country}` : ''}`,
        cityName: loc.name,
        state: loc.admin1 || '',
        country: loc.country || '',
        lat: loc.latitude,
        lon: loc.longitude
      }));
    } catch (err) {
      console.error('[WeatherService] Location search error:', err);
      return [];
    }
  },

  async getCurrentWeather(lat, lon, locationName) {
    if (lat === undefined || lon === undefined || lat === null || lon === null) {
      return { success: false, error: 'A location is required to load weather.' };
    }

    try {
      const url =
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
        `&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m,surface_pressure,visibility,cloud_cover,precipitation,rain` +
        `&hourly=temperature_2m,weather_code,precipitation_probability,precipitation,relative_humidity_2m,wind_speed_10m,uv_index` +
        `&daily=sunrise,sunset,precipitation_sum,uv_index_max,temperature_2m_max,temperature_2m_min,weather_code` +
        `&timezone=auto`;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Weather API responded with status ${res.status}`);
      }

      const data = await res.json();
      const current = data.current;
      if (!current) {
        return { success: false, error: 'Live data currently unavailable.' };
      }

      const weatherInfo = interpretWeatherCode(current.weather_code);
      const temp = Math.round(current.temperature_2m);
      const humidity = current.relative_humidity_2m;

      let rainChanceForecast = null;
      let uvForecast = null;
      let curIndex = 0;
      if (data.hourly?.time) {
        const currentHourPrefix = (current.time || new Date().toISOString()).slice(0, 13);
        const index = data.hourly.time.findIndex((t) => t.startsWith(currentHourPrefix));
        curIndex = index === -1 ? 0 : index;
        if (data.hourly.precipitation_probability) {
          rainChanceForecast = data.hourly.precipitation_probability[curIndex];
        }
        if (data.hourly.uv_index) {
          uvForecast = data.hourly.uv_index[curIndex];
        }
      }

      const precip =
        current.precipitation !== undefined && current.precipitation !== null
          ? current.precipitation
          : current.rain;

      // Build real weather timeline (Now + 3-hourly intervals)
      const timeline = [];
      if (data.hourly?.time?.length) {
        timeline.push({
          time: 'Now',
          timeIso: current.time,
          temp: temp,
          condition: weatherInfo.label,
          iconName: weatherInfo.icon,
          rainChance: rainChanceForecast !== null && rainChanceForecast !== undefined ? `${rainChanceForecast}%` : null,
          isNow: true
        });

        for (let step = 1; step <= 7; step++) {
          const targetIdx = curIndex + step * 3;
          if (targetIdx < data.hourly.time.length) {
            const tIso = data.hourly.time[targetIdx];
            const d = new Date(tIso);
            let timeLabel = '';
            if (!Number.isNaN(d.getTime())) {
              const hours = d.getHours();
              const ampm = hours >= 12 ? 'PM' : 'AM';
              const formattedHours = hours % 12 || 12;
              timeLabel = `${formattedHours} ${ampm}`;
            } else {
              timeLabel = tIso.slice(11, 16);
            }

            const tCode = data.hourly.weather_code?.[targetIdx];
            const tInfo = interpretWeatherCode(tCode);
            const tTemp = Math.round(data.hourly.temperature_2m?.[targetIdx] ?? 0);
            const tRain = data.hourly.precipitation_probability?.[targetIdx];

            timeline.push({
              time: timeLabel,
              timeIso: tIso,
              temp: tTemp,
              condition: tInfo.label,
              iconName: tInfo.icon,
              rainChance: tRain !== null && tRain !== undefined ? `${tRain}%` : null,
              isNow: false
            });
          }
        }
      }

      const sunrise = formatTimeFromIso(data.daily?.sunrise?.[0]);
      const sunset = formatTimeFromIso(data.daily?.sunset?.[0]);
      const outdoor = computeOutdoorCondition(
        temp,
        current.weather_code,
        rainChanceForecast,
        current.wind_speed_10m,
        humidity
      );

      const rainIntensity =
        precip !== undefined && precip !== null && Number(precip) > 0
          ? `${Number(precip).toFixed(1)} mm observed`
          : 'No rain observed';

      return {
        success: true,
        location: locationName,
        coordinates: { lat, lon },
        temperature: temp,
        temperatureUnit: '°C',
        feelsLike:
          current.apparent_temperature !== undefined
            ? Math.round(current.apparent_temperature)
            : null,
        condition: weatherInfo.label,
        iconName: weatherInfo.icon,
        humidity: humidity !== undefined && humidity !== null ? `${humidity}%` : null,
        humidityValue: humidity,
        windSpeed:
          current.wind_speed_10m !== undefined
            ? `${Math.round(current.wind_speed_10m)} km/h`
            : null,
        windSpeedValue: current.wind_speed_10m,
        windDirection: degreesToCompass(current.wind_direction_10m),
        visibility:
          current.visibility !== undefined && current.visibility !== null
            ? `${(current.visibility / 1000).toFixed(1)} km`
            : null,
        precipitation:
          precip !== undefined && precip !== null ? `${Number(precip).toFixed(1)} mm` : null,
        precipitationValue: precip,
        rainIntensity,
        pressure: current.surface_pressure
          ? `${Math.round(current.surface_pressure)} hPa`
          : null,
        cloudCover:
          current.cloud_cover !== undefined && current.cloud_cover !== null
            ? `${current.cloud_cover}%`
            : null,
        uvIndex:
          uvForecast !== null && uvForecast !== undefined
            ? Math.round(uvForecast)
            : data.daily?.uv_index_max?.[0] != null
              ? Math.round(data.daily.uv_index_max[0])
              : null,
        uvIndexKind: 'forecast',
        rainChanceForecast:
          rainChanceForecast !== null && rainChanceForecast !== undefined
            ? `${rainChanceForecast}%`
            : null,
        thermalIndex: computeThermalIndex(temp, humidity),
        timeline,
        sunrise: sunrise || 'Data currently unavailable',
        sunset: sunset || 'Data currently unavailable',
        timezone: data.timezone || 'Local Time',
        outdoorCondition: outdoor,
        forecast: {
          todayMax: data.daily?.temperature_2m_max?.[0],
          todayMin: data.daily?.temperature_2m_min?.[0],
          todayRain: data.daily?.precipitation_sum?.[0],
          todayCondition: data.daily?.weather_code?.[0]
            ? interpretWeatherCode(data.daily.weather_code[0]).label
            : null
        },
        timestamp: formatClock(current.time),
        dataSource: 'Open-Meteo (current observations & high-resolution forecast)',
        updateTime: formatClock(current.time),
        observedAt: current.time
      };
    } catch (err) {
      console.error('[WeatherService] Live weather fetch failed:', err);
      return {
        success: false,
        error: 'Live data currently unavailable.',
        location: locationName
      };
    }
  },

  async getTravelPlanWeather(lat, lon, dateStr, destinationName) {
    if (!destinationName || !dateStr) {
      return { success: false, error: 'Destination and travel date are required.' };
    }

    try {
      const response = await fetch('http://localhost:5000/api/travel/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destination: destinationName,
          date: dateStr,
          latitude: lat,
          longitude: lon
        })
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        return {
          success: false,
          error: data.message || data.error || 'Weather service failed. Please try again.',
          destination: destinationName,
          date: dateStr
        };
      }
      return data;
    } catch (err) {
      console.error('[WeatherService] Travel plan backend request error:', err);
      return {
        success: false,
        error: 'Weather service failed. Please try again.',
        destination: destinationName,
        date: dateStr
      };
    }
  },

  async getAreaGrid(lat, lon) {
    const steps = [-0.6, 0, 0.6];
    const points = [];
    steps.forEach((dy) => {
      steps.forEach((dx) => {
        points.push({ lat: lat + dy, lon: lon + dx });
      });
    });

    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${points.map((p) => p.lat).join(',')}` +
      `&longitude=${points.map((p) => p.lon).join(',')}` +
      `&current=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,weather_code,precipitation&timezone=auto`;

    const res = await fetch(url);
    if (!res.ok) throw new Error('Live data currently unavailable.');
    const payload = await res.json();
    const rows = Array.isArray(payload) ? payload : [payload];

    return rows.map((row, i) => {
      const current = row.current || {};
      return {
        lat: points[i].lat,
        lon: points[i].lon,
        temperature: current.temperature_2m,
        humidity: current.relative_humidity_2m,
        windSpeed: current.wind_speed_10m,
        windDirection: current.wind_direction_10m,
        precipitation: current.precipitation,
        weatherCode: current.weather_code,
        condition: interpretWeatherCode(current.weather_code).label,
        observedAt: current.time
      };
    });
  },

  async getRainViewerLayer() {
    try {
      const res = await fetch('https://api.rainviewer.com/public/weather-maps.json');
      if (!res.ok) throw new Error('Radar unavailable');
      const data = await res.json();
      const frames = data.radar?.past || [];
      const last = frames[frames.length - 1];
      if (!last) return { success: false, error: 'Live data currently unavailable.' };
      const host = String(data.host || '').replace(/\/$/, '');
      return {
        success: true,
        tileUrl: `${host}${last.path}/256/{z}/{x}/{y}/2/1_1.png`,
        updated: formatClock(new Date(last.time * 1000).toISOString()),
        source: 'RainViewer precipitation radar',
        time: last.time
      };
    } catch (err) {
      console.error('[WeatherService] Radar fetch failed:', err);
      return { success: false, error: 'Live data currently unavailable.' };
    }
  },

  async getIndiaWeatherIntelligence() {
    try {
      const observations = await fetchIndiaObservations();
      const events = significantFromObservations(observations);
      return events.map((evt, i) => ({
        id: `in-intel-${i + 1}`,
        type: evt.simple,
        location: evt.location,
        explanation: evt.explanation,
        severity: evt.rank >= 75 ? 'Important' : 'Watch',
        severityColor: evt.rank >= 75 ? '#f97316' : '#fbbf24',
        source: evt.source,
        updated: evt.updated
      }));
    } catch (err) {
      console.error('[WeatherService] India intelligence error:', err);
      return { error: 'Live data currently unavailable.' };
    }
  },

  async getActiveAlerts() {
    try {
      const observations = await fetchIndiaObservations();
      const events = significantFromObservations(observations);
      const advisories = events.map((evt, i) => ({
        id: `adv-${i + 1}`,
        isOfficial: false,
        type: evt.simple,
        classification: 'WEATHERGPT ADVISORY',
        source: 'WeatherGPT using Open-Meteo observations',
        affectedArea: evt.location,
        severity: evt.rank >= 75 ? 'Watch' : 'Advisory',
        severityColor: evt.rank >= 75 ? '#f97316' : '#fbbf24',
        description: `Based on the available weather information: ${evt.explanation}`,
        issuedTime: evt.updated,
        validUntil: 'Based on latest observations'
      }));

      return {
        official: [],
        officialUnavailableReason:
          'Official IMD / SACHET / CWC warning feeds are not connected in this build.',
        advisories,
        all: advisories
      };
    } catch (err) {
      console.error('[WeatherService] Alerts error:', err);
      return {
        official: [],
        officialUnavailableReason: 'Live data currently unavailable.',
        advisories: [],
        all: [],
        error: 'Live data currently unavailable.'
      };
    }
  },

  async getMajorWeatherEvents() {
    try {
      const observations = await fetchIndiaObservations();
      const events = significantFromObservations(observations);
      return events.map((evt, i) => ({
        id: `major-${i + 1}`,
        title: evt.simple,
        location: evt.region,
        description: evt.explanation,
        severity: evt.rank >= 75 ? 'Important' : 'Watch',
        source: evt.source,
        updated: evt.updated
      }));
    } catch (err) {
      console.error('[WeatherService] Major events error:', err);
      return { error: 'Live data currently unavailable.' };
    }
  },

  async getFarmerAdvisory(state, district, question) {
    if (!state || !district) {
      return {
        success: false,
        error: 'Please select a state and district first.'
      };
    }

    const q = (question || '').trim();
    if (!q) {
      return {
        success: false,
        error: 'Please enter what you want help with.'
      };
    }

    try {
      const response = await fetch('http://localhost:5000/api/farmer/advice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state, district, question: q })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        return {
          success: false,
          error: data.message || data.error || 'Weather analysis failed. Please try again.'
        };
      }

      return data;
    } catch (err) {
      console.error('[WeatherService] Farmer advisory backend request error:', err);
      return {
        success: false,
        error: 'Could not connect to the weather service. Please try again.'
      };
    }
  }

};


export const getConditionColor = (iconName) => {
  if (!iconName) return 'var(--text-primary)';
  const lower = iconName.toLowerCase();
  if (lower.includes('lightning') || lower.includes('thunder')) return 'var(--weather-thunder)';
  if (lower.includes('rainwind') || lower.includes('heavy')) return 'var(--weather-heavy-rain)';
  if (lower.includes('rain') || lower.includes('drizzle')) return 'var(--weather-rain)';
  if (lower.includes('snow')) return 'var(--weather-cold)';
  if (lower.includes('sun')) return 'var(--weather-sunny)';
  if (lower.includes('cloud')) return 'var(--weather-cloudy)';
  if (lower.includes('fog')) return 'var(--weather-fog)';
  if (lower.includes('wind')) return 'var(--weather-wind)';
  return 'var(--text-primary)';
};
