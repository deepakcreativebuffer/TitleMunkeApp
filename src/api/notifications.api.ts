import api from './api';

// The response interceptor unwraps `response.data`, so each call resolves to
// the payload itself. We type loosely and let callers read defensively.
const post = <T = any>(path: string, body?: unknown): Promise<T> =>
  api.post(path, body ?? {}) as unknown as Promise<T>;

/* --------------------------- Push notifications --------------------------- */

// Register this device's FCM token so the backend can push to it.
export const addFcmTokenOfUser = (body: {
  token: string;
  device: string;
  timezone: string;
}) => post('/add-fcm-token-of-user', body);

// Drop this device's FCM token on logout so the backend stops pushing to it.
export const removeFcmTokenOfUser = (body: {
  fcm_token: string;
  timezone: string;
}) => post('/remove-fcm-token-of-user', body);

/* ----------------------------- Live Activity ----------------------------- */

// Register the per-activity APNs push token for a search's iOS Live Activity so
// the backend can push live progress to the lock screen / Dynamic Island.
// NOTE: backend must implement this endpoint + send ActivityKit pushes to APNs.
export const addLiveActivityToken = (body: {
  search_id: string;
  push_token: string;
  activity_id: string;
}) => post('/add-live-activity-token', body);
