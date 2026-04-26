import httpClient from '../../services/http';
import type { AxiosError } from 'axios';

// Types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface StoredUser {
  id: string;
  email: string;
  name: string;
  role: string;
  profile_icon?: number | null;
}

interface AuthApiPayload {
  success?: boolean;
  message?: string;
  token?: string;
  user?: Partial<StoredUser>;
  data?: {
    token: string;
    user: StoredUser;
  };
}

interface ApiErrorShape {
  detail?: string;
}

const normalizeStoredUser = (user?: Partial<StoredUser> | null): StoredUser | undefined => {
  if (!user?.id || !user.email) {
    return undefined;
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name || 'User',
    role: user.role || 'user',
    profile_icon: user.profile_icon ?? null,
  };
};

export interface AuthResponse {
  success: boolean;
  message: string;
  data?: {
    token: string;
    user: StoredUser;
  };
}

export interface LogoutResponse {
  success: boolean;
  message: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface RegisterResponse {
  success: boolean;
  message: string;
  user?: StoredUser;
}

// API endpoints
const AUTH_ENDPOINTS = {
  LOGIN: '/auth/login',
  LOGIN_ADMIN: '/auth/login/admin',
  LOGIN_USER: '/auth/login/user',
  REGISTER: '/auth/register',
  LOGOUT: '/auth/logout',
};

/**
 * Login user with email and password
 * @param credentials - Email and password
 * @returns Promise with auth token and user data
 */
export const login = async (credentials: LoginRequest): Promise<AuthResponse> => {
  return loginWithEndpoint(AUTH_ENDPOINTS.LOGIN, credentials);
};

export const loginAsAdmin = async (credentials: LoginRequest): Promise<AuthResponse> => {
  return loginWithEndpoint(AUTH_ENDPOINTS.LOGIN_ADMIN, credentials);
};

export const loginAsUser = async (credentials: LoginRequest): Promise<AuthResponse> => {
  return loginWithEndpoint(AUTH_ENDPOINTS.LOGIN_USER, credentials);
};

export const register = async (payload: RegisterRequest): Promise<RegisterResponse> => {
  try {
    const response = await httpClient.post(AUTH_ENDPOINTS.REGISTER, payload);
    const body = (response.data ?? {}) as AuthApiPayload;
    return {
      success: Boolean(body.success),
      message: body.message || (body.success ? 'Registration successful' : 'Registration failed'),
      user: normalizeStoredUser(body.user),
    };
  } catch (error: unknown) {
    const message =
      (error as AxiosError<ApiErrorShape>)?.response?.data?.detail ||
      'Unable to register. Please verify details and try again.';
    return {
      success: false,
      message,
    };
  }
};

const loginWithEndpoint = async (endpoint: string, credentials: LoginRequest): Promise<AuthResponse> => {
  try {
    const response = await httpClient.post(endpoint, credentials);
    const payload = (response.data ?? {}) as AuthApiPayload;

    const normalized: AuthResponse = {
      success: Boolean(payload.success),
      message: payload.message || (payload.success ? 'Login successful' : 'Login failed'),
      data: payload.data,
    };

    // Backend currently returns { success, token, user, expires_at }
    if (!normalized.data && payload.token && payload.user) {
      const normalizedUser = normalizeStoredUser(payload.user);
      if (!normalizedUser) {
        return {
          success: false,
          message: 'Login response was missing required user details.',
        };
      }

      normalized.data = {
        token: payload.token,
        user: normalizedUser,
      };
    }

    if (normalized.success && normalized.data?.token) {
      localStorage.setItem('authToken', normalized.data.token);
      localStorage.setItem('user', JSON.stringify(normalized.data.user));
    }

    return normalized;
  } catch (error) {
    console.error('Login failed:', error);
    const apiDetail = (error as AxiosError<ApiErrorShape>)?.response?.data?.detail;
    if (typeof apiDetail === 'string' && apiDetail.trim()) {
      return {
        success: false,
        message: apiDetail,
      };
    }
    return {
      success: false,
      message: 'Unable to login. Please verify email and password.',
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
    return user ? (JSON.parse(user) as StoredUser) : null;
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

export const isAdmin = (): boolean => {
  const user = getStoredUser();
  return Boolean(user && user.role === 'admin');
};
