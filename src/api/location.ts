import {
  Alert,
  Linking,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import type {LatLng} from './geocode';

// 'granted'  – we may read the location.
// 'denied'   – user said no this time (can be asked again).
// 'blocked'  – permanently denied ("Don't ask again" / iOS Settings toggle).
export type LocationPermission = 'granted' | 'denied' | 'blocked';

const requestAndroidPermission = async (): Promise<LocationPermission> => {
  const perm = PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION;
  if (await PermissionsAndroid.check(perm)) {
    return 'granted';
  }
  const res = await PermissionsAndroid.request(perm, {
    title: 'Location permission',
    message: 'TitleMunke uses your location to find properties near you.',
    buttonPositive: 'OK',
    buttonNegative: 'Cancel',
  });
  if (res === PermissionsAndroid.RESULTS.GRANTED) {
    return 'granted';
  }
  if (res === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
    return 'blocked';
  }
  return 'denied';
};

const requestIOSPermission = (): Promise<LocationPermission> =>
  new Promise(resolve => {
    // iOS shows the system prompt (driven by NSLocationWhenInUseUsageDescription)
    // on first ask; afterwards this resolves against the saved choice.
    try {
      Geolocation.requestAuthorization(
        () => resolve('granted'),
        (err: any) => resolve(err?.code === 1 ? 'blocked' : 'denied'),
      );
    } catch {
      resolve('granted'); // older API with no callbacks — let the fix prompt.
    }
  });

// Ask for foreground location permission, returning the resulting status.
export const requestLocationPermission = (): Promise<LocationPermission> =>
  Platform.OS === 'android'
    ? requestAndroidPermission()
    : requestIOSPermission();

// Prompt the user to enable location from the app settings (used when the
// permission is permanently blocked).
export const showLocationBlockedAlert = () =>
  Alert.alert(
    'Location is off',
    'Enable location access for TitleMunke in Settings to search for properties near you.',
    [
      {text: 'Not now', style: 'cancel'},
      {text: 'Open Settings', onPress: () => Linking.openSettings()},
    ],
  );

// Resolve the device's current coordinates, or null if the fix failed/timed
// out. Assumes permission was already granted. Never rejects.
export const getCurrentLocation = async (): Promise<LatLng | null> =>
  new Promise(resolve => {
    Geolocation.getCurrentPosition(
      pos =>
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        }),
      () => resolve(null),
      {enableHighAccuracy: false, timeout: 15000, maximumAge: 60000},
    );
  });
