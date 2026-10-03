import axios from 'axios';
import { locationCache } from '../utils/cache.js';

const GEOCODING_BASE = 'https://geocoding-api.open-meteo.com/v1/search';

export const geocodingService = {
  /**
   * Search locations by query string (prioritizing Indian locations if applicable)
   */
  async searchLocations(query) {
    if (!query || typeof query !== 'string' || query.trim().length < 2) {
      return [];
    }

    const cleanQuery = query.trim();
    const cacheKey = `geo_search_${cleanQuery.toLowerCase()}`;
    const cached = locationCache.get(cacheKey);
    if (cached) return cached;

    try {
      const response = await axios.get(GEOCODING_BASE, {
        params: {
          name: cleanQuery,
          count: 10,
          language: 'en',
          format: 'json'
        }
      });

      const results = response.data?.results || [];
      if (!results.length) return [];

      // Sort India (IN) locations first
      const sorted = [...results].sort((a, b) => {
        if (a.country_code === 'IN' && b.country_code !== 'IN') return -1;
        if (a.country_code !== 'IN' && b.country_code === 'IN') return 1;
        return 0;
      });

      const mapped = sorted.map((loc) => ({
        id: `${loc.id}`,
        name: `${loc.name}${loc.admin1 ? `, ${loc.admin1}` : ''}${loc.country ? `, ${loc.country}` : ''}`,
        cityName: loc.name,
        state: loc.admin1 || '',
        admin1: loc.admin1 || '',
        country: loc.country || '',
        latitude: loc.latitude,
        longitude: loc.longitude,
        lat: loc.latitude,
        lon: loc.longitude,
        timezone: loc.timezone || 'Asia/Kolkata'
      }));

      locationCache.set(cacheKey, mapped, 3600); // 1 hour cache
      return mapped;
    } catch (err) {
      console.error('[GeocodingService] Search error:', err.message);
      return [];
    }
  }
};
