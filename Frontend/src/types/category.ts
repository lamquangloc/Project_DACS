export interface Category {
  id: string;
  orderNumber: number;
  name: string;
  description: string;
  image: string;
  products: any[];
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    products: number;
  };
} 