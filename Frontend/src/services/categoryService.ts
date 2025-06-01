// Frontend/src/services/categoryService.ts
import axios from '../config/axios';
import { Category } from '../types/category';
import { ApiResponse } from '../types/api';

const API_URL = import.meta.env.VITE_API_URL;
const CATEGORY_API = `${API_URL}/api/categories`;

interface CategoriesResponse {
  categories: Category[];
  totalItems: number;
  totalPages: number;
  currentPage: number;
}

interface ICategoryService {
  getAll(page?: number, limit?: number, search?: string, sortBy?: string, sortOrder?: 'asc' | 'desc'): Promise<ApiResponse<CategoriesResponse>>;
  getById(id: string): Promise<ApiResponse<Category>>;
  create(formData: FormData): Promise<ApiResponse<Category>>;
  update(id: string, formData: FormData): Promise<ApiResponse<Category>>;
  delete(id: string): Promise<ApiResponse<void>>;
  deleteMany(ids: string[]): Promise<ApiResponse<void>>;
}

class CategoryService implements ICategoryService {
  async getAll(
    page: number = 1, 
    limit: number = 10, 
    search: string = '',
    sortBy: string = 'orderNumber',
    sortOrder: 'asc' | 'desc' = 'asc'
  ): Promise<ApiResponse<CategoriesResponse>> {
    try {
      const response = await axios.get<ApiResponse<CategoriesResponse>>(CATEGORY_API, {
        params: {
          page,
          limit,
          search,
          sortBy,
          sortOrder
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching categories:', error);
      throw error;
    }
  }

  async getById(id: string): Promise<ApiResponse<Category>> {
    try {
      const response = await axios.get<ApiResponse<Category>>(`${CATEGORY_API}/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching category:', error);
      throw error;
    }
  }

  async create(formData: FormData): Promise<ApiResponse<Category>> {
    try {
      const response = await axios.post<ApiResponse<Category>>(CATEGORY_API, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error creating category:', error);
      throw error;
    }
  }

  async update(id: string, formData: FormData): Promise<ApiResponse<Category>> {
    try {
      const response = await axios.put<ApiResponse<Category>>(`${CATEGORY_API}/${id}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error updating category:', error);
      throw error;
    }
  }

  async delete(id: string): Promise<ApiResponse<void>> {
    try {
      const response = await axios.delete<ApiResponse<void>>(`${CATEGORY_API}/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting category:', error);
      throw error;
    }
  }

  async deleteMany(ids: string[]): Promise<ApiResponse<void>> {
    try {
      const response = await axios.post<ApiResponse<void>>(`${CATEGORY_API}/delete`, { ids });
      return response.data;
    } catch (error) {
      console.error('Error deleting categories:', error);
      throw error;
    }
  }
}

const categoryService = new CategoryService();
export { categoryService };