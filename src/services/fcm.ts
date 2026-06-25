import {Platform, PermissionsAndroid} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {addFcmTokenOfUser, removeFcmTokenOfUser} from '../api/notifications.api';

// Last token we successfully registered, kept so logout can deregister the
// exact same value even if a fresh getToken() were to return something else.
const FCM_TOKEN_KEY = '@fcm_token';

// Bundle of the Firebase modular messaging API + the resolved messaging
// instance. We use the modular API (getMessaging/getToken/…) because the old
// namespaced `messaging()` form is deprecated in v22+.
interface Firebase {
  messaging: any;
  getToken: (m: any) => Promise<string>;
  requestPermission: (m: any) => Promise<number>;
  AuthorizationStatus: {AUTHORIZED: number; PROVISIONAL: number};
}

let fbCache: Firebase | null = null;

// Lazily resolve Firebase. Returns null (and never throws) when either:
//  - the native Firebase module isn't in the binary (app not rebuilt), or
//  - no default Firebase app has been configured yet (missing
//    GoogleService-Info.plist / google-services.json).
// In both cases callers simply no-op, so login/logout never break.
const getFirebase = (): Firebase | null => {
  if (fbCache) {
    return fbCache;
  }
  try {
    const {getApp, getApps} = require('@react-native-firebase/app');
    if (!getApps().length) {
      return null; // no GoogleService-Info.plist / google-services.json yet
    }
    const {
      getMessaging,
      getToken,
      requestPermission,
      AuthorizationStatus,
    } = require('@react-native-firebase/messaging');
    fbCache = {
      messaging: getMessaging(getApp()),
      getToken,
      requestPermission,
      AuthorizationStatus,
    };
    return fbCache;
  } catch {
    return null;
  }
};

// IANA timezone of the device (e.g. "America/New_York"); '' if unavailable.
const getTimezone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || '';
  } catch {
    return '';
  }
};

// Ask the OS for notification permission. iOS uses the APNs prompt via
// Firebase; Android 13+ (API 33) needs the runtime POST_NOTIFICATIONS grant.
const ensurePermission = async (fb: Firebase): Promise<boolean> => {
  if (Platform.OS === 'android') {
    if (Platform.Version >= 33) {
      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
      );
      return result === PermissionsAndroid.RESULTS.GRANTED;
    }
    return true;
  }
  const status = await fb.requestPermission(fb.messaging);
  return (
    status === fb.AuthorizationStatus.AUTHORIZED ||
    status === fb.AuthorizationStatus.PROVISIONAL
  );
};

// Fetch the device's FCM token and register it with the backend so it can
// push to this device. Best-effort: any failure is swallowed (and logged in
// dev) so it never blocks the login flow.
export const registerFcmToken = async (): Promise<void> => {
  try {
    const fb = getFirebase();
    if (!fb) {
      // if (__DEV__) {
      //   console.log(
      //     '[FCM] skipped: Firebase not configured (no GoogleService-Info.plist / google-services.json, or app not rebuilt). /add-fcm-token-of-user will NOT be called until this is fixed.',
      //   );
      // }
      return;
    }
    const granted = await ensurePermission(fb);
    if (!granted) {
      return;
    }

    await fb.messaging.registerDeviceForRemoteMessages();

    const token = await fb.getToken(fb.messaging);
    console.log("TOKNE>>>", token)
    if (!token) {
      return;
    }
    await addFcmTokenOfUser({
      token,
      device: Platform.OS, // 'ios' | 'android'
      timezone: getTimezone(),
    });
    await AsyncStorage.setItem(FCM_TOKEN_KEY, token);
  } catch (err) {
    if (__DEV__) {
      console.log('registerFcmToken failed:', err);
    }
  }
};

// Deregister this device's token on logout so the backend stops pushing to it.
// Must run while the user is still authenticated (token still in the store).
export const unregisterFcmToken = async (): Promise<void> => {
  try {
    const fb = getFirebase();
    const stored = await AsyncStorage.getItem(FCM_TOKEN_KEY);
    const fcm_token =
      stored || (fb ? await fb.getToken(fb.messaging) : null);
    if (fcm_token) {
      await removeFcmTokenOfUser({fcm_token, timezone: getTimezone()});
    }
  } catch (err) {
    if (__DEV__) {
      console.log('unregisterFcmToken failed:', err);
    }
  } finally {
    await AsyncStorage.removeItem(FCM_TOKEN_KEY);
  }
};
