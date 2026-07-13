import axios from 'axios';
import { store } from '../store';
import { API_BASE_URL } from '../static';
import { refreshCognitoTokens } from './cognito';
import { tokensRefreshed, logout } from '../slices/user.slice';
import { decodeJwt } from '../utils';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 25000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach dynamic user tokens
api.interceptors.request.use(
  async config => {
    const user = store.getState()?.user;
    const token = user?.token; // Cognito ID token
    const accessToken = user?.accessToken;
    console.log('token', token);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (accessToken) {
      config.headers['X-Access-Token'] = accessToken;
    }
    return config;
  },
  error => Promise.reject(error),
);

// Single-flight refresh so concurrent 401s trigger only one refresh.
let refreshPromise: ReturnType<typeof refreshCognitoTokens> | null = null;

// Response Interceptor: unwrap data; on 401 silently refresh the Cognito
// session (like Amplify does on the web) and retry the request once.
api.interceptors.response.use(
  response => response.data,
  async error => {
    const original = error?.config;
    const status = error?.response?.status;

    if (status === 401 && original && !original._retried) {
      original._retried = true;
      const user = store.getState()?.user;
      const refreshToken = user?.refreshToken;
      // clientId may be missing on sessions created before it was persisted —
      // derive it from the current ID token's `aud` claim as a fallback.
      const clientId =
        user?.clientId ?? decodeJwt<{ aud?: string }>(user?.token)?.aud ?? null;

      if (clientId && refreshToken) {
        if (!refreshPromise) {
          refreshPromise = refreshCognitoTokens(clientId, refreshToken);
        }
        const result = await refreshPromise.finally(() => {
          refreshPromise = null;
        });
        if (result?.IdToken) {
          store.dispatch(
            tokensRefreshed({
              idToken: result.IdToken,
              accessToken: result.AccessToken,
              expiresIn: result.ExpiresIn,
            }),
          );
          original.headers.Authorization = `Bearer ${result.IdToken}`;
          if (result.AccessToken) {
            original.headers['X-Access-Token'] = result.AccessToken;
          }
          return api(original); // retry (resolves to data via this interceptor)
        }
        // Refresh failed (refresh token expired) → force re-login.
        store.dispatch(logout());
      }
    }

    if (__DEV__) {
      console.log(
        'API ERROR:',
        status,
        original?.url,
        JSON.stringify(error?.response?.data || error?.message),
      );
    }
    return Promise.reject(error);
  },
);

export default api;
