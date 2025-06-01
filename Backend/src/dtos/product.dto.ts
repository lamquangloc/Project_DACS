export interface CreateProductDto {
  name: string;
  description: string;
  price: number;
  costPrice: number;
  image?: string;
  categoryIds: string[];
  unitId: string;
  isDeleted?: boolean;
}

export interface UpdateProductDto {
  name?: string;
  description?: string;
  price?: number;
  costPrice?: number;
  image?: string;
  categoryIds?: string[];
  unitId?: string;
  isDeleted?: boolean;
} 