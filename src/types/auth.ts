export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthUser {
  sub?: string;
  email?: string;
  name?: string;
  role?: string;
  groups?: string[];
  phoneNumber?: string;
  [key: string]: unknown;
}

// Cognito token bundle returned under `data`.
export interface LoginTokens {
  AccessToken?: string;
  IdToken?: string;
  RefreshToken?: string;
  ExpiresIn?: number;
  TokenType?: string;
}

export interface LoginResponse {
  success?: boolean;
  data?: LoginTokens;
  message?: string;
  // defensive fallbacks for alternative shapes
  token?: string;
  accessToken?: string;
  idToken?: string;
  user?: AuthUser;
  [key: string]: unknown;
}

// Decoded Cognito ID-token claims we care about.
export interface IdTokenClaims {
  sub?: string;
  email?: string;
  name?: string;
  'cognito:groups'?: string[];
  'cognito:roles'?: string[];
  'custom:phoneNumber'?: string;
  exp?: number;
  [key: string]: unknown;
}
