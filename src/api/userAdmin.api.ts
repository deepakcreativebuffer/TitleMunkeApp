import api from './api';
import {store} from '../store';

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

// Properties near a coordinate. Body: { lat, lng, radiusMeters, limit,
// nextToken }. radiusMeters defaults to 10km on the backend.
export const getNearbySearchProperties = (params: {
  lat: number;
  lng: number;
  radiusMeters?: number;
  limit?: number;
  nextToken?: string | null;
}) =>
  post('/get-nearby-search-properties', {
    lat: params.lat,
    lng: params.lng,
    radiusMeters: params.radiusMeters ?? 10000,
    ...(params.limit != null ? {limit: params.limit} : {}),
    ...(params.nextToken ? {nextToken: params.nextToken} : {}),
  });

/* ------------------------------- Admin -------------------------------- */

// Admin dashboard KPIs + revenue (Total Org/Brokers/Agents/Counties/Demo).
export const getAdminMetrics = (
  filter: string = 'all_time',
  userTimezone?: string,
) =>
  get('/get-home', {
    admin_dashboard_global_filter: filter,
    ...(userTimezone ? {userTimezone} : {}),
  });

// Dashboard business tables (org / broker / agent), date-filterable.
export const listOrganisations = (params?: Record<string, unknown>) =>
  get('/get-organisation-with-search-count', {
    withSearchCount: true,
    limit: 20,
    ...(params ?? {}),
  });

export const listBrokersForAdmin = (params?: Record<string, unknown>) =>
  get('/list-brokers', {withSearchCount: true, limit: 20, ...(params ?? {})});

export const listAgentsForAdmin = (params?: Record<string, unknown>) =>
  get('/list-agents-for-admin', {
    withSearchCount: true,
    limit: 20,
    ...(params ?? {}),
  });

// Users screen — one list per tab. These endpoints require a query param to
// be present (otherwise the backend errors with "Request query is missing"),
// so always send nextToken (empty string on the first page).
export const listAdmins = (nextToken?: string) =>
  get('/list-admins', {nextToken: nextToken ?? ''});

export const getBrokersWithSearchCount = (nextToken?: string) =>
  get('/get-broker-with-search-count', {nextToken: nextToken ?? ''});

export const getAgentListings = (nextToken?: string) =>
  get('/list-agents', {nextToken: nextToken ?? ''});

// Demo requests (Pending = no type, Contacted = type 'CONTACTED').
export const getListDemoReq = (type?: string, limit = 50) =>
  get('/list-demo-request', {...(type ? {type} : {}), limit});

export const markDemoRequestContacted = (requestId: string) =>
  post('/mark-contacted', {requestId});

// Admin audit logs by user type ('organisation' | 'broker' | 'agent').
export const listAuditLogsAdmin = (userType: string, nextToken?: string) =>
  get('/list-audit-logs', {userType, ...(nextToken ? {nextToken} : {})});

// Organisation detail page (header + its brokers/agents).
export const getOrganisationDetails = (organisationId: string) =>
  get('/get-organisation-details', {organisationId});

export const getOrganisationBrokerDetails = (
  organisationId: string,
  fromDatetime?: string,
  toDatetime?: string,
) =>
  get('/get-organisation-broker-details', {
    organisationId,
    withSearchCount: true,
    ...(fromDatetime ? {fromDatetime} : {}),
    ...(toDatetime ? {toDatetime} : {}),
  });

export const getOrganisationAgentDetails = (
  organisationId: string,
  fromDatetime?: string,
  toDatetime?: string,
) =>
  get('/get-organisation-agent-details', {
    organisationId,
    withSearchCount: true,
    ...(fromDatetime ? {fromDatetime} : {}),
    ...(toDatetime ? {toDatetime} : {}),
  });

/* --------------------------- Organisation ----------------------------- */

