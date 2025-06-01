import axios from '../config/axios';
import {  RegisterData  } from '../types/auth';

export interface LoginResponse {
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: 'USER' | 'ADMIN';
  };
}

export const authService = {
  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await axios.post<LoginResponse>('/api/auth/login', {
      email,
      password,
    });
    return response.data;
  },

  async register(name: string, email: string, password: string): Promise<LoginResponse> {
    const response = await axios.post<LoginResponse>('/api/auth/register', {
      name,
      email,
      password,
    });
    return response.data;
  },

  async logout(): Promise<void> {
    await axios.post('/api/auth/logout');
  },

  async getMe(): Promise<LoginResponse['user']> {
    const response = await axios.get<LoginResponse['user']>('/api/auth/me');
    return response.data;
  },

  async getCurrentUser() {
    const response = await axios.get('/api/users/me');
    return response.data;
  },

  async updateProfile(data: Partial<RegisterData>) {
    const response = await axios.put('/api/users/me', data);
    return response.data;
  },

  async updatePassword(data: { currentPassword: string; newPassword: string }) {
    const response = await axios.put('/api/users/me/password', data);
    return response.data;
  },

  async forgotPassword(email: string): Promise<{ message: string }> {
    try {
      const response = await axios.post('/api/auth/forgot-password', { email });
      return response.data as { message: string };
    } catch (error) {
      let message = 'Đã xảy ra lỗi';
      if (error && typeof error === 'object' && 'message' in error) {
        message = (error as any).message;
      }
      return { message };
    }
  },
  
  async resetPassword(data: { token: string; password: string }): Promise<{ message: string }> {
    try {
      const response = await axios.post('/api/auth/reset-password', data);
      return response.data as { message: string };
    } catch (error) {
      let message = 'Đã xảy ra lỗi';
      if (error && typeof error === 'object' && 'message' in error) {
        message = (error as any).message;
      }
      return { message };
    }
  },
}; 