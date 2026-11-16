import { apiClient, refreshAccessToken } from './client';
import type { AuthToken } from '../types';

export interface LoginCredentials {
  username: string;
  password: string;
}

export const authApi = {
  async login(credentials: LoginCredentials): Promise<AuthToken> {
    const formData = new URLSearchParams();
    formData.append('username', credentials.username.trim());
    formData.append('password', credentials.password);

    return apiClient<AuthToken>('/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });
  },

  async refresh(): Promise<AuthToken> {
    const token = await refreshAccessToken();
    return {
      access_token: token,
      token_type: 'Bearer',
    };
  },

  async logout(): Promise<{ message: string }> {
    return apiClient<{ message: string }>('/auth/logout', {
      method: 'POST',
    });
  },
};