// Org dashboard KPIs (Total Brokers / Agents / Pending / Approved).
export const getOrganisationMetrics = (params?: Record<string, unknown>) =>
  get('/get-dashboard-stats-org', {
    organisation_dashboard_global_filter: 'all_time',
    ...(params ?? {}),
  });

// Brokers under the organisation (dashboard + Users › Brokers tab).
export const getOrgBrokersList = (params?: Record<string, unknown>) =>
  get('/list-brokers-for-org', {
    limit: 20,
    withSearchCount: true,
    ...(params ?? {}),
  });

// Agents under the organisation (dashboard + Users › Agents tab).
export const getOrgAgentsList = (params?: Record<string, unknown>) =>
  get('/list-agents-for-org', {
    limit: 20,
    withSearchCount: true,
    ...(params ?? {}),
  });

// Create a broker/agent under the organisation.
export const createUserByAdmin = (data: Record<string, unknown>) =>
  post('/add-user-common', data);

// Update an org broker's details (PUT /update-broker { action, input }).
export const updateOrgBrokerDetail = (input: {
  id: string;
  name: string;
  email: string;
  teamStrength: string | number;
}) => put('/update-broker', {action: 'updateBroker', input});

// Update an organisation's details (PUT /update-organisation { input }).
export const updateOrganisationDetail = (input: {
  id: string;
  name: string;
  email: string;
}) => put('/update-organisation', {input});

// Update an admin's details (PUT /update-admin { input }).
export const updateAdminFromAdmin = (input: {
  id: string;
  name: string;
  email: string;
}) => put('/update-admin', {input});

// Bulk-create brokers/agents from a parsed template.
export const bulkBrokerUpload = (data: Record<string, unknown>) =>
  post('/add-bulk-brokers', data);
export const bulkAgentUpload = (data: Record<string, unknown>) =>
  post('/add-bulk-agents', data);

// Org audit logs by type ('organisation' | 'broker' | 'agent').
export const listAuditLogsOrg = (
  logType: string,
  userIds?: string,
  nextToken?: string | null,
  limit = 20,
) =>
  get('/list-audit-logs-for-org', {
    logType,
    ...(userIds ? {userIds} : {}),
    ...(nextToken ? {nextToken} : {}),
    limit,
  });

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
  fromDatetime?: string,
  toDatetime?: string,
) =>
  get('/get-broker-agent-details', {
    brokerId,
    withSearchCount,
    ...(fromDatetime ? {fromDatetime} : {}),
    ...(toDatetime ? {toDatetime} : {}),
  });

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

// Edit an agent's details: PUT /update-agent  body { input: {...} }
export const updateAgentDetail = (data: {
  id: string;
  name: string;
  email: string;
  searchLimit: string;
}) => put('/update-agent', {input: data});

// Single agent's profile + metrics (broker viewing one of their agents).
export const getAgentDetails = (agentId: string) =>
  get('/get-agent-details', {agentId});

// Property searches performed by a given agent (optional date range).
export const getAgentSearches = (
  agentId: string,
  fromDatetime?: string,
  toDatetime?: string,
) =>
  get('/get-agent-searches', {
    agentId,
    ...(fromDatetime ? {fromDatetime} : {}),
    ...(toDatetime ? {toDatetime} : {}),
  });

export const reinviteUser = (body: Record<string, unknown>) =>
  post('/reinvite', body);

export const deleteUser = (body: Record<string, unknown>) =>
  del('/delete-user', body);

// Bulk-delete users (agents): body { usersToDelete: [{userType, userId}] }
export const userBulkDelete = (
  users: Array<{userType: string; userId: string | number}>,
) =>
  post('/delete-bulk-users', {
    usersToDelete: users.map(u => ({userType: u.userType, userId: u.userId})),
  });

/* --------------------------- Request actions -------------------------- */

export const processJoinRequest = (requestId: string, action: 'accept' | 'reject') =>
  post('/process-request-to-join-user', {requestId, action});

