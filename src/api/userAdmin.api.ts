import api from './api';

// The response interceptor unwraps `response.data`, so each call resolves to
// the payload itself. We type loosely and let callers read defensively.
const post = <T = any>(path: string, body?: unknown): Promise<T> =>
  api.post(path, body ?? {}) as unknown as Promise<T>;
const get = <T = any>(path: string, params?: Record<string, unknown>): Promise<T> =>
  api.get(path, {params: params ?? {}}) as unknown as Promise<T>;
const put = <T = any>(path: string, body?: unknown): Promise<T> =>
  api.put(path, body ?? {}) as unknown as Promise<T>;
const del = <T = any>(path: string, body?: unknown): Promise<T> =>
  api.delete(path, {data: body ?? {}}) as unknown as Promise<T>;

/* ------------------------------- Search ------------------------------- */

export const initiateSearch = (data: Record<string, unknown>) =>
  post('/initiate-search', data);

export const titleSearch = (address: string) =>
  post('/title-search', {address});

export const getSearchStatus = (searchId: string) =>
  get('/get-search-status', {searchId});

export const createSearchHistory = (params: {
  userId: string;
  userType: string;
  address: string;
  searchId: string;
  status?: string;
  downloadLink?: string;
}) => post('/create-search-history', params);

export const updateSearchHistory = (input: {
  id: string;
  searchId: string;
  status: string;
  downloadLink?: string;
}) => put('/update-search-history', {input});

export const listSearchHistories = (params: {
  userType: string;
  brokerId?: string;
  userId?: string;
  limit?: number;
  nextToken?: string | null;
  fromDatetime?: string;
  toDatetime?: string;
}) => get('/list-search-histories', params);

/* ------------------------------ Dashboard ----------------------------- */

export const getBrokerDetails = (brokerId: string) =>
  get('/get-broker-details', {brokerId});

export const getBrokerSearches = (
  brokerId: string,
  fromDatetime?: string,
  toDatetime?: string,
) =>
  get('/get-broker-searches', {
    brokerId,
    ...(fromDatetime ? {fromDatetime} : {}),
    ...(toDatetime ? {toDatetime} : {}),
  });

/* ------------------------------- Agents ------------------------------- */

export const getBrokerAgentDetails = (
  brokerId: string,
  withSearchCount = true,
) =>
  get('/get-broker-agent-details', {brokerId, withSearchCount});

export const createAgent = (params: {
  name: string;
  email: string;
  searchLimit?: number;
  brokerId: string;
}) =>
  post('/add-user-common', {
    ...params,
    userType: 'agent',
  });

export const updateAgentStatus = (agentId: string, status: string) =>
  post('/users', {action: 'updateAgentStatus', agentId, status});

export const reinviteUser = (body: Record<string, unknown>) =>
  post('/reinvite', body);

export const deleteUser = (body: Record<string, unknown>) =>
  del('/delete-user', body);

/* ----------------------------- Audit Logs ----------------------------- */

export const getAuditLogsForBroker = (userId: string, isAgent = false) =>
  get('/list-audit-logs-for-broker', {userId, isAgent});

/* ------------------------------ Requests ------------------------------ */

export const listRequestsByUserId = (requestType?: string) =>
  get('/request-fetch-of-user', requestType ? {requestType} : {});
