/**
 * WMO Weather Interpretation Codes & Utilities
 */

export const WMO_CODES = {
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
