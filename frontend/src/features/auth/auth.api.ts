import httpClient from '../../services/http';

// Types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data?: {
    token: string;
    user: {
      id: string;
      email: string;
      name: string;
      role: string;
    };
  };
}

export interface LogoutResponse {
  success: boolean;
  message: string;
}

// API endpoints
const AUTH_ENDPOINTS = {
  LOGIN: '/auth/login',
  LOGOUT: '/auth/logout',
  REFRESH: '/auth/refresh',
};

/**
 * Login user with email and password
 * @param credentials - Email and password
 * @returns Promise with auth token and user data
 */
export const login = async (credentials: LoginRequest): Promise<AuthResponse> => {
  try {
    const response = await httpClient.post(
      AUTH_ENDPOINTS.LOGIN,
      credentials
    );
    const payload: any = response.data ?? {};

    const normalized: AuthResponse = {
      success: Boolean(payload.success),
      message: payload.message || (payload.success ? 'Login successful' : 'Login failed'),
      data: payload.data,
    };

    // Backend currently returns { success, token, user, expires_at }
    if (!normalized.data && payload.token && payload.user) {
      normalized.data = {
        token: payload.token,
        user: {
          id: payload.user.id,
          email: payload.user.email,
          name: payload.user.name || 'User',
          role: payload.user.role || 'user',
        },
      };
    }

    if (normalized.success && normalized.data?.token) {
      localStorage.setItem('authToken', normalized.data.token);
      localStorage.setItem('user', JSON.stringify(normalized.data.user));
    }

    return normalized;
  } catch (error) {
    console.error('Login failed:', error);
    return {
      success: false,
      message: 'Unable to login. Please verify API URL and credentials.',
    };
  }
};

/**
 * Logout current user
 * @returns Promise with logout response
 */
export const logout = async (): Promise<LogoutResponse> => {
  try {
    const response = await httpClient.post(
      AUTH_ENDPOINTS.LOGOUT
    );

    // Clear stored auth data
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');

    return {
      success: Boolean(response.data?.success ?? true),
      message: response.data?.message || 'Logged out',
    };
  } catch (error) {
    console.error('Logout failed:', error);

    // Clear local storage even when API call fails
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');

    return {
      success: true,
      message: 'Logged out locally',
    };
  }
};

/**
 * Refresh authentication token
 * @returns Promise with new auth token
 */
export const refreshToken = async (): Promise<AuthResponse> => {
  try {
    const response = await httpClient.post(
      AUTH_ENDPOINTS.REFRESH
    );

    const payload: any = response.data ?? {};
    const normalized: AuthResponse = {
      success: Boolean(payload.success),
      message: payload.message || 'Token refreshed',
      data: payload.data,
    };

    // Update token if refresh is successful
    if (normalized.success && normalized.data?.token) {
      localStorage.setItem('authToken', normalized.data.token);
    }

    return normalized;
  } catch (error) {
    console.error('Token refresh failed:', error);

    // Endpoint is not yet available; keep user session unchanged.
    return {
      success: false,
      message: 'Refresh endpoint is unavailable',
    };
  }
};

export const clearSession = (): void => {
  localStorage.removeItem('authToken');
  localStorage.removeItem('user');
};

/**
 * Get stored user from localStorage
 * @returns User object or null
 */
export const getStoredUser = () => {
  try {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  } catch {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    return null;
  }
};

/**
 * Check if user is authenticated
 * @returns Boolean indicating if user is authenticated
 */
export const isAuthenticated = (): boolean => {
  return !!localStorage.getItem('authToken');
};
