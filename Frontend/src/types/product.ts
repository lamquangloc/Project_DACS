import { Category } from './category';

export interface ProductCategory {
  id: string;
  productId: string;
  categoryId: string;
  category: Category;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  image?: string;
  price: number;
  costPrice: number;
  unitId: string;
  unit?: {
    id: string;
    name: string;
  };
  categories?: Array<{
    category: {
      id: string;
      name: string;
    }
  }>;
  isDeleted?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export type CreateProductDto = {
  name: string;
  description?: string;
  price: number;
  costPrice: number;
  categoryIds: string[];
  unitId: string;
  image?: File;
}

export type CreateProductFormData = FormData;

export interface UpdateProductDto extends Partial<CreateProductDto> {} 