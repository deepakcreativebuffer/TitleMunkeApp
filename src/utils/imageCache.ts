import ReactNativeBlobUtil from 'react-native-blob-util';

/**
 * Local disk cache for chat images, keyed by the STABLE S3 `file_key` (not the
 * signed URL, which is re-generated with a new signature on every fetch — so
 * caching by URL would always miss and re-download). Once an image is fetched
 * it's stored in the app cache and reused instantly on subsequent opens.
 */

const DIR = `${ReactNativeBlobUtil.fs.dirs.CacheDir}/chat-images`;

// fileKey -> local file:// uri (in-memory, avoids re-hitting disk each render).
const memCache: Record<string, string | undefined> = {};
// fileKey -> in-flight download (dedupes concurrent requests for the same key).
const inflight: Record<string, Promise<string> | undefined> = {};

const safeName = (k: string): string => k.replace(/[^a-zA-Z0-9._-]/g, '_');

// Synchronous peek — lets a component render straight from cache with no fl. flash.
export const peekCachedImageUri = (fileKey?: string): string | undefined =>
  fileKey ? memCache[fileKey] : undefined;

// Return a local file:// uri for the image, downloading it once if needed.
// Falls back to the remote `url` if the download fails.
export const getCachedImageUri = (
  fileKey: string,
  url: string,
): Promise<string> => {
  const cached = memCache[fileKey];
  if (cached) {
    return Promise.resolve(cached);
  }
  const pending = inflight[fileKey];
  if (pending) {
    return pending;
  }

  const path = `${DIR}/${safeName(fileKey)}`;
  const task = (async () => {
    try {
      if (await ReactNativeBlobUtil.fs.exists(path)) {
        memCache[fileKey] = `file://${path}`;
        return memCache[fileKey];
      }
      // Ensure the cache dir exists (mkdir throws if it already does).
      await ReactNativeBlobUtil.fs.mkdir(DIR).catch(() => {});
      const res = await ReactNativeBlobUtil.config({path, timeout: 60000}).fetch(
        'GET',
        url,
      );
      const status = res.info?.()?.status;
      if (status && status >= 200 && status < 300) {
        memCache[fileKey] = `file://${res.path()}`;
        return memCache[fileKey];
      }
      // Non-2xx (e.g. expired URL) — drop the partial file, use remote.
      try {
        await ReactNativeBlobUtil.fs.unlink(path);
      } catch {
        /* ignore */
      }
      return url;
    } catch {
      return url;
    } finally {
      delete inflight[fileKey];
    }
  })();

  inflight[fileKey] = task;
  return task;
};
