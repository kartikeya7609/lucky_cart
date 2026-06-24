// Centralized fetch wrapper for backend API calls with automatic token refresh
const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

let isRefreshing = false;
let refreshSubscribers = [];

const subscribeTokenRefresh = (cb) => {
  refreshSubscribers.push(cb);
};

const onRefreshed = (token) => {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
};

// Subscriber for AuthContext state sync
let tokenUpdateListener = null;
export const setTokenUpdateListener = (listener) => {
  tokenUpdateListener = listener;
};

const handleResponse = async (res) => {
  const isJson = res.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await res.json() : null;

  if (!res.ok) {
    const errorMsg = data?.message || `API error: ${res.statusText}`;
    const error = new Error(errorMsg);
    error.status = res.status;
    error.data = data;
    throw error;
  }
  return data;
};

const customFetch = async (url, options, tokenParam = null) => {
  let token = tokenParam || localStorage.getItem('access_token');
  
  const headers = { ...options.headers };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  let res = await fetch(url, { ...options, headers });
  
  // Clone response to inspect body if it's JSON
  let data = null;
  try {
    const clone = res.clone();
    const isJson = clone.headers.get('content-type')?.includes('application/json');
    data = isJson ? await clone.json() : null;
  } catch (err) {
    // Fail silently
  }
  
  // If 401/unauthorized due to token expiration
  if (res.status === 401 && data && data.code === 'TOKEN_EXPIRED') {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) {
      return handleResponse(res);
    }
    
    if (!isRefreshing) {
      isRefreshing = true;
      try {
        const refreshResponse = await fetch(`${API_BASE}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken })
        });
        
        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json();
          const newAccessToken = refreshData.accessToken;
          
          localStorage.setItem('access_token', newAccessToken);
          if (tokenUpdateListener) {
            tokenUpdateListener(newAccessToken);
          }
          
          isRefreshing = false;
          onRefreshed(newAccessToken);
        } else {
          isRefreshing = false;
          // Refresh token failed, clear everything
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          if (tokenUpdateListener) {
            tokenUpdateListener(null);
          }
          return handleResponse(res);
        }
      } catch (err) {
        isRefreshing = false;
        return handleResponse(res);
      }
    }
    
    // Wait for the new token and retry the request
    return new Promise((resolve) => {
      subscribeTokenRefresh((newToken) => {
        if (newToken) {
          headers['Authorization'] = `Bearer ${newToken}`;
          resolve(fetch(url, { ...options, headers }).then(handleResponse));
        } else {
          resolve(handleResponse(res));
        }
      });
    });
  }
  
  return handleResponse(res);
};

export const api = {
  get: async (endpoint, token = null) => {
    return customFetch(`${API_BASE}${endpoint}`, { method: 'GET' }, token);
  },

  post: async (endpoint, body, token = null, isMultipart = false) => {
    const headers = {};
    if (!isMultipart) headers['Content-Type'] = 'application/json';

    return customFetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers,
      body: isMultipart ? body : JSON.stringify(body)
    }, token);
  },

  put: async (endpoint, body, token = null, isMultipart = false) => {
    const headers = {};
    if (!isMultipart) headers['Content-Type'] = 'application/json';

    return customFetch(`${API_BASE}${endpoint}`, {
      method: 'PUT',
      headers,
      body: isMultipart ? body : JSON.stringify(body)
    }, token);
  },

  delete: async (endpoint, token = null) => {
    return customFetch(`${API_BASE}${endpoint}`, { method: 'DELETE' }, token);
  }
};
