// Derives a food-delivery-style stage timeline + ETA from the raw search state
// (status + percent + startedAt). The backend only sends a single
// `percent_completion`, so we map percent ranges to named stages here. This is
// the single source of truth shared by the in-app tracker screen and (later)
// the iOS Live Activity, so both always show identical stages.

import type {SearchStatus} from '../slices/search.slice';

export type StageState = 'done' | 'active' | 'pending';

export interface Stage {
  key: string;
  label: string;
  // Percent at which this stage becomes the active one.
  threshold: number;
  state: StageState;
}

// Ordered stages with the percent at which each begins.
const STAGE_DEFS: {key: string; label: string; threshold: number}[] = [
  {key: 'init', label: 'Initializing search', threshold: 0},
  {key: 'records', label: 'Fetching county records', threshold: 20},
  {key: 'title', label: 'Analyzing title & deeds', threshold: 50},
  {key: 'report', label: 'Compiling your report', threshold: 80},
  {key: 'ready', label: 'Report ready', threshold: 100},
];

export const isTerminal = (status: SearchStatus): boolean =>
  status === 'SUCCESS' || status === 'FAILED' || status === 'STOPPED';

// Build the stage list with per-stage state for the given search snapshot.
export const buildStages = (status: SearchStatus, percent: number): Stage[] => {
  const pct = status === 'SUCCESS' ? 100 : Math.max(0, Math.min(100, percent));
  // Index of the stage we're currently in (highest threshold <= pct).
  let activeIdx = 0;
  STAGE_DEFS.forEach((s, i) => {
    if (pct >= s.threshold) {
      activeIdx = i;
    }
  });
  const succeeded = status === 'SUCCESS' || pct >= 100;

  return STAGE_DEFS.map((s, i) => {
    let state: StageState;
    if (succeeded) {
      state = 'done';
    } else if (i < activeIdx) {
      state = 'done';
    } else if (i === activeIdx) {
      state = 'active';
    } else {
      state = 'pending';
    }
    return {...s, state};
  });
};

// Rough remaining-time estimate (in whole minutes) from elapsed time vs percent.
// Returns null when it can't be estimated (no start time, 0%, or finished).
export const estimateRemainingMins = (
  startedAt: number | null,
  percent: number,
  now: number,
): number | null => {
  if (!startedAt || percent <= 0 || percent >= 100) {
    return null;
  }
  const elapsedMs = now - startedAt;
  if (elapsedMs <= 0) {
    return null;
  }
  const totalMs = (elapsedMs / percent) * 100;
  const remainingMs = Math.max(0, totalMs - elapsedMs);
  return Math.max(1, Math.round(remainingMs / 60000));
};
