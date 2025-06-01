export interface IOrder {
  id: string;
  orderCode: string;
  orderNumber: number;
  userId: string;
  user: {
    id: string;
    name: string;
    email: string;
    phoneNumber: string;
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
  totalAmount: number;
  total: number;
  note?: string;
  createdAt: string;
  updatedAt: string;
  items: IOrderItem[];
}

export interface IOrderItem {
  id: string;
  orderId: string;
  productId?: string;
  comboId?: string;
  quantity: number;
  price: number;
  note?: string;
}

export interface IOrderResponse {
  orders: IOrder[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export enum OrderStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  DELIVERING = 'DELIVERING',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED'
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  FAILED = 'FAILED'
} 