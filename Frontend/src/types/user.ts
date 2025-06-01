import { ApiResponse } from './api';

export enum Role {
  ADMIN = 'ADMIN',
  STAFF = 'STAFF',
  USER = 'USER'
}

export interface User {
  id: string;
  orderNumber: number;
  email: string;
  name: string;
  phoneNumber?: string;
  address?: string;
  avatar: string;
  role: Role;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserDto {
  email: string;
  password: string;
  name: string;
  phoneNumber?: string;
  address?: string;
  role: Role;
  avatar?: string;
}

export interface UpdateUserDto {
  email?: string;
  name?: string;
  phoneNumber?: string;
  address?: string;
  password?: string;
  role?: Role;
  avatar?: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface UserListResponse {
  users: User[];
  total: number;
  page: number;
  totalPages: number;
}

export type UsersResponse = ApiResponse<User[]>;
export type UserResponse = ApiResponse<User>; 