import axios from 'axios';
import { Unit } from '../types/unit';
import { ApiResponse } from '../types/api';

const API_URL = import.meta.env.VITE_API_URL;
const UNIT_API = `${API_URL}/api/units`;

interface UnitsResponse {
  units: Unit[];
  totalItems: number;
  totalPages: number;
  currentPage: number;
}

export const unitService = {
  getAll: async (): Promise<ApiResponse<UnitsResponse>> => {
    try {
      const response = await axios.get<ApiResponse<UnitsResponse>>(UNIT_API);
      return response.data;
    } catch (error) {
      console.error('Error fetching units:', error);
      throw error;
    }
  },

  getById: async (id: string): Promise<ApiResponse<Unit>> => {
    try {
      const response = await axios.get<ApiResponse<Unit>>(`${UNIT_API}/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching unit:', error);
      throw error;
    }
  },

  create: async (data: { name: string }): Promise<ApiResponse<Unit>> => {
    try {
      const response = await axios.post<ApiResponse<Unit>>(UNIT_API, data);
      return response.data;
    } catch (error) {
      console.error('Error creating unit:', error);
      throw error;
    }
  },

  update: async (id: string, data: { name: string }): Promise<ApiResponse<Unit>> => {
    try {
      const response = await axios.put<ApiResponse<Unit>>(`${UNIT_API}/${id}`, data);
      return response.data;
    } catch (error) {
      console.error('Error updating unit:', error);
      throw error;
    }
  },

  delete: async (id: string): Promise<ApiResponse<void>> => {
    try {
      const response = await axios.delete<ApiResponse<void>>(`${UNIT_API}/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting unit:', error);
      throw error;
    }
  }
}; 