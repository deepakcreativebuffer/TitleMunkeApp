import {Platform, PermissionsAndroid} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import messaging from '@react-native-firebase/messaging';
import {addFcmTokenOfUser, removeFcmTokenOfUser} from '../api/notifications.api';

// Last token we successfully registered, kept so logout can deregister the
// exact same value even if a fresh getToken() were to return something else.
const FCM_TOKEN_KEY = '@fcm_token';

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
const ensurePermission = async (): Promise<boolean> => {
  if (Platform.OS === 'android') {
    if (Platform.Version >= 33) {
      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
      );
      return result === PermissionsAndroid.RESULTS.GRANTED;
    }
    return true;
  }
  const status = await messaging().requestPermission();
  return (
    status === messaging.AuthorizationStatus.AUTHORIZED ||
    status === messaging.AuthorizationStatus.PROVISIONAL
  );
};

// Fetch the device's FCM token and register it with the backend so it can
// push to this device. Best-effort: any failure is swallowed (and logged in
// dev) so it never blocks the login flow.
export const registerFcmToken = async (): Promise<void> => {
  try {
    const granted = await ensurePermission();
    if (!granted) {
      return;
    }
    const token = await messaging().getToken();
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
    const stored = await AsyncStorage.getItem(FCM_TOKEN_KEY);
    const fcm_token = stored || (await messaging().getToken());
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
