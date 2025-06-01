import axios from 'axios';
import { Product, CreateProductDto, CreateProductFormData } from '../types/product';
import { ApiResponse } from '../types/api';
import { PaginatedResponse, PaginationParams } from '../types/pagination';

const API_URL = import.meta.env.VITE_API_URL;

const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

interface IProductService {
  getAll(params?: PaginationParams): Promise<ApiResponse<PaginatedResponse<Product>>>;
  getById(id: string): Promise<ApiResponse<Product>>;
  create(data: CreateProductDto | CreateProductFormData): Promise<ApiResponse<Product>>;
  update(id: string, data: Partial<CreateProductDto> | CreateProductFormData): Promise<ApiResponse<Product>>;
  delete(id: string): Promise<ApiResponse<void>>;
  deleteMany(ids: string[]): Promise<ApiResponse<void>>;
}

export const comboProductService: IProductService = {
  async getAll(params?: PaginationParams): Promise<ApiResponse<PaginatedResponse<Product>>> {
    try {
      console.log('Calling API:', `${API_URL}/api/products`);
      const response = await axios.get<ApiResponse<PaginatedResponse<Product>>>(`${API_URL}/api/products`, {
        params,
        headers: {
          ...getAuthHeader(),
          'Content-Type': 'application/json'
        }
      });
      console.log('Raw API response:', response);

      // Lấy mảng products từ response
      let products: Product[] = [];
      if (response.data?.data?.items) {
        products = response.data.data.items as Product[];
      }

      console.log('Products from API:', products);

      // Map dữ liệu về đúng format
      const mappedProducts = products.map((p: any) => ({
        id: p.id || p._id,
        name: p.name,
        price: p.price,
        image: p.image,
        costPrice: p.costPrice || 0,
        unitId: p.unitId || '',
        description: p.description || '',
        isDeleted: p.isDeleted || false
      }));

      console.log('Mapped products:', mappedProducts);

      return {
        status: 'success',
        data: {
          items: mappedProducts,
          totalItems: mappedProducts.length,
          currentPage: params?.page || 1,
          totalPages: 1
        }
      };
    } catch (error) {
      console.error('Error in productService.getAll:', error);
      throw error;
    }
  },

  async getById(id: string): Promise<ApiResponse<Product>> {
    try {
      const response = await axios.get<ApiResponse<Product>>(`${API_URL}/api/products/${id}`, {
        headers: {
          ...getAuthHeader()
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching product:', error);
      throw error;
    }
  },

  async create(data: CreateProductDto | CreateProductFormData): Promise<ApiResponse<Product>> {
    try {
      const config = {
        headers: {
          'Content-Type': data instanceof FormData ? 'multipart/form-data' : 'application/json',
          ...getAuthHeader()
        },
      };
      const response = await axios.post<ApiResponse<Product>>(`${API_URL}/api/products`, data, config);
      return response.data;
    } catch (error) {
      console.error('Error creating product:', error);
      throw error;
    }
  },

  async update(id: string, data: Partial<CreateProductDto> | CreateProductFormData): Promise<ApiResponse<Product>> {
    try {
      const config = {
        headers: {
          'Content-Type': data instanceof FormData ? 'multipart/form-data' : 'application/json',
          ...getAuthHeader()
        },
      };
      const response = await axios.put<ApiResponse<Product>>(`${API_URL}/api/products/${id}`, data, config);
      return response.data;
    } catch (error) {
      console.error('Error updating product:', error);
      throw error;
    }
  },

  async delete(id: string): Promise<ApiResponse<void>> {
    try {
      const response = await axios.delete<ApiResponse<void>>(`${API_URL}/api/products/${id}`, {
        headers: {
          ...getAuthHeader()
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error deleting product:', error);
      throw error;
    }
  },

  async deleteMany(ids: string[]): Promise<ApiResponse<void>> {
    try {
      const response = await axios.post<ApiResponse<void>>(`${API_URL}/api/products/delete`, { ids }, {
        headers: {
          ...getAuthHeader()
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error deleting products:', error);
      throw error;
    }
  }
}; 