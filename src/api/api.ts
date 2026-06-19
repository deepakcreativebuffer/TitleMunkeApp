import axios from 'axios';
import {store} from '../store';

const api = axios.create({
  baseURL: 'https://api.yourdomain.com', // TODO: Replace with your actual API base URL
  timeout: 25000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach dynamic user tokens
api.interceptors.request.use(
  async config => {
    const token = store.getState()?.user?.token;

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => Promise.reject(error),
);

// Response Interceptor: Flatten data returned from API & log standard error shapes
api.interceptors.response.use(
  response => response.data,
  error => {
    console.log(
      'API ERROR:',
      JSON.stringify(error?.response || error, null, 2),
    );
    return Promise.reject(error);
  },
);

export default api;
