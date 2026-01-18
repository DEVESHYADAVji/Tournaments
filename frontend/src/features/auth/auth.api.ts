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
    const response = await httpClient.post<AuthResponse>(
      AUTH_ENDPOINTS.LOGIN,
      credentials
    );
    
    // Store token in localStorage if login is successful
    if (response.data.success && response.data.data?.token) {
      localStorage.setItem('authToken', response.data.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.data.user));
    }
    
    return response.data;
  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
};

/**
 * Logout current user
 * @returns Promise with logout response
 */
export const logout = async (): Promise<LogoutResponse> => {
  try {
    const response = await httpClient.post<LogoutResponse>(
      AUTH_ENDPOINTS.LOGOUT
    );
    
    // Clear stored auth data
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    
    return response.data;
  } catch (error) {
    console.error('Logout failed:', error);
    // Clear local storage even if the API call fails
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    throw error;
  }
};

/**
 * Refresh authentication token
 * @returns Promise with new auth token
 */
export const refreshToken = async (): Promise<AuthResponse> => {
  try {
    const response = await httpClient.post<AuthResponse>(
      AUTH_ENDPOINTS.REFRESH
    );
    
    // Update token if refresh is successful
    if (response.data.success && response.data.data?.token) {
      localStorage.setItem('authToken', response.data.data.token);
    }
    
    return response.data;
  } catch (error) {
    console.error('Token refresh failed:', error);
    // Clear auth data on refresh failure
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    throw error;
  }
};

/**
 * Get stored user from localStorage
 * @returns User object or null
 */
export const getStoredUser = () => {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
};

/**
 * Check if user is authenticated
 * @returns Boolean indicating if user is authenticated
 */
export const isAuthenticated = (): boolean => {
  return !!localStorage.getItem('authToken');
};
