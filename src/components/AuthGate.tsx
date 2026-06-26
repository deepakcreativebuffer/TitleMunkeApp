import {useEffect, useRef} from 'react';
import {CommonActions} from '@react-navigation/native';
import {useAppSelector} from '../store';
import {isAuthenticatedSelector} from '../slices';
import {navigationRef} from '../navigators/navigationRef';

/**
 * Headless guard: when an authenticated session is lost (e.g. refresh token
 * expired and the API layer dispatched logout), route the user back to Login.
 */
export const AuthGate = () => {
  const isAuth = useAppSelector(isAuthenticatedSelector);
  const prev = useRef(isAuth);

  useEffect(() => {
    if (prev.current && !isAuth && navigationRef.isReady()) {
      // Skip if an explicit logout already routed us to Login — otherwise the
      // delayed session-reset fires a second, redundant navigation (a new Login
      // screen sliding in). This guard only catches *unexpected* session loss
      // (e.g. an expired refresh token) where we're still inside the app.
      const current = navigationRef.getCurrentRoute()?.name;
      if (current !== 'LoginScreen') {
        navigationRef.dispatch(
          CommonActions.reset({index: 0, routes: [{name: 'LoginScreen'}]}),
        );
      }
    }
    prev.current = isAuth;
  }, [isAuth]);

  return null;
};
