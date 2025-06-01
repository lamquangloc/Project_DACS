import { Product } from './product';

export interface Combo {
  id: string;
  name: string;
  description: string;
  price: number;
  image?: string;
  products: ComboProduct[];
  items?: ComboProduct[];
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ComboProduct {
  id: string;
  comboId: string;
  productId: string;
  quantity: number;
  product: Product;
  createdAt: string;
  updatedAt: string;
}

export interface CreateComboDto {
  name: string;
  description?: string;
  price: number;
  image?: File;
  products: {
    productId: string;
    quantity: number;
  }[];
}

export interface UpdateComboDto {
  name?: string;
  description?: string;
  price?: number;
  image?: File;
  products?: {
    productId: string;
    quantity: number;
  }[];
}

export interface PaginatedComboResponse {
  items: Combo[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ComboResponse<T> {
  status: 'success' | 'error';
  message?: string;
  data?: T;
} 