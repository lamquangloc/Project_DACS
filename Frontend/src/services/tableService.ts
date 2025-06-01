import axiosClient from '../config/axios';
import { CreateTableDto, UpdateTableDto, Table, TablesResponse, TableResponse } from '../types/table';
import { API_URL } from '../config';
import { ApiResponse } from '../types/api';

interface ITableService {
  getAll(): Promise<TablesResponse>;
  getById(id: string): Promise<TableResponse>;
  create(data: CreateTableDto): Promise<TableResponse>;
  update(id: string, data: UpdateTableDto): Promise<TableResponse>;
  delete(id: string): Promise<ApiResponse<void>>;
  deleteMany(ids: string[]): Promise<ApiResponse<void>>;
  updateStatus(id: string, status: string): Promise<TableResponse>;
  getAvailableTables(date: string, time: string, guests: number): Promise<ApiResponse<{ tables: Table[] }>>;
}

class TableService implements ITableService {
  private baseUrl = `${API_URL}/api/tables`;

  async getAll(): Promise<TablesResponse> {
    try {
      console.log('Calling getAll tables');
      const response = await axiosClient.get<TablesResponse>(this.baseUrl);
      console.log('GetAll response:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('Error in getAll:', error);
      throw new Error(error.response?.data?.message || 'Không thể tải danh sách bàn');
    }
  }

  async getById(id: string): Promise<TableResponse> {
    try {
      console.log('Getting table by id:', id);
      const response = await axiosClient.get<TableResponse>(`${this.baseUrl}/${id}`);
      console.log('GetById response:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('Error in getById:', error);
      throw new Error(error.response?.data?.message || 'Không thể tải thông tin bàn');
    }
  }

  async create(data: CreateTableDto): Promise<TableResponse> {
    try {
      console.log('Creating table with data:', data);
      const response = await axiosClient.post<TableResponse>(this.baseUrl, data);
      console.log('Create response:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('Error in create:', error);
      throw new Error(error.response?.data?.message || 'Không thể tạo bàn mới');
    }
  }

  async update(id: string, data: UpdateTableDto): Promise<TableResponse> {
    try {
      console.log('Updating table with data:', { id, data });
      const response = await axiosClient.put<TableResponse>(`${this.baseUrl}/${id}`, data);
      console.log('Update response:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('Error in update:', error);
      throw new Error(error.response?.data?.message || 'Không thể cập nhật thông tin bàn');
    }
  }

  async delete(id: string): Promise<ApiResponse<void>> {
    try {
      console.log('Deleting table:', id);
      const response = await axiosClient.delete<ApiResponse<void>>(`${this.baseUrl}/${id}`);
      console.log('Delete response:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('Error in delete:', error);
      throw new Error(error.response?.data?.message || 'Không thể xóa bàn');
    }
  }

  async deleteMany(ids: string[]): Promise<ApiResponse<void>> {
    try {
      console.log('Deleting multiple tables:', ids);
      const response = await axiosClient.request({
        method: 'DELETE',
        url: this.baseUrl,
        data: { ids }
      });
      console.log('DeleteMany response:', response.data);
      return { status: 'success', message: 'Xóa thành công' };
    } catch (error: any) {
      console.error('Error in deleteMany:', error);
      throw new Error(error.response?.data?.message || 'Không thể xóa các bàn đã chọn');
    }
  }

  async updateStatus(id: string, status: string): Promise<TableResponse> {
    try {
      console.log('Updating table status:', { id, status });
      const response = await axiosClient.put<TableResponse>(`${this.baseUrl}/${id}/status`, { status });
      console.log('UpdateStatus response:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('Error in updateStatus:', error);
      throw new Error(error.response?.data?.message || 'Không thể cập nhật trạng thái bàn');
    }
  }

  async getAvailableTables(date: string, time: string, guests: number): Promise<ApiResponse<{ tables: Table[] }>> {
    try {
      console.log('Getting available tables for date:', date, 'time:', time, 'guests:', guests);
      const response = await axiosClient.get<ApiResponse<{ tables: Table[] }>>(`${this.baseUrl}/available`, {
        params: { date, time, guests }
      });
      console.log('GetAvailableTables response:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('Error in getAvailableTables:', error);
      throw new Error(error.response?.data?.message || 'Không thể tải danh sách bàn có sẵn');
    }
  }
}

export default new TableService(); 