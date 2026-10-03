import axios from 'axios';
import {
  interpretWeatherCode,
  degreesToCompass,
  computeThermalIndex,
  computeOutdoorCondition,
  formatTimeFromIso
} from '../utils/weatherCodes.js';
import { weatherCache } from '../utils/cache.js';

const OPEN_METEO_BASE = 'https://api.open-meteo.com/v1/forecast';

export const openMeteoService = {
  /**
   * Fetch current weather & 8-point timeline for given coordinates
   */
  async getCurrentWeather(lat, lon, locationName = 'Selected Location') {
    const cacheKey = `current_${lat.toFixed(3)}_${lon.toFixed(3)}`;
    const cached = weatherCache.get(cacheKey);
    if (cached) return cached;

    try {
      const response = await axios.get(OPEN_METEO_BASE, {
        params: {
          latitude: lat,
          longitude: lon,
          current: 'temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m,surface_pressure,visibility,cloud_cover,precipitation,rain',
          hourly: 'temperature_2m,weather_code,precipitation_probability,precipitation,relative_humidity_2m,wind_speed_10m,uv_index,soil_temperature_0cm,soil_moisture_0_to_7cm,et0_fao_evapotranspiration',
          daily: 'sunrise,sunset,precipitation_sum,uv_index_max,temperature_2m_max,temperature_2m_min,weather_code',
          timezone: 'auto'
        }
      });

      const data = response.data;
      const current = data.current;
      if (!current) {
        throw new Error('Live weather data unavailable from Open-Meteo');
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

      const precip = current.precipitation ?? current.rain ?? 0;

      // Timeline: Now + 7 steps (3-hourly)
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
            let timeLabel = tIso.slice(11, 16);
            if (!Number.isNaN(d.getTime())) {
              const hours = d.getHours();
              const ampm = hours >= 12 ? 'PM' : 'AM';
              const formattedHours = hours % 12 || 12;
              timeLabel = `${formattedHours} ${ampm}`;
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

      const result = {
        success: true,
        location: locationName,
        coordinates: { lat, lon },
        temperature: temp,
        temperatureUnit: '°C',
        feelsLike: current.apparent_temperature !== undefined ? Math.round(current.apparent_temperature) : null,
        condition: weatherInfo.label,
        iconName: weatherInfo.icon,
        humidity: humidity !== undefined && humidity !== null ? `${humidity}%` : null,
        humidityValue: humidity,
        windSpeed: current.wind_speed_10m !== undefined ? `${Math.round(current.wind_speed_10m)} km/h` : null,
        windSpeedValue: current.wind_speed_10m,
        windDirection: degreesToCompass(current.wind_direction_10m),
        visibility: current.visibility !== undefined && current.visibility !== null ? `${(current.visibility / 1000).toFixed(1)} km` : null,
        precipitation: `${Number(precip).toFixed(1)} mm`,
        precipitationValue: precip,
        rainIntensity: precip > 0 ? `${Number(precip).toFixed(1)} mm observed` : 'No rain observed',
        pressure: current.surface_pressure ? `${Math.round(current.surface_pressure)} hPa` : null,
        cloudCover: current.cloud_cover !== undefined && current.cloud_cover !== null ? `${current.cloud_cover}%` : null,
        uvIndex: uvForecast !== null && uvForecast !== undefined ? Math.round(uvForecast) : (data.daily?.uv_index_max?.[0] ? Math.round(data.daily.uv_index_max[0]) : null),
        uvIndexKind: 'forecast',
        rainChanceForecast: rainChanceForecast !== null && rainChanceForecast !== undefined ? `${rainChanceForecast}%` : null,
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
          todayCondition: data.daily?.weather_code?.[0] ? interpretWeatherCode(data.daily.weather_code[0]).label : null
        },
        agricultural: {
          soilTemperature: data.hourly?.soil_temperature_0cm?.[curIndex] ?? null,
          soilMoisture: data.hourly?.soil_moisture_0_to_7cm?.[curIndex] ?? null,
          evapotranspiration: data.hourly?.et0_fao_evapotranspiration?.[curIndex] ?? null
        },
        timestamp: formatTimeFromIso(current.time),
        dataSource: 'Open-Meteo (real-time observations & forecast)',
        updateTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        observedAt: current.time
      };

      weatherCache.set(cacheKey, result, 600); // 10 minutes cache
      return result;
    } catch (err) {
      console.error('[OpenMeteoService] getCurrentWeather error:', err.message);
      throw err;
    }
  },

  /**
   * Fetch N-day forecast
   */
  async getForecast(lat, lon, days = 7) {
    const validDays = Math.min(Math.max(parseInt(days, 10) || 7, 1), 16);
    const cacheKey = `forecast_${lat.toFixed(3)}_${lon.toFixed(3)}_${validDays}`;
    const cached = weatherCache.get(cacheKey);
    if (cached) return cached;

    try {
      const response = await axios.get(OPEN_METEO_BASE, {
        params: {
          latitude: lat,
          longitude: lon,
          daily: 'weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,sunrise,sunset',
          hourly: 'temperature_2m,relative_humidity_2m,precipitation_probability,weather_code',
          timezone: 'auto',
          forecast_days: validDays
        }
      });

      const data = response.data;
      const dailyList = [];

      if (data.daily?.time) {
        for (let i = 0; i < data.daily.time.length; i++) {
          const dateStr = data.daily.time[i];
          const code = data.daily.weather_code[i];
          const info = interpretWeatherCode(code);
          dailyList.push({
            date: dateStr,
            weatherCode: code,
            condition: info.label,
            iconName: info.icon,
            maxTemp: Math.round(data.daily.temperature_2m_max[i]),
            minTemp: Math.round(data.daily.temperature_2m_min[i]),
            feelsLikeMax: data.daily.apparent_temperature_max?.[i] ? Math.round(data.daily.apparent_temperature_max[i]) : null,
            precipitationSum: data.daily.precipitation_sum?.[i] ?? 0,
            precipitationProbability: data.daily.precipitation_probability_max?.[i] ?? 0,
            windSpeedMax: Math.round(data.daily.wind_speed_10m_max?.[i] ?? 0),
            sunrise: formatTimeFromIso(data.daily.sunrise?.[i]),
            sunset: formatTimeFromIso(data.daily.sunset?.[i])
          });
        }
      }

      const result = {
        success: true,
        coordinates: { lat, lon },
        timezone: data.timezone,
        forecastDays: validDays,
        daily: dailyList,
        dataSource: 'Open-Meteo 16-Day Forecast API',
        fetchedAt: new Date().toISOString()
      };

      weatherCache.set(cacheKey, result, 600);
      return result;
    } catch (err) {
      console.error('[OpenMeteoService] getForecast error:', err.message);
      throw err;
    }
  }
};
