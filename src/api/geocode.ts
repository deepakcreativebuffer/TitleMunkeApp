import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {GOOGLE_MAPS_API_KEY} from '../static';

// Resolves a free-text address to {lat, lng} via the Google Geocoding API.
// Search history only stores the address text, so the map screen geocodes each
// one to place a marker. Results are cached (in-memory + AsyncStorage) so we
// don't re-hit the API for addresses we've already resolved.

export interface LatLng {
  latitude: number;
  longitude: number;
}

// Pull a {latitude, longitude} out of a raw backend item, tolerating the many
// shapes a search record might use (lat/lng, latitude/longitude, nested under
// geo / location / property_summary, string or number). Returns null if none
// are present so the caller can fall back to geocoding the address.
export const extractLatLng = (raw: any): LatLng | null => {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const num = (v: any): number | null => {
    const n = typeof v === 'string' ? parseFloat(v) : v;
    return typeof n === 'number' && !isNaN(n) ? n : null;
  };
  const candidates: Array<[any, any]> = [
    [raw.latitude, raw.longitude],
    [raw.lat, raw.lng],
    [raw.lat, raw.lon],
    [raw.lat, raw.long],
    [raw.geo?.lat, raw.geo?.lng],
    [raw.geo?.latitude, raw.geo?.longitude],
    [raw._geoloc?.lat, raw._geoloc?.lng],
    [raw.location?.lat, raw.location?.lng],
    [raw.location?.latitude, raw.location?.longitude],
    [raw.coordinates?.lat, raw.coordinates?.lng],
    [raw.coordinates?.latitude, raw.coordinates?.longitude],
    [raw.property_summary?.latitude, raw.property_summary?.longitude],
    [raw.property_summary?.lat, raw.property_summary?.lng],
    [raw.propertySummary?.latitude, raw.propertySummary?.longitude],
  ];
  for (const [la, lo] of candidates) {
    const latitude = num(la);
    const longitude = num(lo);
    if (
      latitude !== null &&
      longitude !== null &&
      (latitude !== 0 || longitude !== 0)
    ) {
      return {latitude, longitude};
    }
  }
  return null;
};

const CACHE_KEY = '@geocode_cache_v1';

// In-memory cache for the session; hydrated from AsyncStorage on first use.
let memCache: Record<string, LatLng | null> | null = null;

const loadCache = async (): Promise<Record<string, LatLng | null>> => {
  if (memCache) {
    return memCache;
  }
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    memCache = raw ? JSON.parse(raw) : {};
  } catch {
    memCache = {};
  }
  return memCache!;
};

const persistCache = async () => {
  try {
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(memCache ?? {}));
  } catch {
    /* non-fatal */
  }
};

export const geocodeAddress = async (
  address: string,
): Promise<LatLng | null> => {
  const key = address.trim().toLowerCase();
  if (!key || !GOOGLE_MAPS_API_KEY) {
    return null;
  }
  const cache = await loadCache();
  if (key in cache) {
    return cache[key];
  }
  try {
    const res = await axios.get(
      'https://maps.googleapis.com/maps/api/geocode/json',
      {
        params: {
          address,
          key: GOOGLE_MAPS_API_KEY,
          // Bias to Pennsylvania / US since these are Lehigh County parcels and
          // the stored address may be short (e.g. "123 Hill St").
          components: 'country:US|administrative_area:PA',
        },
        timeout: 15000,
      },
    );
    const loc = res.data?.results?.[0]?.geometry?.location;
    const result: LatLng | null =
      loc && typeof loc.lat === 'number'
        ? {latitude: loc.lat, longitude: loc.lng}
        : null;
    cache[key] = result;
    void persistCache();
    return result;
  } catch {
    return null;
  }
};

// Geocode many addresses, returning only the ones that resolved. Runs the
// lookups concurrently (cache keeps repeat addresses cheap).
export const geocodeMany = async <T extends {address: string}>(
  items: T[],
): Promise<Array<T & LatLng>> => {
  const results = await Promise.all(
    items.map(async (it): Promise<(T & LatLng) | null> => {
      const coord = await geocodeAddress(it.address);
      return coord ? {...it, ...coord} : null;
    }),
  );
  return results.filter(Boolean) as Array<T & LatLng>;
};
