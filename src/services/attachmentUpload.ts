import ReactNativeBlobUtil from 'react-native-blob-util';
import {
  Platform,
  NativeModules,
  TurboModuleRegistry,
  PermissionsAndroid,
} from 'react-native';
import {wsGetPresignedUrl} from './messaging.ws';
import type {AttachmentInput, PickedFile} from '../types';

/**
 * Attachment flow for chat: pick file(s) → get an S3 presigned PUT URL from the
 * websocket → upload the bytes directly to S3 with react-native-blob-util →
 * return the {fileName, fileKey, fileType, fileSize} descriptors to attach to a
 * sendMessage. Supports PDF, Excel, CSV, images and general docs.
 *
 * The document picker is a native module — it's loaded LAZILY (only when the
 * user taps attach) and behind try/catch, so a build that hasn't run
 * `pod install` + rebuild fails gracefully instead of hard-crashing.
 */

// Thrown when the native picker module isn't available (needs a rebuild).
export const PICKER_UNAVAILABLE = 'PICKER_UNAVAILABLE';
// Thrown when the user denied a camera / photos permission.
export const PERMISSION_DENIED = 'PERMISSION_DENIED';

// Request a single Android runtime permission (no-op / granted on iOS, where
// the native modules prompt automatically via the Info.plist usage strings).
// Returns true if already granted or the user grants it now.
const requestAndroidPermission = async (
  permission: string,
  rationale: {title: string; message: string},
): Promise<boolean> => {
  if (Platform.OS !== 'android') {
    return true;
  }
  try {
    if (await PermissionsAndroid.check(permission as any)) {
      return true;
    }
    const res = await PermissionsAndroid.request(permission as any, {
      ...rationale,
      buttonPositive: 'Allow',
      buttonNegative: 'Deny',
    });
    return res === PermissionsAndroid.RESULTS.GRANTED;
  } catch {
    return false;
  }
};

const ensureAndroidCameraPermission = (): Promise<boolean> =>
  requestAndroidPermission(PermissionsAndroid.PERMISSIONS.CAMERA, {
    title: 'Camera permission',
    message: 'Allow TitleMunke to use the camera to take photos.',
  });

// Photos: Android 13+ (API 33) uses the system Photo Picker which needs NO
// storage permission; older versions need READ_EXTERNAL_STORAGE.
const ensureAndroidPhotosPermission = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') {
    return true;
  }
  const api =
    typeof Platform.Version === 'number'
      ? Platform.Version
      : parseInt(String(Platform.Version), 10);
  if (api >= 33) {
    return true;
  }
  return requestAndroidPermission(
    PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
    {
      title: 'Photos permission',
      message: 'Allow TitleMunke to access your photos to send them in chat.',
    },
  );
};

// Is a native module registered in THIS binary? Uses the NON-throwing lookups
// (getEnforcing / access-proxies throw when missing — that's the crash we're
// avoiding). We must confirm this BEFORE requiring a native package's JS,
// because some (e.g. geolocation) throw at module-load if the native side is
// absent.
const nativeModuleAvailable = (name: string): boolean => {
  try {
    if (TurboModuleRegistry?.get?.(name)) {
      return true;
    }
  } catch {
    /* ignore */
  }
  return !!(NativeModules as Record<string, unknown>)?.[name];
};

// Lazily resolve the document picker only when its native side exists.
const getPicker = () => {
  if (!nativeModuleAvailable('RNDocumentPicker')) {
    return null;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('@react-native-documents/picker');
  } catch {
    return null;
  }
};

const guessType = (name: string, provided?: string | null): string => {
  if (provided) {
    return provided;
  }
  const ext = name.split('.').pop()?.toLowerCase();
  const map: Record<string, string> = {
    pdf: 'application/pdf',
    csv: 'text/csv',
    txt: 'text/plain',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
  };
  return (ext && map[ext]) || 'application/octet-stream';
};

// Open the system picker; returns [] if the user cancels. Throws
// PICKER_UNAVAILABLE if the native module isn't built into this binary.
export const pickFiles = async (): Promise<PickedFile[]> => {
  const picker = getPicker();
  if (!picker || typeof picker.pick !== 'function') {
    throw new Error(PICKER_UNAVAILABLE);
  }
  const {pick, types, isErrorWithCode, errorCodes} = picker;

  // Allowed document/image kinds. Flattened because some entries (csv) are
  // arrays of MIME types.
  const allowed: string[] = [
    types.pdf,
    types.images,
    types.plainText,
    types.csv,
    types.xls,
    types.xlsx,
    types.doc,
    types.docx,
    types.ppt,
    types.pptx,
  ].flat();

  try {
    const results = await pick({allowMultiSelection: true, type: allowed});
    return (results as any[]).map(r => ({
      uri: r.uri as string,
      name: (r.name as string) ?? 'file',
      type: guessType((r.name as string) ?? '', r.type),
      size: typeof r.size === 'number' ? r.size : 0,
    }));
  } catch (e: any) {
    if (isErrorWithCode?.(e) && e?.code === errorCodes?.OPERATION_CANCELED) {
      return [];
    }
    throw e;
  }
};

// ── Image library / camera (react-native-image-picker) ──────────────────────
const getImagePicker = () => {
  if (!nativeModuleAvailable('ImagePicker')) {
    return null;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('react-native-image-picker');
  } catch {
    return null;
  }
};

