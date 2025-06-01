import axios from '../config/axios';
import { IOrder, IOrderResponse, OrderStatus, PaymentStatus } from '../types/order';
import { ApiResponse } from '../types/api';

const API_URL = import.meta.env.VITE_API_URL;
const ORDER_API = `${API_URL}/api/orders`;

interface OrderResponseData {
  orders: IOrder[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface IOrderService {
  getAll(page?: number, limit?: number, timestamp?: number): Promise<ApiResponse<IOrderResponse>>;
  getById(id: string): Promise<ApiResponse<IOrder>>;
  create(order: Partial<IOrder>): Promise<ApiResponse<IOrder>>;
  update(id: string, order: Partial<IOrder>): Promise<ApiResponse<IOrder>>;
  delete(id: string): Promise<ApiResponse<void>>;
  getByStatus(status: string): Promise<ApiResponse<IOrder[]>>;
  updateOrderStatus(id: string, status: OrderStatus): Promise<ApiResponse<IOrder>>;
  updatePaymentStatus(id: string, paymentStatus: PaymentStatus): Promise<ApiResponse<IOrder>>;
  getMyOrders(): Promise<ApiResponse<IOrder[]>>;
  cancelOrder(orderId: string): Promise<ApiResponse<IOrder>>;
}

export class OrderService implements IOrderService {
  async getAll(page: number = 1, limit: number = 10, timestamp?: number): Promise<ApiResponse<IOrderResponse>> {
    try {
      console.log('OrderService.getAll - Request:', { page, limit, url: ORDER_API });
      
      const response = await axios.get<ApiResponse<OrderResponseData>>(ORDER_API, {
        params: {
          page,
          limit,
          timestamp: timestamp || new Date().getTime()
        },
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      console.log('OrderService.getAll - Raw response:', response);
      
      if (response.data?.status === 'success' && response.data.data) {
        const { orders, pagination } = response.data.data;
        return {
          status: 'success',
          data: {
            orders: orders || [],
            total: pagination?.total || 0,
            page: pagination?.page || page,
            limit: pagination?.limit || limit,
            totalPages: pagination?.totalPages || 1,
            pagination: pagination || {
              total: 0,
              page: page,
              limit: limit,
              totalPages: 1
            }
          }
        };
      }
      
      throw new Error('Invalid response format');
    } catch (error) {
      console.error('OrderService.getAll - Error:', error);
      throw error;
    }
  }

  async getById(id: string): Promise<ApiResponse<IOrder>> {
    try {
      const response = await axios.get<ApiResponse<IOrder>>(`${ORDER_API}/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching order with id ${id}:`, error);
      throw error;
    }
  }

  async create(order: Partial<IOrder>): Promise<ApiResponse<IOrder>> {
    try {
      const response = await axios.post<ApiResponse<IOrder>>(ORDER_API, order);
      return response.data;
    } catch (error) {
      console.error('Error creating order:', error);
      throw error;
    }
  }

  async update(id: string, order: Partial<IOrder>): Promise<ApiResponse<IOrder>> {
    try {
      console.log('Updating order:', { id, order });
      const response = await axios.put<ApiResponse<IOrder>>(`${ORDER_API}/${id}/update`, order);
      console.log('Update response:', response.data);
      return response.data;
    } catch (error: any) {
      console.error(`Error updating order with id ${id}:`, error);
      if (error.response) {
        console.error('Error response:', error.response.data);
        throw new Error(error.response.data.message || 'Failed to update order');
      }
      throw error;
    }
  }

  async delete(id: string): Promise<ApiResponse<void>> {
    try {
      const response = await axios.delete<ApiResponse<void>>(`${ORDER_API}/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Error deleting order with id ${id}:`, error);
      throw error;
    }
  }

  async getByStatus(status: string): Promise<ApiResponse<IOrder[]>> {
    try {
      const response = await axios.get<ApiResponse<IOrder[]>>(`${ORDER_API}/status/${status}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching orders with status ${status}:`, error);
      throw error;
    }
  }

  async updateOrderStatus(id: string, status: OrderStatus): Promise<ApiResponse<IOrder>> {
    try {
      console.log('Updating order status:', { id, status });
      const response = await axios.put<ApiResponse<IOrder>>(`${ORDER_API}/${id}/status`, { status });
      console.log('Update order status response:', response.data);
      return response.data;
    } catch (error: any) {
      console.error(`Error updating order status for id ${id}:`, error);
      if (error.response) {
        console.error('Error response:', error.response.data);
        throw new Error(error.response.data.message || 'Failed to update order status');
      }
      throw error;
    }
  }

  async updatePaymentStatus(id: string, paymentStatus: PaymentStatus): Promise<ApiResponse<IOrder>> {
    try {
      console.log('Updating payment status:', { id, paymentStatus });
      const response = await axios.put<ApiResponse<IOrder>>(`${ORDER_API}/${id}/payment-status`, { paymentStatus });
      console.log('Update payment status response:', response.data);
      return response.data;
    } catch (error: any) {
      console.error(`Error updating payment status for order id ${id}:`, error);
      if (error.response) {
        console.error('Error response:', error.response.data);
        throw new Error(error.response.data.message || 'Failed to update payment status');
      }
      throw error;
    }
  }

  async getMyOrders(): Promise<ApiResponse<IOrder[]>> {
    try {
      const response = await axios.get<ApiResponse<IOrder[]>>(`${ORDER_API}/me`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching orders for user:`, error);
      throw error;
    }
  }

  async cancelOrder(orderId: string): Promise<ApiResponse<IOrder>> {
    try {
      const response = await axios.put<ApiResponse<IOrder>>(`${ORDER_API}/${orderId}/status`, { status: 'CANCELLED' });
      return response.data;
    } catch (error) {
      console.error(`Error canceling order with id ${orderId}:`, error);
      throw error;
    }
  }
}

export default new OrderService();