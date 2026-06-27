export {
  apiFetch,
  apiStreamFetch,
  apiStreamPostFetch,
  getApiConfig,
  setAuthToken,
  setAuthTenantId,
  getAuthTenantId,
  setOnUnauthorized,
  type ApiClientOptions,
} from './client';

export {
  ApiError,
  NetworkError,
  isApiError,
  isNetworkError,
  classifyError,
  toUserMessage,
  type ErrorKind,
} from './errors';

export { apiRoutes } from './routes';
