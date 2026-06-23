import axios from 'axios';
import {store} from '../store';
import {API_BASE_URL} from '../static';

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
