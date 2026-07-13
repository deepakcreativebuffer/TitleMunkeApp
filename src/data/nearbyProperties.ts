// Shape of a property shown on the Nearby Search screen and its map. Data is
// fetched at runtime from the backend (/get-nearby-search-properties plus the
// user's own search history) — there is no bundled sample/mock data.

export interface NearbyProperty {
  id: string;
  addressName: string;
  area: string;
  distance: number; // KM away from the search origin
  latitude: number;
  longitude: number;
  // Present for "real" properties — tapping these on the map opens the full
  // Property Report. Location-only entries omit these.
  address?: string;
  searchId?: string;
}
