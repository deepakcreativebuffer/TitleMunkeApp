import {Platform} from 'react-native';
import ReactNativeBlobUtil from 'react-native-blob-util';

// Best-effort extension/MIME detection so QuickLook / the share sheet pick the
// right viewer for the downloaded file.
const extFrom = (s = ''): string => {
  const clean = s.split('?')[0];
  const m = clean.match(/\.([a-z0-9]{1,5})$/i);
  return m ? m[1].toLowerCase() : '';
};

const MIME: Record<string, string> = {
  pdf: 'application/pdf',
  txt: 'text/plain',
  csv: 'text/csv',
  zip: 'application/zip',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  json: 'application/json',
};

export type LocalFile = {path: string; ext: string};

// Remove only path-invalid characters; keep spaces and dashes for readability.
const sanitize = (s: string): string =>
  s
    .replace(/[\\/:*?"<>|]+/g, '_')
    .replace(/\s+/g, ' ')
    .trim();

// Build a clean, human-readable filename with the correct extension.
const buildFileName = (name: string | undefined, url: string, ext: string) => {
  let base = sanitize(name ?? '');
  // If the name had no usable text, fall back to the URL's last path segment.
  if (!base) {
    const seg = decodeURIComponent(url.split('?')[0].split('/').pop() ?? '');
    base = sanitize(seg);
  }
  if (!base) {
    base = 'document';
  }
  return base.toLowerCase().endsWith('.' + ext.toLowerCase())
    ? base
    : `${base}.${ext}`;
};

// Download a remote file into the app's cache under a real, readable filename
// (NOT a random "blob…" name) and return the local path. Throws on a non-2xx
// response or timeout so callers can surface a clear error.
export const downloadToCache = async (
  url: string,
  name?: string,
  fallbackExt = 'pdf',
): Promise<LocalFile> => {
  if (!url) {
    throw new Error('No file URL.');
  }
  const ext = extFrom(name) || extFrom(url) || fallbackExt;
  const fileName = buildFileName(name, url, ext);
  const path = `${ReactNativeBlobUtil.fs.dirs.CacheDir}/${fileName}`;

  // Overwrite any previous copy so the download writes to this exact name.
  try {
    if (await ReactNativeBlobUtil.fs.exists(path)) {
      await ReactNativeBlobUtil.fs.unlink(path);
    }
  } catch {
    /* ignore */
  }

  const res = await ReactNativeBlobUtil.config({
    path,
    timeout: 60000,
  }).fetch('GET', url);
  const status = res.info?.()?.status;
  if (status && (status < 200 || status >= 300)) {
    throw new Error(`Download failed (HTTP ${status}).`);
  }
  return {path: res.path(), ext};
};

// iOS QuickLook (previewDocument) renders PDFs/images well, but it fails to
// present for plain-text and many other types. For those we use the options/
// share sheet, which reliably opens (and offers Quick Look + Save to Files).
const QUICKLOOK_EXT = new Set(['pdf', 'png', 'jpg', 'jpeg', 'heic', 'gif']);

// Present a previously-downloaded file in the native viewer.
// IMPORTANT: the caller must dismiss any React Native Modal (e.g. a loading
// overlay) BEFORE calling this — iOS cannot present these while an RN Modal is
// on screen, which makes them silently fail to appear.
export const previewLocalFile = ({path, ext}: LocalFile) => {
  if (Platform.OS === 'ios') {
    if (QUICKLOOK_EXT.has(ext)) {
      ReactNativeBlobUtil.ios.previewDocument(path);
    } else {
      ReactNativeBlobUtil.ios.presentOptionsMenu(path);
    }
  } else {
    ReactNativeBlobUtil.android.actionViewIntent(path, MIME[ext] || '*/*');
  }
};

// Share/save a previously-downloaded file via the native share sheet. Same
// modal caveat as previewLocalFile.
export const shareLocalFile = ({path, ext}: LocalFile) => {
  if (Platform.OS === 'ios') {
    ReactNativeBlobUtil.ios.presentOptionsMenu(path);
  } else {
    ReactNativeBlobUtil.android.actionViewIntent(path, MIME[ext] || '*/*');
  }
};

// CSV export: build the file and share it (no RN Modal is shown for these, so
// it presents directly).
const csvCell = (v: unknown): string => {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export const shareCsvInApp = async (
  filename: string,
  headers: string[],
  rows: Array<Array<string | number>>,
) => {
  const csv = [headers, ...rows]
    .map(r => r.map(csvCell).join(','))
    .join('\n');
  const path = `${ReactNativeBlobUtil.fs.dirs.CacheDir}/${filename}`;
  await ReactNativeBlobUtil.fs.writeFile(path, csv, 'utf8');
  if (Platform.OS === 'ios') {
    ReactNativeBlobUtil.ios.presentOptionsMenu(path);
  } else {
    await ReactNativeBlobUtil.android.actionViewIntent(path, 'text/csv');
  }
};
