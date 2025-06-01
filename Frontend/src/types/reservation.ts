import { ApiResponse } from './api';
import { Table } from './table';
import { User } from './user';

export enum ReservationStatus {
  PENDING = 'PENDING',      // Đã đặt bàn
  CONFIRMED = 'CONFIRMED',  // Đã nhận bàn
  CANCELLED = 'CANCELLED',  // Đã hủy bàn
  COMPLETED = 'COMPLETED'   // Đã thanh toán
}

export enum TimeSlot {
  SLOT_8_10 = '8h - 10h',
  SLOT_10_12 = '10h - 12h',
  SLOT_14_16 = '14h - 16h',
  SLOT_16_18 = '16h - 18h',
  SLOT_18_20 = '18h - 20h',
  SLOT_20_22 = '20h - 22h'
}

export interface Reservation {
  id: string;
  orderNumber: number;
  name: string;
  phone: string;
  email: string;
  guests: number;
  date: string;
  time: string;
  status: ReservationStatus;
  note?: string;
  isDeleted: boolean;
  tableId: string;
  table: Table;
  userId: string;
  user: User;
  createdAt: string;
  updatedAt: string;
}

export interface CreateReservationDto {
  name: string;
  phone: string;
  email?: string;
  guests: number;
  date: string;
  time: string;
  tableId: string;
  note?: string;
}

export interface UpdateReservationDto {
  name?: string;
  phone?: string;
  email?: string;
  guests?: number;
  date?: string;
  time?: string;
  status?: ReservationStatus;
  tableId?: string;
  note?: string;
}

export interface ReservationListResponse {
  reservations: Reservation[];
  total: number;
  page: number;
  totalPages: number;
}

export type ReservationsResponse = ReservationListResponse;
export type ReservationResponse = ApiResponse<Reservation>; 