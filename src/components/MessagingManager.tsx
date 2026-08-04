import {useEffect} from 'react';
import {AppState, AppStateStatus} from 'react-native';
import {useAppSelector, useAppDispatch} from '../store';
import {isAuthenticatedSelector} from '../slices';
import {refreshProfileImageThunk} from '../thunks';
import {
  connectMessagingSocket,
  disconnectMessagingSocket,
  ensureMessagingSocket,
} from '../services/messaging.ws';

/**
 * Headless manager for the realtime messaging socket. Login opens the socket
 * directly (LoginScreen); this component covers the other cases:
 *  - a persisted session on cold start (user was already logged in),
 *  - re-opening a dropped socket whenever the app returns to the foreground.
 * On logout the socket is closed by logoutThunk, and here as a safety net.
 */
export const MessagingManager = () => {
  const isAuthed = useAppSelector(isAuthenticatedSelector);
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (isAuthed) {
      connectMessagingSocket();
      // Load the current user's profile photo so every avatar can show it.
      dispatch(refreshProfileImageThunk());
    } else {
      disconnectMessagingSocket();
    }
  }, [isAuthed, dispatch]);

  useEffect(() => {
    const onChange = (next: AppStateStatus) => {
      if (next === 'active' && isAuthed) {
        ensureMessagingSocket();
      }
    };
    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, [isAuthed]);

  return null;
};