const assetToPicked = (a: any): PickedFile => ({
  uri: a.uri,
  name: a.fileName ?? `image_${a.timestamp ?? 'photo'}.jpg`,
  type: a.type ?? guessType(a.fileName ?? '', null) ?? 'image/jpeg',
  size: typeof a.fileSize === 'number' ? a.fileSize : 0,
});

export const pickImageFromLibrary = async (): Promise<PickedFile[]> => {
  const ip = getImagePicker();
  if (!ip?.launchImageLibrary) {
    throw new Error(PICKER_UNAVAILABLE);
  }
  // Ask for photo access up front on Android (<13); iOS prompts automatically.
  if (!(await ensureAndroidPhotosPermission())) {
    throw new Error(PERMISSION_DENIED);
  }
  const res = await ip.launchImageLibrary({
    mediaType: 'photo',
    selectionLimit: 0, // 0 = multiple
    // Resize + re-encode to JPEG: much smaller (faster upload) and avoids HEIC
    // which React Native's <Image> can't always render.
    quality: 0.7,
    maxWidth: 1600,
    maxHeight: 1600,
  });
  if (res.didCancel) {
    return [];
  }
  if (res.errorCode === 'permission') {
    throw new Error(PERMISSION_DENIED);
  }
  if (res.errorCode) {
    throw new Error(res.errorMessage || 'Could not open photos');
  }
  return (res.assets ?? []).map(assetToPicked);
};

export const captureFromCamera = async (): Promise<PickedFile[]> => {
  const ip = getImagePicker();
  if (!ip?.launchCamera) {
    throw new Error(PICKER_UNAVAILABLE);
  }
  // Ask for camera access first (Android runtime; iOS prompts on launch).
  if (!(await ensureAndroidCameraPermission())) {
    throw new Error(PERMISSION_DENIED);
  }
  const res = await ip.launchCamera({
    mediaType: 'photo',
    // Resize + re-encode to JPEG: much smaller (faster upload) and avoids HEIC
    // which React Native's <Image> can't always render.
    quality: 0.7,
    maxWidth: 1600,
    maxHeight: 1600,
    saveToPhotos: false,
  });
  if (res.didCancel) {
    return [];
  }
  if (res.errorCode === 'permission') {
    throw new Error(PERMISSION_DENIED);
  }
  if (res.errorCode) {
    throw new Error(res.errorMessage || 'Could not open camera');
  }
  return (res.assets ?? []).map(assetToPicked);
};

// ── Current location (@react-native-community/geolocation) ───────────────────
const getGeo = () => {
  // Geolocation's JS throws at module-load if the native side is missing (it
  // builds a NativeEventEmitter from a throwing proxy), so guard BEFORE require.
  if (!nativeModuleAvailable('RNCGeolocation')) {
    return null;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const m = require('@react-native-community/geolocation');
    return m?.default ?? m;
  } catch {
    return null;
  }
};

export const getCurrentLocation = async (): Promise<{
  latitude: number;
  longitude: number;
}> => {
  const geo = getGeo();
  if (!geo?.getCurrentPosition) {
    throw new Error(PICKER_UNAVAILABLE);
  }
  // Android needs an explicit location-permission request; iOS prompts on use.
  const granted = await requestAndroidPermission(
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    {
      title: 'Location permission',
      message: 'Allow TitleMunke to access your location to share it.',
    },
  );
  if (!granted) {
    throw new Error(PERMISSION_DENIED);
  }
  return new Promise((resolve, reject) => {
    geo.getCurrentPosition(
      (pos: any) =>
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        }),
      // Geolocation error code 1 === PERMISSION_DENIED.
      (err: any) =>
        reject(
          new Error(
            err?.code === 1
              ? PERMISSION_DENIED
              : err?.message || 'Location unavailable',
          ),
        ),
      {enableHighAccuracy: true, timeout: 15000, maximumAge: 10000},
    );
  });
};

// Upload one picked file to S3 via a presigned URL and return its descriptor.
export const uploadAttachment = async (
  file: PickedFile,
): Promise<AttachmentInput> => {
  const {uploadUrl, s3Key} = await wsGetPresignedUrl({
    fileName: file.name,
    fileType: file.type,
    fileSize: file.size,
  });

  // blob-util wants a bare path (no file:// on iOS) or a content:// uri.
  const path =
    Platform.OS === 'ios' ? file.uri.replace('file://', '') : file.uri;

  const res = await ReactNativeBlobUtil.fetch(
    'PUT',
    uploadUrl,
    {'Content-Type': file.type},
    ReactNativeBlobUtil.wrap(decodeURIComponent(path)),
  );
  const status = res.info().status;
  if (status < 200 || status >= 300) {
    throw new Error(`Upload failed (${status})`);
  }

  return {
    fileName: file.name,
    fileKey: s3Key,
    fileType: file.type,
    fileSize: file.size,
    localUri: file.uri,
  };
};

export const uploadAttachments = (
  files: PickedFile[],
): Promise<AttachmentInput[]> => Promise.all(files.map(uploadAttachment));

// Human-readable size (e.g. "1.2 MB").
export const formatFileSize = (bytes?: number): string => {
  if (!bytes || bytes <= 0) {
    return '';
  }
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(
    units.length - 1,
    Math.floor(Math.log(bytes) / Math.log(1024)),
  );
  return `${(bytes / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
};

export const isImageType = (type?: string): boolean =>
  !!type && type.startsWith('image/');
