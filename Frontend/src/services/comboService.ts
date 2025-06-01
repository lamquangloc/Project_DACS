import axios from 'axios';
import { Combo, CreateComboDto, UpdateComboDto } from '../types/combo';
import { ApiResponse } from '../types/api';
import { PaginatedResponse, PaginationParams } from '../types/pagination';

const API_URL = import.meta.env.VITE_API_URL;
const COMBO_API = `${API_URL}/api/combos`;

const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export interface IComboService {
  getAll(params?: PaginationParams): Promise<ApiResponse<PaginatedResponse<Combo>>>;
  getById(id: string): Promise<ApiResponse<Combo>>;
  create(data: CreateComboDto | FormData): Promise<ApiResponse<Combo>>;
  update(id: string, data: UpdateComboDto | FormData): Promise<ApiResponse<Combo>>;
  delete(id: string): Promise<ApiResponse<void>>;
  deleteMany(ids: string[]): Promise<ApiResponse<void>>;
}

export class ComboService implements IComboService {
  async getAll(params?: PaginationParams): Promise<ApiResponse<PaginatedResponse<Combo>>> {
    try {
      console.log('Calling combo API:', COMBO_API, 'with params:', params);
      
      const response = await axios.get(COMBO_API, { 
        params,
        headers: {
          ...getAuthHeader(),
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Raw combo API response:', response);
      
      if (response.data) {
        // Chuyển đổi response về định dạng chuẩn nếu cần
        const data: any = response.data;
        
        // Nếu data không có cấu trúc chuẩn, tạo cấu trúc mới
        if (!data.status) {
          // Có thể response trả về trực tiếp mảng dữ liệu
          let combos: Combo[] = [];
          if (Array.isArray(data)) {
            combos = data;
          } else if (data.combos && Array.isArray(data.combos)) {
            combos = data.combos;
          } else if (data.items && Array.isArray(data.items)) {
            combos = data.items;
          } else if (data.data) {
            if (Array.isArray(data.data)) {
              combos = data.data;
            } else if (data.data.combos && Array.isArray(data.data.combos)) {
              combos = data.data.combos;
            } else if (data.data.items && Array.isArray(data.data.items)) {
              combos = data.data.items;
            }
          }
          
          console.log('Extracted combos:', combos);
          
          return {
            status: 'success',
            message: 'Combos fetched successfully',
            data: {
              items: combos,
              totalItems: combos.length,
              currentPage: params?.page || 1,
              totalPages: Math.ceil(combos.length / (params?.limit || 10))
            }
          };
        }
        
        // Nếu response đã có cấu trúc chuẩn {status, message, data}
        return data;
      }
      
      // Fallback nếu không có dữ liệu
      return {
        status: 'error',
        message: 'No data received from API'
      };
    } catch (error) {
      console.error('Error fetching combos:', error);
      return {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async getById(id: string): Promise<ApiResponse<Combo>> {
    try {
      const response = await axios.get<ApiResponse<Combo>>(`${COMBO_API}/${id}`, {
        headers: {
          ...getAuthHeader()
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching combo:', error);
      throw error;
    }
  }

  async create(data: FormData): Promise<ApiResponse<Combo>> {
    try {
      console.log('Creating combo with FormData');
      
      // Log các key trong FormData
      for (const pair of data.entries()) {
        let valueToLog = pair[1];
        if (pair[1] instanceof File) {
          valueToLog = `File: ${pair[1].name}, size: ${pair[1].size}, type: ${pair[1].type}`;
        }
        console.log(`FormData entry - ${pair[0]}: ${valueToLog}`);
      }
      
      const config = {
        headers: {
          'Content-Type': 'multipart/form-data',
          ...getAuthHeader()
        }
      };
      
      const response = await axios.post<ApiResponse<Combo>>(COMBO_API, data, config);
      console.log('Create combo response:', response);
      
      return response.data;
    } catch (error) {
      console.error('Error creating combo:', error);
      throw error;
    }
  }

  async update(id: string, data: FormData): Promise<ApiResponse<Combo>> {
    try {
      console.log('Updating combo with FormData');
      
      // Log các key trong FormData
      for (const pair of data.entries()) {
        let valueToLog = pair[1];
        if (pair[1] instanceof File) {
          valueToLog = `File: ${pair[1].name}, size: ${pair[1].size}, type: ${pair[1].type}`;
        }
        console.log(`FormData entry - ${pair[0]}: ${valueToLog}`);
      }
      
      const config = {
        headers: {
          'Content-Type': 'multipart/form-data',
          ...getAuthHeader()
        }
      };
      
      const response = await axios.put<ApiResponse<Combo>>(`${COMBO_API}/${id}`, data, config);
      console.log('Update combo response:', response);
      
      return response.data;
    } catch (error) {
      console.error('Error updating combo:', error);
      throw error;
    }
  }

  async delete(id: string): Promise<ApiResponse<void>> {
    try {
      const response = await axios.delete<ApiResponse<void>>(`${COMBO_API}/${id}`, {
        headers: {
          ...getAuthHeader()
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error deleting combo:', error);
      throw error;
    }
  }

  async deleteMany(ids: string[]): Promise<ApiResponse<void>> {
    try {
      await axios.request({
        method: 'DELETE',
        url: `${COMBO_API}/delete-many`,
        headers: {
          ...getAuthHeader()
        },
        data: { ids }
      });
      return { status: 'success', message: 'Deleted combos successfully' };
    } catch (error) {
      console.error('Error deleting many combos:', error);
      throw error;
    }
  }
}

const comboService = new ComboService();
export default comboService;