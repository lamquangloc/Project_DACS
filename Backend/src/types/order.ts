import { OrderStatus, PaymentStatus } from '@prisma/client';

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
  }[];
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId?: string;
  comboId?: string;
  quantity: number;
  price: number;
  note?: string;
  product?: {
    id: string;
    name: string;
    price: number;
    costPrice: number;
    image?: string;
  };
  combo?: {
    id: string;
    name: string;
    price: number;
    image?: string;
  };
}

export interface Order {
  id: string;
  orderCode: string;
  orderNumber: number;
  userId: string;
  user: {
    id: string;
    name: string;
    email: string;
    phoneNumber?: string;
  };
  tableId?: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  phoneNumber: string;
  address: string;
  provinceCode: string;
  provinceName: string;
  districtCode: string;
  districtName: string;
  wardCode: string;
  wardName: string;
  total: number;
  note?: string;
  createdAt: Date;
  updatedAt: Date;
  items: OrderItem[];
} 