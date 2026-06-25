import {useEffect, useRef} from 'react';
import {Platform} from 'react-native';
import {useAppSelector} from '../store';
import {currentSearchSelector} from '../slices';
import {LiveActivity, LiveActivityState} from '../native/LiveActivity';
import {buildStages, estimateRemainingMins, isTerminal} from '../utils/searchStages';
import {addLiveActivityToken} from '../api/notifications.api';

/**
 * Headless manager (iOS-only) that mirrors the in-flight search onto a Live
 * Activity (lock screen + Dynamic Island).
 *
 * - Starts an activity when a new search becomes active (app is foreground).
 * - Captures the activity's APNs push token and registers it with the backend,
 *   which then pushes live progress even while the app is suspended.
 * - Also updates locally while the app is alive, and ends the activity on a
 *   terminal status. No-ops on Android / unsupported iOS versions.
 */
export const LiveActivityManager = () => {
  const search = useAppSelector(currentSearchSelector);
  const {searchId, status, percent, message, address, startedAt} = search;

  const activityIdRef = useRef<string | null>(null);
  const startedForRef = useRef<string | null>(null);

  const enabled = Platform.OS === 'ios' && LiveActivity.available;

  // Derive the Live Activity content state from the shared search slice, reusing
  // the exact same stage logic as the in-app tracker.
  const deriveState = (): LiveActivityState => {
    const stages = buildStages(status, percent);
    const active =
      stages.find(s => s.state === 'active') ?? stages[stages.length - 1];
    const eta = estimateRemainingMins(startedAt, percent, Date.now()) ?? 0;
    return {
      status,
      percent: status === 'SUCCESS' ? 100 : Math.max(0, Math.min(100, percent)),
      stageLabel: active?.label ?? '',
      message: message ?? '',
      etaMinutes: eta,
    };
  };

  // Register each activity's push token with the backend.
  useEffect(() => {
    if (!enabled) {
      return;
    }
    return LiveActivity.onPushToken(({searchId: sid, token, activityId}) => {
      addLiveActivityToken({
        search_id: sid,
        push_token: token,
        activity_id: activityId,
      }).catch(() => {});
    });
  }, [enabled]);

  // Start an activity once per new search.
  useEffect(() => {
    if (!enabled) {
      return;
    }
    const active = status === 'IN_PROGRESS' && !!searchId;
    if (active && searchId && startedForRef.current !== searchId) {
      startedForRef.current = searchId;
      LiveActivity.start({
        address: address ?? '',
        searchId,
        ...deriveState(),
      }).then(id => {
        activityIdRef.current = id;
      });
    }
    // deriveState reads latest values; only re-run when the search identity or
    // status flips.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, status, searchId]);

  // Local update / end as progress changes.
  useEffect(() => {
    if (!enabled) {
      return;
    }
    const id = activityIdRef.current;
    if (!id) {
      return;
    }
    if (isTerminal(status)) {
      LiveActivity.end(id, deriveState());
      activityIdRef.current = null;
      startedForRef.current = null;
    } else if (status === 'IN_PROGRESS') {
      LiveActivity.update(id, deriveState());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, percent, status, message]);

  return null;
};
