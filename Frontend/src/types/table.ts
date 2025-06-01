

export enum TableStatus {
  AVAILABLE = 'AVAILABLE',
  OCCUPIED = 'OCCUPIED',
  RESERVED = 'RESERVED'
}

export interface Table {
  id: string;
  number: number;
  capacity: number;
  status: TableStatus;
  createdAt?: string;
  updatedAt?: string;
  orderNumber?: number;
}

export interface CreateTableDto {
  number: number;
  capacity: number;
  status: TableStatus;
}

export interface UpdateTableDto extends Partial<CreateTableDto> {}

export interface TableListResponse {
  tables: Table[];
  total: number;
  page: number;
  totalPages: number;
}

export type TableResponse = Table;
export type TablesResponse = {
  tables: Table[];
  total: number;
  page: number;
  totalPages: number;
}; 