import api from './api';
import {ENDPOINTS} from '../static';
import {LoginRequest, LoginResponse} from '../types';

// The response interceptor unwraps `response.data`, so the resolved value is
// the payload itself (cast accordingly).
export const loginRequest = async (
  payload: LoginRequest,
): Promise<LoginResponse> => {
  const data = await api.post(ENDPOINTS.login, payload);
  return data as unknown as LoginResponse;
};
