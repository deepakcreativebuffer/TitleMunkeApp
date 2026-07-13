import ReactNativeBlobUtil from 'react-native-blob-util';
import {Platform, PermissionsAndroid} from 'react-native';

/**
 * Voice-message recording + playback, wrapped around
 * `react-native-audio-recorder-player`. The native module is loaded LAZILY and
 * behind try/catch so a build that hasn't run `pod install` + rebuild fails
 * gracefully (AUDIO_UNAVAILABLE) instead of hard-crashing. One shared
 * recorder/player instance → only one record or playback at a time (fine for
 * chat).
 */

export const AUDIO_UNAVAILABLE = 'AUDIO_UNAVAILABLE';
export const MIC_PERMISSION_DENIED = 'MIC_PERMISSION_DENIED';

let instance: any = null;
let mod: any = null;
let loaded = false;

// Resolve the recorder/player, tolerating both the classic (v3, `new Class()`)
// and singleton (v4/nitro, default export object) shapes.
const getAudio = (): any => {
  if (loaded) {
    return instance;
  }
  loaded = true;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    mod = require('react-native-audio-recorder-player');
    const Impl = mod?.default ?? mod;
    instance = typeof Impl === 'function' ? new Impl() : Impl;
  } catch {
    instance = null;
    mod = null;
  }
  return instance;
};

// Explicit encoder settings — without these, startRecorder rejects on some
// Android devices (MediaRecorder) and can fail to configure the iOS session.
const buildAudioSet = (): any => {
  if (!mod) {
    return undefined;
  }
  return {
    AudioEncoderAndroid: mod.AudioEncoderAndroidType?.AAC,
    AudioSourceAndroid: mod.AudioSourceAndroidType?.MIC,
    OutputFormatAndroid: mod.OutputFormatAndroidType?.MPEG_4 ?? mod.OutputFormatAndroidType?.AAC_ADTS,
    AVEncoderAudioQualityKeyIOS: mod.AVEncoderAudioQualityIOSType?.high,
    AVNumberOfChannelsKeyIOS: 1,
    AVFormatIDKeyIOS: mod.AVEncodingOption?.aac,
  };
};

const ensureMicPermission = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') {
    return true; // iOS prompts automatically via NSMicrophoneUsageDescription.
  }
  try {
    const perm = PermissionsAndroid.PERMISSIONS.RECORD_AUDIO;
    if (await PermissionsAndroid.check(perm)) {
      return true;
    }
    const res = await PermissionsAndroid.request(perm, {
      title: 'Microphone permission',
      message: 'Allow TitleMunke to record voice messages.',
      buttonPositive: 'Allow',
      buttonNegative: 'Deny',
    });
    return res === PermissionsAndroid.RESULTS.GRANTED;
  } catch {
    return false;
  }
};

let currentPath: string | null = null;

// Start recording to a cache file. `onProgress(ms)` fires with elapsed millis.
export const startRecording = async (
  onProgress?: (ms: number) => void,
): Promise<string> => {
  const a = getAudio();
  if (!a?.startRecorder) {
    throw new Error(AUDIO_UNAVAILABLE);
  }
  if (!(await ensureMicPermission())) {
    throw new Error(MIC_PERMISSION_DENIED);
  }
  const fileName = `voice_${Date.now()}.m4a`;
  // iOS: pass a BARE filename — the native side resolves it inside the caches
  // dir (a full absolute path gets appended onto caches again → invalid path →
  // "Error occured during initiating recorder"). Android: needs a full path.
  const arg =
    Platform.OS === 'ios'
      ? fileName
      : `${ReactNativeBlobUtil.fs.dirs.CacheDir}/${fileName}`;
  // Reset any stale session from a prior failed attempt.
  try {
    await a.stopRecorder?.();
  } catch {
    /* ignore */
  }
  // startRecorder resolves with the actual file uri the recorder used.
  const uri = await a.startRecorder(arg, buildAudioSet());
  currentPath = typeof uri === 'string' && uri ? uri : arg;
  a.addRecordBackListener?.((e: any) => onProgress?.(e?.currentPosition ?? 0));
  return currentPath;
};

// Stop recording and return the recorded file uri.
export const stopRecording = async (): Promise<string | null> => {
  const a = getAudio();
  if (!a?.stopRecorder) {
    return currentPath;
  }
  let uri: string | null = currentPath;
  try {
    uri = (await a.stopRecorder()) ?? currentPath;
  } catch {
    /* keep currentPath */
  }
  a.removeRecordBackListener?.();
  return uri;
};

// Stop and discard the recording (delete the file).
export const cancelRecording = async (): Promise<void> => {
  const a = getAudio();
  try {
    await a?.stopRecorder?.();
    a?.removeRecordBackListener?.();
  } catch {
    /* ignore */
  }
  if (currentPath) {
    try {
      await ReactNativeBlobUtil.fs.unlink(currentPath.replace('file://', ''));
    } catch {
      /* ignore */
    }
  }
  currentPath = null;
};

// ── Playback ────────────────────────────────────────────────────────────────
export const startPlaying = async (
  uri: string,
  onProgress?: (posMs: number, durMs: number) => void,
): Promise<void> => {
  const a = getAudio();
  if (!a?.startPlayer) {
    throw new Error(AUDIO_UNAVAILABLE);
  }
  await a.startPlayer(uri);
  a.addPlayBackListener?.((e: any) =>
    onProgress?.(e?.currentPosition ?? 0, e?.duration ?? 0),
  );
};

export const pausePlaying = async (): Promise<void> => {
  try {
    await getAudio()?.pausePlayer?.();
  } catch {
    /* ignore */
  }
};

export const resumePlaying = async (): Promise<void> => {
  try {
    await getAudio()?.resumePlayer?.();
  } catch {
    /* ignore */
  }
};

export const stopPlaying = async (): Promise<void> => {
  const a = getAudio();
  try {
    await a?.stopPlayer?.();
    a?.removePlayBackListener?.();
  } catch {
    /* ignore */
  }
};

// "1:07" from millis.
export const formatMillis = (ms?: number): string => {
  const total = Math.floor((ms ?? 0) / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
};
