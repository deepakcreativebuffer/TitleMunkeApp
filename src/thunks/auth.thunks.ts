import {createAsyncThunk} from '@reduxjs/toolkit';
import axios from 'axios';
import {loginRequest} from '../api';
import {createAuditLog, getAdminDetails} from '../api/userAdmin.api';
import {setProfileImage} from '../slices/user.slice';
import {cognitoGlobalSignOut} from '../api/cognito';
import {unregisterFcmToken} from '../services/fcm';
import {disconnectMessagingSocket} from '../services/messaging.ws';
import {LiveActivity} from '../native/LiveActivity';
import {LoginRequest, LoginResponse} from '../types';
import {RootState} from '../store/rootReducer';

export const loginThunk = createAsyncThunk<
  LoginResponse,
  LoginRequest,
  {rejectValue: string}
>('user/login', async (payload, {rejectWithValue}) => {
  try {
    return await loginRequest(payload);
  } catch (err) {
    let message = 'Unable to log in. Please try again.';
    if (axios.isAxiosError(err)) {
      message =
        (err.response?.data as {message?: string})?.message ||
        (err.code === 'ECONNABORTED'
          ? 'Request timed out. Check your connection.'
          : err.message) ||
        message;
    }
    return rejectWithValue(message);
  }
});

// Fetch the current user's profile photo (freshly-signed URL + stable S3 key)
// and store it so every avatar (header, settings, edit profile) can show it.
// Best-effort: a failure just leaves the initials avatar in place.
export const refreshProfileImageThunk = createAsyncThunk<
  void,
  void,
  {state: RootState}
>('user/refreshProfileImage', async (_, {getState, dispatch}) => {
  const sub = getState().user.user?.sub;
  if (!sub) {
    return;
  }
  try {
    const res = await getAdminDetails(sub);
    dispatch(
      setProfileImage({
        url: res?.profileImageUrl || null,
        key: res?.attributes?.['custom:profile_image_key'] || null,
      }),
    );
  } catch {
    /* non-critical — keep whatever is already shown */
  }
});

// Logout: write the audit log ("<role> logged out successfully"), revoke the
// Cognito session, then let the slices reset their state on `fulfilled`.
// Each side-effect is best-effort so logout always completes locally.
export const logoutThunk = createAsyncThunk<void, void, {state: RootState}>(
  'user/logout',
  async (_, {getState}) => {
    const {user, accessToken} = getState().user;
    const userType = user?.groups?.[0] || user?.role || 'broker';
    // Deregister this device's push token while we're still authenticated, so
    // the backend stops pushing to it. Best-effort; never blocks logout.
    await unregisterFcmToken();
    // Clear any on-screen Live Activity (lock screen / Dynamic Island).
    void LiveActivity.endAll();
    // Close the messaging socket and clear its state.
    disconnectMessagingSocket();
    try {
      if (user?.sub) {
        await createAuditLog({
          userId: user.sub,
          email: user.email ?? '',
          log_action: 'logout',
          detail: `${userType} logged out successfully`,
          isAgent: userType === 'agent',
          userType,
        });
      }
    } catch {
      /* audit log is non-critical */
    }
    if (accessToken) {
      await cognitoGlobalSignOut(accessToken);
    }
  },
);
