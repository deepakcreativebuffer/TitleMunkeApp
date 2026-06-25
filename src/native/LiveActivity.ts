import {NativeModules, NativeEventEmitter, Platform} from 'react-native';

// Typed wrapper around the native iOS `LiveActivityModule` (ActivityKit). On
// Android or where the module/iOS-version isn't available, every call is a
// no-op so callers never need to branch on platform.

export interface LiveActivityState {
  status: string; // IN_PROGRESS | SUCCESS | FAILED | STOPPED
  percent: number; // 0..100
  stageLabel: string; // e.g. "Analyzing title & deeds"
  message: string; // live status message
  etaMinutes: number; // 0 when unknown
}

export interface LiveActivityStartInput extends LiveActivityState {
  address: string;
  searchId: string;
}

export interface PushTokenEvent {
  activityId: string;
  searchId: string;
  token: string; // hex-encoded APNs token for this activity
}

const Native = NativeModules.LiveActivityModule;
const available = Platform.OS === 'ios' && !!Native;
const emitter = available ? new NativeEventEmitter(Native) : null;

export const LiveActivity = {
  // True only when running on an iOS build that includes the native module.
  available,

  // Start a Live Activity for a search. Resolves to the activity id (or null
  // when unsupported / Live Activities are disabled in Settings).
  start(input: LiveActivityStartInput): Promise<string | null> {
    if (!available) {
      return Promise.resolve(null);
    }
    return Native.startActivity(input).catch(() => null);
  },

  // Locally update an activity (used while the app is alive; backend APNs
  // pushes keep it live when the app is suspended).
  update(activityId: string, state: LiveActivityState): Promise<void> {
    if (!available) {
      return Promise.resolve();
    }
    return Native.updateActivity(activityId, state).catch(() => {});
  },

  // End an activity with a final state.
  end(activityId: string, state: LiveActivityState): Promise<void> {
    if (!available) {
      return Promise.resolve();
    }
    return Native.endActivity(activityId, state).catch(() => {});
  },

  // End every active Live Activity (e.g. on logout).
  endAll(): Promise<void> {
    if (!available) {
      return Promise.resolve();
    }
    return Native.endAll().catch(() => {});
  },

  // Subscribe to per-activity APNs push tokens; returns an unsubscribe fn.
  onPushToken(cb: (e: PushTokenEvent) => void): () => void {
    if (!emitter) {
      return () => {};
    }
    const sub = emitter.addListener('onLiveActivityPushToken', cb);
    return () => sub.remove();
  },
};
