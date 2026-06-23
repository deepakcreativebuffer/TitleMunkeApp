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
      navigationRef.dispatch(
        CommonActions.reset({index: 0, routes: [{name: 'LoginScreen'}]}),
      );
    }
    prev.current = isAuth;
  }, [isAuth]);

  return null;
};
