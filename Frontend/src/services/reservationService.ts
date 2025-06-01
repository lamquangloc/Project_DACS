import axios from '../config/axios';
import { CreateReservationDto, Reservation, ReservationsResponse, ReservationStatus, UpdateReservationDto } from '../types/reservation';
import { API_URL } from '../config';

export interface IReservationService {
  getAll(): Promise<ReservationsResponse>;
  getById(id: string): Promise<Reservation>;
  create(data: CreateReservationDto): Promise<Reservation>;
  update(id: string, data: UpdateReservationDto): Promise<Reservation>;
  delete(id: string): Promise<void>;
  getByStatus(status: ReservationStatus): Promise<ReservationsResponse>;
  updateStatus(id: string, status: ReservationStatus): Promise<Reservation>;
}

export class ReservationService implements IReservationService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = `${API_URL}/api/reservations`;
  }

  async getAll(): Promise<ReservationsResponse> {
    try {
      console.log('Fetching all reservations...');
      const response = await axios.get<ReservationsResponse>(this.baseUrl);
      console.log('Reservations response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching reservations:', error);
      throw error;
    }
  }

  async getById(id: string): Promise<Reservation> {
    try {
      console.log(`Fetching reservation with id: ${id}`);
      const response = await axios.get<Reservation>(`${this.baseUrl}/${id}`);
      console.log('Reservation response:', response.data);
      return response.data;
    } catch (error) {
      console.error(`Error fetching reservation ${id}:`, error);
      throw error;
    }
  }

  async create(data: CreateReservationDto): Promise<Reservation> {
    try {
      console.log('Creating reservation with data:', data);
      const response = await axios.post<Reservation>(this.baseUrl, data);
      console.log('Create reservation response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error creating reservation:', error);
      throw error;
    }
  }

  async update(id: string, data: UpdateReservationDto): Promise<Reservation> {
    try {
      console.log(`Updating reservation ${id} with data:`, data);
      const response = await axios.put<Reservation>(`${this.baseUrl}/${id}`, data);
      console.log('Update reservation response:', response.data);
      return response.data;
    } catch (error) {
      console.error(`Error updating reservation ${id}:`, error);
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    try {
      console.log(`Deleting reservation ${id}`);
      await axios.delete(`${this.baseUrl}/${id}`);
      console.log('Delete reservation successful');
    } catch (error) {
      console.error(`Error deleting reservation ${id}:`, error);
      throw error;
    }
  }

  async getByStatus(status: ReservationStatus): Promise<ReservationsResponse> {
    try {
      console.log(`Fetching reservations with status: ${status}`);
      const response = await axios.get<ReservationsResponse>(`${this.baseUrl}/status/${status}`);
      console.log('Reservations by status response:', response.data);
      return response.data;
    } catch (error) {
      console.error(`Error fetching reservations with status ${status}:`, error);
      throw error;
    }
  }

  async updateStatus(id: string, status: ReservationStatus): Promise<Reservation> {
    try {
      console.log(`Updating reservation ${id} status to:`, status);
      const response = await axios.put<Reservation>(`${this.baseUrl}/${id}/status`, { status });
      console.log('Update status response:', response.data);
      return response.data;
    } catch (error) {
      console.error(`Error updating reservation status ${id}:`, error);
      throw error;
    }
  }
}

const reservationService = new ReservationService();
export default reservationService; 