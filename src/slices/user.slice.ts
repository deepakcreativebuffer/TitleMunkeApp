import {createSlice, PayloadAction} from '@reduxjs/toolkit';
import {RootState} from '../store/rootReducer';
import {loginThunk, logoutThunk} from '../thunks';
import {AuthUser, IdTokenClaims, LoginResponse} from '../types';
import {decodeJwt} from '../utils';

type Status = 'idle' | 'loading' | 'succeeded' | 'failed';

interface UserState {
  user: AuthUser | null;
  token: string | null; // bearer token used for API authorization
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: number | null; // epoch ms
  clientId: string | null; // Cognito app client id (for token refresh)
  isAuthenticated: boolean;
  status: Status;
  error: string | null;
}

const initialState: UserState = {
  user: null,
  token: null,
  accessToken: null,
  refreshToken: null,
  expiresAt: null,
  clientId: null,
  isAuthenticated: false,
  status: 'idle',
  error: null,
};

// Build the user profile from the Cognito ID-token claims.
const userFromIdToken = (idToken?: string): AuthUser | null => {
  const claims = decodeJwt<IdTokenClaims>(idToken);
  if (!claims) {
    return null;
  }
  return {
    sub: claims.sub,
    email: claims.email,
    name: claims.name,
    role: claims['cognito:roles']?.[0],
    groups: claims['cognito:groups'],
    phoneNumber: claims['custom:phoneNumber'],
  };
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setUserToken: (state, action: PayloadAction<string>) => {
      state.token = action.payload;
    },
    setUser: (state, action: PayloadAction<AuthUser>) => {
      state.user = action.payload;
    },
    clearAuthError: state => {
      state.error = null;
    },
    // Applied after a silent Cognito token refresh.
    tokensRefreshed: (
      state,
      action: PayloadAction<{
        idToken: string;
        accessToken?: string | null;
        expiresIn?: number;
      }>,
    ) => {
      state.token = action.payload.idToken;
      if (action.payload.accessToken) {
        state.accessToken = action.payload.accessToken;
      }
      state.expiresAt = action.payload.expiresIn
        ? Date.now() + action.payload.expiresIn * 1000
        : state.expiresAt;
    },
    logout: () => initialState,
  },
  extraReducers: builder => {
    builder
      .addCase(loginThunk.pending, state => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(
        loginThunk.fulfilled,
        (state, action: PayloadAction<LoginResponse>) => {
          const tokens = action.payload?.data ?? {};
          // API Gateway Cognito authorizers expect the ID token as the
          // Authorization bearer; access token kept for resource calls.
          const idToken =
            tokens.IdToken ?? action.payload?.idToken ?? null;
          const accessToken =
            tokens.AccessToken ?? action.payload?.accessToken ?? null;

          state.token = idToken ?? accessToken;
          state.accessToken = accessToken;
          state.refreshToken = tokens.RefreshToken ?? null;
          state.expiresAt = tokens.ExpiresIn
            ? Date.now() + tokens.ExpiresIn * 1000
            : null;
          state.user =
            userFromIdToken(idToken ?? undefined) ??
            action.payload?.user ??
            null;
          // App client id for refreshing tokens later (from ID-token `aud`).
          const claims = decodeJwt<{aud?: string}>(idToken ?? undefined);
          state.clientId = claims?.aud ?? state.clientId;
          state.isAuthenticated = !!state.token;
          state.status = 'succeeded';
          state.error = null;
        },
      )
      .addCase(loginThunk.rejected, (state, action) => {
        state.status = 'failed';
        state.isAuthenticated = false;
        state.error = action.payload ?? 'Login failed. Please try again.';
      })
      // Always clear auth state when logout finishes (side-effects best-effort).
      .addCase(logoutThunk.fulfilled, () => initialState)
      .addCase(logoutThunk.rejected, () => initialState);
  },
});

export const {setUserToken, setUser, clearAuthError, tokensRefreshed, logout} =
  userSlice.actions;

// Selectors
export const currentUserTokenSelector = (state: RootState) => state.user.token;
export const accessTokenSelector = (state: RootState) =>
  state.user.accessToken;
export const userProfileSelector = (state: RootState) => state.user.user;
export const isAuthenticatedSelector = (state: RootState) =>
  state.user.isAuthenticated;
export const authStatusSelector = (state: RootState) => state.user.status;
export const authErrorSelector = (state: RootState) => state.user.error;

// Normalised role of the signed-in user ('broker' | 'agent' | ...).
export const userRoleSelector = (state: RootState) =>
  (
    state.user.user?.groups?.[0] ||
    state.user.user?.role ||
    'broker'
  ).toLowerCase();

export default userSlice.reducer;
