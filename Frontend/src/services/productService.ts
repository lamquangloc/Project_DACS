import axios from 'axios';
import { Product, CreateProductDto, CreateProductFormData } from '../types/product';
import { ApiResponse } from '../types/api';
import { PaginatedResponse, PaginationParams } from '../types/pagination';

const API_URL = import.meta.env.VITE_API_URL;
const PRODUCT_API = `${API_URL}/api/products`;

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
  search(query: string): Promise<ApiResponse<Product[]>>;
  getByCategory(categoryId: string): Promise<ApiResponse<Product[]>>;
}

class ProductService implements IProductService {
  async getAll(params?: PaginationParams): Promise<ApiResponse<PaginatedResponse<Product>>> {
    try {
      const response = await axios.get<ApiResponse<any>>(PRODUCT_API, { 
        params,
        headers: {
          ...getAuthHeader()
        }
      });

      // Kiểm tra và chuyển đổi response data
      if (response.data.status === 'success' && response.data.data) {
        const { products, totalItems, totalPages, currentPage } = response.data.data;
        
        return {
          status: 'success',
          message: response.data.message,
          data: {
            items: products || [],
            totalItems: totalItems || 0,
            totalPages: totalPages || 1,
            currentPage: currentPage || 1
          }
        };
      }

      return {
        status: 'error',
        message: response.data.message || 'Failed to fetch products',
        data: {
          items: [],
          totalItems: 0,
          totalPages: 1,
          currentPage: 1
        }
      };
    } catch (error) {
      console.error('Error fetching products:', error);
      throw error;
    }
  }

  async getById(id: string): Promise<ApiResponse<Product>> {
    try {
      const response = await axios.get<ApiResponse<Product>>(`${PRODUCT_API}/${id}`, {
        headers: {
          ...getAuthHeader()
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching product:', error);
      throw error;
    }
  }

  async create(data: CreateProductDto | CreateProductFormData): Promise<ApiResponse<Product>> {
    try {
      // Kiểm tra xem data có phải là FormData không
      const isFormData = data instanceof FormData;
      
      // Log thông tin đang gửi đi
      console.log('Creating product with data:', isFormData ? 'FormData object' : data);
      if (isFormData) {
        // Log các key trong FormData
        for (const pair of (data as FormData).entries()) {
          console.log(`FormData entry - ${pair[0]}: ${pair[1] instanceof File ? 'File: ' + pair[1].name : pair[1]}`);
        }
      }
      
      const config = {
        headers: {
          'Content-Type': isFormData ? 'multipart/form-data' : 'application/json',
          ...getAuthHeader()
        },
      };
      const response = await axios.post<ApiResponse<Product>>(PRODUCT_API, data, config);
      console.log('Create product response:', response);
      return response.data;
    } catch (error) {
      console.error('Error creating product:', error);
      throw error;
    }
  }

  async update(id: string, data: Partial<CreateProductDto> | CreateProductFormData): Promise<ApiResponse<Product>> {
    try {
      const config = {
        headers: {
          'Content-Type': data instanceof FormData ? 'multipart/form-data' : 'application/json',
          ...getAuthHeader()
        },
      };
      const response = await axios.put<ApiResponse<Product>>(`${PRODUCT_API}/${id}`, data, config);
      return response.data;
    } catch (error) {
      console.error('Error updating product:', error);
      throw error;
    }
  }

  async delete(id: string): Promise<ApiResponse<void>> {
    try {
      const response = await axios.delete<ApiResponse<void>>(`${PRODUCT_API}/${id}`, {
        headers: {
          ...getAuthHeader()
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error deleting product:', error);
      throw error;
    }
  }

  async deleteMany(ids: string[]): Promise<ApiResponse<void>> {
    try {
      const response = await axios.post<ApiResponse<void>>(`${PRODUCT_API}/delete`, { ids }, {
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

  async search(query: string): Promise<ApiResponse<Product[]>> {
    try {
      console.log("Searching products with query:", query);
      const response = await axios.get(PRODUCT_API, {
        params: { search: query },
        headers: {
          ...getAuthHeader()
        }
      });
      
      console.log("Search response:", response);
      
      const responseData: any = response.data;
      
      if (responseData && responseData.status === 'success') {
        // Handle different response structures
        let products: Product[] = [];
        
        if (responseData.data) {
          if (Array.isArray(responseData.data)) {
            products = responseData.data;
          } else if (responseData.data.products) {
            products = responseData.data.products;
          } else if (responseData.data.items) {
            products = responseData.data.items;
          }
        }
        
        return {
          status: 'success',
          message: 'Products retrieved successfully',
          data: products
        };
      }
      
      return {
        status: 'error',
        message: responseData?.message || 'Failed to retrieve products'
      };
    } catch (error) {
      console.error('Error searching products:', error);
      return {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error searching products'
      };
    }
  }

  async getByCategory(categoryId: string): Promise<ApiResponse<Product[]>> {
    try {
      console.log("Fetching products for category:", categoryId);
      const response = await axios.get<ApiResponse<Product[]>>(PRODUCT_API, {
        params: {
          categoryId: categoryId
        },
        headers: {
          ...getAuthHeader()
        }
      });
      
      console.log("Category products response:", response);
      return response.data;
    } catch (error) {
      console.error('Error fetching products by category:', error);
      return {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error fetching products by category'
      };
    }
  }
}

const productService = new ProductService();
export { productService }; 