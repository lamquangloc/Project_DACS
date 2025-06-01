import axios from '../config/axios';
import { User, CreateUserDto, UpdateUserDto } from '../types/user';
import { PaginationParams } from '../types/pagination';
import { ApiResponse } from '@/types/api';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const USER_API = `${API_URL}/api/users`;

interface UserListResponse {
  users: User[];
  total: number;
  page: number;
  totalPages: number;
}

interface IUserService {
  getAll(params?: PaginationParams): Promise<UserListResponse>;
  getById(id: string): Promise<User>;
  create(data: CreateUserDto | FormData): Promise<User>;
  update(id: string, data: UpdateUserDto | FormData): Promise<User>;
  delete(id: string): Promise<void>;
  deleteMany(ids: string[]): Promise<void>;
  search(query: string): Promise<User[]>;
  updatePassword(data: { currentPassword: string; newPassword: string }): Promise<void>;
}

function toFormData(data: any): FormData {
  if (data instanceof FormData) return data;
  const formData = new FormData();
  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      if (value instanceof File || value instanceof Blob) {
        formData.append(key, value);
      } else {
        formData.append(key, String(value));
      }
    }
  });
  return formData;
}

class UserService implements IUserService {
  async getAll(params?: PaginationParams): Promise<UserListResponse> {
    try {
      const response = await axios.get<UserListResponse>(USER_API, { params });
      console.log('Get all users response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  }

  async getById(id: string): Promise<User> {
    try {
      const response = await axios.get<User>(`${USER_API}/${id}`);
      console.log('Get user by id response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching user:', error);
      throw error;
    }
  }

  async create(data: CreateUserDto | FormData): Promise<User> {
    try {
      const formData = toFormData(data);
      const response = await axios.post<ApiResponse<User>>(USER_API, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const user = response.data.data;
      if (!user) {
        throw new Error('Không nhận được dữ liệu user từ server');
      }
      console.log('Create user response:', user);
      return user;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  async update(id: string, data: UpdateUserDto | FormData): Promise<User> {
    try {
      const formData = toFormData(data);
      const response = await axios.put<ApiResponse<User>>(`${USER_API}/${id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const user = response.data.data;
      if (!user) {
        throw new Error('Không nhận được dữ liệu user từ server');
      }
      console.log('Update user response:', user);
      return user;
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await axios.delete(`${USER_API}/${id}`);
      console.log('User deleted successfully');
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }

  async deleteMany(ids: string[]): Promise<void> {
    try {
      await axios.post(`${USER_API}/bulk-delete`, { ids });
      console.log('Users deleted successfully');
    } catch (error) {
      console.error('Error deleting users:', error);
      throw error;
    }
  }

  async search(query: string): Promise<User[]> {
    try {
      console.log('Searching users with query:', query);
      const response = await axios.get<UserListResponse>(USER_API, {
        params: { search: query }
      });
      console.log('Search response:', response.data);
      return response.data.users;
    } catch (error) {
      console.error('Error searching users:', error);
      throw error;
    }
  }

  async updatePassword(data: { currentPassword: string; newPassword: string }): Promise<void> {
    try {
      await axios.put(`${USER_API}/profile/password`, data);
    } catch (error) {
      throw error;
    }
  }
}

const userService = new UserService();
export default userService;