// Mock data for the Nearby Search prototype. No backend / geolocation — these
// are static realistic sample locations around the Lehigh Valley, PA (the app's
// existing search region). `distance` is a precomputed sample value in KM.

export interface NearbyProperty {
  id: string;
  addressName: string;
  area: string;
  distance: number; // KM away (mock)
  latitude: number;
  longitude: number;
  // Present for "real" properties — tapping these on the map opens the full
  // Property Report. Mock entries omit these and stay location-only.
  address?: string;
  searchId?: string;
}

export const NEARBY_PROPERTIES: NearbyProperty[] = [
  // Discovery-only sample locations (no real searchId → location-only, no
  // Property Report). Real, report-linkable properties come from the user's
  // actual search history (added at runtime in NearbySearchScreen).
  {id: 'np-r1', addressName: '1202 W Broad St', area: 'Bethlehem', distance: 0.6, latitude: 40.6209, longitude: -75.3850},
  {id: 'np-r2', addressName: '1249 Pennsylvania Ave', area: 'Allentown', distance: 1.1, latitude: 40.6101, longitude: -75.4702},
  {id: 'np-r3', addressName: '1213 N Quebec St', area: 'Allentown', distance: 1.8, latitude: 40.6153, longitude: -75.4604},
  {id: 'np-r4', addressName: '1239 Brandt Dr', area: 'Allentown', distance: 2.5, latitude: 40.6048, longitude: -75.4901},
  {id: 'np-r5', addressName: '1441 Deerfield Dr', area: 'South Allentown', distance: 3.4, latitude: 40.5901, longitude: -75.5099},

  // ── More discovery-only locations ──────────────────────────────────────────
  {id: 'np-01', addressName: 'Green Valley Apartments', area: 'Downtown Allentown', distance: 1.4, latitude: 40.6023, longitude: -75.4714},
  {id: 'np-02', addressName: 'Hamilton Street Lofts', area: 'Center City', distance: 2.1, latitude: 40.6010, longitude: -75.4760},
  {id: 'np-03', addressName: 'Cedar Crest Residences', area: 'West End', distance: 3.2, latitude: 40.5938, longitude: -75.5202},
  {id: 'np-04', addressName: 'Union Terrace Homes', area: 'Old Allentown', distance: 3.9, latitude: 40.6087, longitude: -75.4799},
  {id: 'np-05', addressName: 'Lehigh Parkway Estates', area: 'South Allentown', distance: 4.6, latitude: 40.5793, longitude: -75.4912},
  {id: 'np-06', addressName: 'Riverside Court', area: 'Bethlehem South Side', distance: 6.8, latitude: 40.6151, longitude: -75.3782},
  {id: 'np-07', addressName: 'Main Street Brownstones', area: 'Historic Bethlehem', distance: 7.5, latitude: 40.6259, longitude: -75.3705},
  {id: 'np-08', addressName: 'Saucon Valley Villas', area: 'Hellertown', distance: 9.3, latitude: 40.5793, longitude: -75.3399},
  {id: 'np-09', addressName: 'Macungie Meadows', area: 'Macungie', distance: 9.9, latitude: 40.5159, longitude: -75.5557},
  {id: 'np-10', addressName: 'College Hill Residences', area: 'Easton', distance: 12.4, latitude: 40.6918, longitude: -75.2107},
  {id: 'np-11', addressName: 'Northampton Row', area: 'Northampton', distance: 13.7, latitude: 40.6856, longitude: -75.4905},
  {id: 'np-12', addressName: 'Willow Brook Townhomes', area: 'Emmaus', distance: 8.1, latitude: 40.5392, longitude: -75.4968},
  {id: 'np-13', addressName: 'Palmer Park Manor', area: 'Palmer Township', distance: 14.2, latitude: 40.6915, longitude: -75.2615},
  {id: 'np-14', addressName: 'Nazareth Commons', area: 'Nazareth', distance: 17.6, latitude: 40.7404, longitude: -75.3099},
  {id: 'np-15', addressName: 'Catasauqua Crossing', area: 'Catasauqua', distance: 11.2, latitude: 40.6545, longitude: -75.4655},
  {id: 'np-16', addressName: 'Whitehall Square', area: 'Whitehall', distance: 8.7, latitude: 40.6620, longitude: -75.5052},
  {id: 'np-17', addressName: 'Coopersburg Cottages', area: 'Coopersburg', distance: 18.9, latitude: 40.5117, longitude: -75.3902},
  {id: 'np-18', addressName: 'Quakertown Gardens', area: 'Quakertown', distance: 24.3, latitude: 40.4418, longitude: -75.3413},
  {id: 'np-19', addressName: 'Slatington Ridge', area: 'Slatington', distance: 27.5, latitude: 40.7493, longitude: -75.6116},
  {id: 'np-20', addressName: 'Kutztown Village', area: 'Kutztown', distance: 31.8, latitude: 40.5215, longitude: -75.7783},
  {id: 'np-21', addressName: 'Stroudsburg Heights', area: 'Stroudsburg', distance: 42.1, latitude: 40.9868, longitude: -75.1946},
  {id: 'np-22', addressName: 'Reading Riverfront', area: 'Reading', distance: 48.6, latitude: 40.3356, longitude: -75.9269},
  {id: 'np-23', addressName: 'Pottstown Place', area: 'Pottstown', distance: 46.2, latitude: 40.2454, longitude: -75.6496},
  {id: 'np-24', addressName: 'Doylestown Manor', area: 'Doylestown', distance: 38.4, latitude: 40.3101, longitude: -75.1299},
  {id: 'np-25', addressName: 'Scranton Summit', area: 'Scranton', distance: 88.7, latitude: 41.4090, longitude: -75.6624},
  {id: 'np-26', addressName: 'King of Prussia Court', area: 'King of Prussia', distance: 62.5, latitude: 40.0893, longitude: -75.3963},
  {id: 'np-27', addressName: 'Philadelphia Skyline Flats', area: 'Center City Philadelphia', distance: 92.3, latitude: 39.9526, longitude: -75.1652},
];
