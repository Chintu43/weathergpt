import React, { createContext, useContext, useState } from 'react';

const LOCATION_STORAGE_KEY = 'weatherSelectedLocation';

const LocationContext = createContext(null);

export function LocationProvider({ children }) {
  const [selectedLocation, setSelectedLocationState] = useState(() => {
    try {
      const stored = localStorage.getItem(LOCATION_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (
          parsed &&
          typeof parsed.lat === 'number' &&
          !Number.isNaN(parsed.lat) &&
          typeof parsed.lon === 'number' &&
          !Number.isNaN(parsed.lon)
        ) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('[LocationContext] Failed to read weatherSelectedLocation:', e);
    }
    return null;
  });

  const setSelectedLocation = (location) => {
    if (!location) {
      setSelectedLocationState(null);
      try {
        localStorage.removeItem(LOCATION_STORAGE_KEY);
      } catch (e) {
        console.error('[LocationContext] Failed to remove weatherSelectedLocation:', e);
      }
      return;
    }

    const normalized = {
      name: location.name || location.cityName || '',
      city: location.city || location.cityName || location.name?.split(',')[0] || '',
      district: location.district || location.state_district || '',
      state: location.state || '',
      country: location.country || 'India',
      lat: Number(location.lat),
      lon: Number(location.lon)
    };

    setSelectedLocationState(normalized);
    try {
      localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(normalized));
    } catch (e) {
      console.error('[LocationContext] Failed to persist weatherSelectedLocation:', e);
    }
  };

  return (
    <LocationContext.Provider value={{ selectedLocation, setSelectedLocation }}>
      {children}
    </LocationContext.Provider>
  );
}

export function useLocationContext() {
  const ctx = useContext(LocationContext);
  if (!ctx) {
    throw new Error('useLocationContext must be used within a LocationProvider');
  }
  return ctx;
}
