import {useEffect, useRef} from 'react';
import {AppState, AppStateStatus} from 'react-native';
import {useAppDispatch, useAppSelector} from '../store';
import {pollSearch} from '../thunks';

const POLL_INTERVAL = 5000;

/**
 * Headless manager that keeps an in-flight property search in sync.
 *
 * The search itself runs server-side, so it continues regardless of the app's
 * state (backgrounded, phone locked, other app in use). This component is only
 * responsible for tracking progress: it polls while the app is foregrounded and
 * immediately re-syncs whenever the app returns to the foreground, so a search
 * started earlier is picked up again even after the app was killed (the search
 * id is persisted via redux-persist).
 */
export const SearchManager = () => {
  const dispatch = useAppDispatch();
  const searchId = useAppSelector(s => s.search.searchId);
  const status = useAppSelector(s => s.search.status);
  const active = status === 'IN_PROGRESS' && !!searchId;

  // Keep latest id in a ref so the interval callback stays stable.
  const idRef = useRef<string | null>(searchId);
  idRef.current = searchId;

  useEffect(() => {
    if (!active) {
      return;
    }

    const tick = () => {
      if (idRef.current) {
        dispatch(pollSearch(idRef.current));
      }
    };

    tick(); // sync immediately on (re)start
    const interval = setInterval(tick, POLL_INTERVAL);

    const onAppState = (next: AppStateStatus) => {
      if (next === 'active') {
        tick(); // catch up after background/lock
      }
    };
    const sub = AppState.addEventListener('change', onAppState);

    return () => {
      clearInterval(interval);
      sub.remove();
    };
  }, [active, dispatch]);

  return null;
};