export const processLeaveRequest = (requestId: string, action: 'accept' | 'reject') =>
  post('/process-request-to-leave-user', {requestId, action});

export const withdrawRequest = (requestId: string) =>
  post('/withdraw-request-to-join-user', {requestId});

/* ----------------- Advanced settings: join / leave ------------------- */

// List of brokers (for agents) + organisations (for brokers) to join.
export const getBrokerAndOrganizationSelectListing = (actionType?: string) =>
  get(
    '/fetch-existing-user-listing-to-join',
    actionType ? {actionType} : {},
  );

// Request to join a broker/organisation.
export const addRequestToJoinUser = (data: {
  userType: string; // 'broker' | 'organisation'
  userId: string;
  message?: string;
}) => post('/add-request-to-join-user', data);

// Request to leave the current broker/organisation.
export const cancelRequestToJoinUser = (data: {
  userType: string; // 'broker' | 'organisation'
  userId: string;
}) => post('/add-request-to-leave-user', data);

/* ----------------------------- Audit Logs ----------------------------- */

export const getAuditLogsForBroker = (userId: string, isAgent = false) =>
  get('/list-audit-logs-for-broker', {userId, isAgent});

// Agent: own audit logs (no broker/agent tabs).
export const listAuditLogsByUserId = (userId: string) =>
  get('/list-audit-logs-by-user-id', {userId});

/* ----------------------- Agent dashboard KPIs ------------------------- */

export const listTotalSearchesByUserId = (userId: string) =>
  get('/list-total-searches-by-user-id', {userId});

export const listTotalAuditLogsByUserId = (userId: string) =>
  get('/list-total-audit-logs-by-user-id', {userId});

/* ------------------------------ Profile ------------------------------- */

export const updateProfileDetails = (data: {
  name: string;
  phoneNumber: string;
  email: string;
}) => put('/update-profile-details', {...data, emailOfUser: data.email});

// Fetch a user's details by Cognito sub. Returns a freshly-signed
// `profileImageUrl` (valid ~9h) plus `attributes['custom:profile_image_key']`.
export const getAdminDetails = (adminId: string) =>
  get<{
    profileImageUrl?: string;
    attributes?: {'custom:profile_image_key'?: string | null};
  }>('/get-admin-details', {adminId});

// Request a presigned S3 PUT URL for the user's profile photo. The backend
// derives the user id / type from the auth token, persists the resulting key
// to the DB + Cognito, and returns the URL to upload the raw bytes to.
export const getProfileImageUploadUrl = (data: {
  fileName: string;
  fileType: string;
}) =>
  post<{
    success?: boolean;
    message?: string;
    uploadUrl: string;
    s3Key?: string;
  }>('/upload-profile-image-on-s3', data);

// Forgot password — backend triggers Cognito to email a reset code.
export const forgotPassword = (email: string) =>
  post('/forgot-password', {email});

// Change password — backend also expects the access token in the body.
export const changePassword = (data: {
  currentPassword: string;
  newPassword: string;
}) =>
  post('/change-password-of-user', {
    ...data,
    accessToken: store.getState()?.user?.accessToken ?? undefined,
  });

// Audit log (used for logout, etc.).
export const createAuditLog = (params: {
  userId: string;
  email: string;
  log_action: string;
  detail: string;
  isAgent: boolean;
  userType: string;
}) => post('/create-audit-log', params);

// Notification email preferences.
export const fetchEmailPreference = () => get('/fetch-email-preference');

export const setEmailPreferenceSearchComplete = (emailPreference: boolean) =>
  post('/email-preference-search-complete', {emailPreference});

export const setEmailPreferenceWeeklyReport = (emailPreference: boolean) =>
  post('/email-preference-weekly-report', {emailPreference});

/* ------------------------------ Requests ------------------------------ */

export const listRequestsByUserId = (requestType?: string) =>
  get('/request-fetch-of-user', requestType ? {requestType} : {});
