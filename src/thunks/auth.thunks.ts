import {createAsyncThunk} from '@reduxjs/toolkit';
import axios from 'axios';
import {loginRequest} from '../api';
import {LoginRequest, LoginResponse} from '../types';

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
