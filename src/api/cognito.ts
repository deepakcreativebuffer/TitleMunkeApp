import axios from 'axios';
import {API_BASE_URL} from '../static';

// Region is fixed for this project's Cognito pool.
const COGNITO_URL = 'https://cognito-idp.us-east-1.amazonaws.com/';
// App client id (same as the web's aws_user_pools_web_client_id) — needed for
// the logged-out forgot-password confirmation.
export const COGNITO_CLIENT_ID = '39rcm9veqfhbm00j3ljbbpatsf';

// Confirm a password reset with the emailed code (Cognito ConfirmForgotPassword).
export const cognitoConfirmForgotPassword = async (
  username: string,
  code: string,
  newPassword: string,
): Promise<void> => {
  await axios.post(
    COGNITO_URL,
    {
      ClientId: COGNITO_CLIENT_ID,
      Username: username,
      ConfirmationCode: code,
      Password: newPassword,
    },
    {
      headers: {
        'Content-Type': 'application/x-amz-json-1.1',
        'X-Amz-Target':
          'AWSCognitoIdentityProviderService.ConfirmForgotPassword',
      },
      timeout: 20000,
    },
  );
};

export interface CognitoAuthResult {
  AccessToken?: string;
  IdToken?: string;
  ExpiresIn?: number;
  TokenType?: string;
}

// Silent refresh using the stored refresh token (Cognito InitiateAuth).
// Uses a bare axios call so it never goes through the app's interceptors.
export const refreshCognitoTokens = async (
  clientId: string,
  refreshToken: string,
): Promise<CognitoAuthResult | null> => {
  try {
    const res = await axios.post(
      COGNITO_URL,
      {
        AuthFlow: 'REFRESH_TOKEN_AUTH',
        ClientId: clientId,
        AuthParameters: {REFRESH_TOKEN: refreshToken},
      },
      {
        headers: {
          'Content-Type': 'application/x-amz-json-1.1',
          'X-Amz-Target': 'AWSCognitoIdentityProviderService.InitiateAuth',
        },
        timeout: 20000,
      },
    );
    return res.data?.AuthenticationResult ?? null;
  } catch {
    return null;
  }
};

// Revoke the Cognito session server-side (best-effort).
export const cognitoGlobalSignOut = async (accessToken: string): Promise<void> => {
  try {
    await axios.post(
      COGNITO_URL,
      {AccessToken: accessToken},
      {
        headers: {
          'Content-Type': 'application/x-amz-json-1.1',
          'X-Amz-Target': 'AWSCognitoIdentityProviderService.GlobalSignOut',
        },
        timeout: 15000,
      },
    );
  } catch {
    /* token may already be invalid — ignore */
  }
};

// Exposed for clarity / potential reuse.
export const APP_API_BASE = API_BASE_URL;
