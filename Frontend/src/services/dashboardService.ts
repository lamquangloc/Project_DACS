import axios from '../config/axios';
import { ApiResponse } from '../types/api';

const API_URL = import.meta.env.VITE_API_URL;

export interface DashboardStats {
  totalOrders: number;
  totalRevenue: number;
  totalCustomers: number;
  revenueData: {
    labels: string[];
    revenue: number[];
    profit: number[];
  };
  productStats: {
    id: string;
    name: string;
    category: string;
    price: number;
    totalSold: number;
    image: string;
  }[];
  topProducts: {
    name: string;
    percentage: number;
    color: string;
  }[];
}

export interface IDashboardService {
  getStats(timeRange: 'today' | 'week' | 'month' | 'year' | 'all'): Promise<ApiResponse<DashboardStats>>;
}

class DashboardService implements IDashboardService {
  async getStats(timeRange: 'today' | 'week' | 'month' | 'year' | 'all'): Promise<ApiResponse<DashboardStats>> {
    try {
      const response = await axios.get<ApiResponse<DashboardStats>>(`${API_URL}/api/dashboard/stats`, {
        params: { timeRange },
        headers: getAuthHeader()
      });
      return response.data;
    } catch (error) {
      let message = 'Đã xảy ra lỗi';
      if (error && typeof error === 'object' && 'message' in error) {
        message = (error as any).message;
      }
      return { status: 'error', message, data: undefined };
    }
  }
}

function getAuthHeader() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default new DashboardService(); 