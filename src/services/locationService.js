/**
 * Device geolocation and reverse geocoding.
 * Never invents a city when location cannot be determined.
 */

export function requestDeviceLocation(timeoutMs = 9000) {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      resolve({ ok: false, reason: 'unavailable' });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          ok: true,
          lat: pos.coords.latitude,
          lon: pos.coords.longitude
        });
      },
      (err) => {
        const code = err?.code;
        const reason =
          code === 1 ? 'denied' : code === 3 ? 'timeout' : 'unavailable';
        resolve({ ok: false, reason });
      },
      {
        enableHighAccuracy: true,
        timeout: timeoutMs,
        maximumAge: 60 * 1000
      }
    );
  });
}

export async function reverseGeocode(lat, lon) {
  try {
    const url = `https://geocoding-api.open-meteo.com/v1/reverse?latitude=${lat}&longitude=${lon}&language=en&format=json`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      const loc = data?.results?.[0] || data;
      if (loc?.name) {
        const parts = [loc.name, loc.admin1, loc.country].filter(Boolean);
        return {
          success: true,
          name: parts.join(', '),
          cityName: loc.name,
          state: loc.admin1 || '',
          country: loc.country || '',
          lat,
          lon
        };
      }
    }
  } catch {
    /* try Nominatim next */
  }

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=jsonv2`;
    const res = await fetch(url, {
      headers: { Accept: 'application/json' }
    });
    if (!res.ok) throw new Error('reverse geocode failed');
    const data = await res.json();
    const addr = data.address || {};
    const city =
      addr.city ||
      addr.town ||
      addr.village ||
      addr.county ||
      addr.state_district ||
      data.name;
    if (!city) {
      return { success: false, lat, lon };
    }
    const parts = [city, addr.state, addr.country].filter(Boolean);
    return {
      success: true,
      name: parts.join(', '),
      cityName: city,
      state: addr.state || '',
      country: addr.country || '',
      lat,
      lon
    };
  } catch (err) {
    console.error('[LocationService] Reverse geocode failed:', err);
    return { success: false, lat, lon };
  }
}
