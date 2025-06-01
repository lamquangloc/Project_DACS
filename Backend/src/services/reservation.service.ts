import { PrismaClient, ReservationStatus } from '@prisma/client';
import { SequenceService } from './sequence.service';
import { TableService } from './table.service';

const prisma = new PrismaClient();

export class ReservationService {
  static async createReservation(data: {
    userId: string;
    tableId: string;
    date: Date;
    timeSlot: string;
    guests: number;
    name: string;
    phone: string;
    email: string;
    note?: string;
  }) {
    const orderNumber = await SequenceService.getNextSequenceValue('reservation');
    
    // Kiểm tra bàn có sẵn sàng không
    const availableTables = await TableService.getAvailableTables(
      data.date,
      data.timeSlot,
      data.guests
    );

    if (!availableTables.some(table => table.id === data.tableId)) {
      throw new Error('Table is not available for the selected date and time');
    }

    // Tạo dữ liệu chính xác cho Prisma
    const { timeSlot, ...restData } = data;
    
    return prisma.reservation.create({
      data: {
        ...restData,
        time: timeSlot,
        orderNumber,
        status: 'PENDING'
      }
    });
  }

  static async getAllReservations(page: number = 1, limit: number = 10, includeDeleted: boolean = false) {
    const skip = (page - 1) * limit;
    
    const where = includeDeleted ? {} : { isDeleted: false };
    
    const [reservations, total] = await Promise.all([
      prisma.reservation.findMany({
        where,
        include: {
          table: true,
          user: true
        },
        orderBy: {
          date: 'desc'
        },
        skip,
        take: limit
      }),
      prisma.reservation.count({ where })
    ]);

    return {
      reservations,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  static async getReservationById(id: string) {
    return prisma.reservation.findUnique({
      where: { id },
      include: {
        table: true,
        user: true
      }
    });
  }

  static async updateReservationStatus(id: string, status: ReservationStatus) {
    return prisma.reservation.update({
      where: { id },
      data: { status },
      include: {
        table: true,
        user: true
      }
    });
  }

  static async updateReservation(id: string, data: {
    tableId?: string;
    date?: Date;
    timeSlot?: string;
    guests?: number;
    name?: string;
    phone?: string;
    email?: string;
    note?: string;
    status?: string;
  }) {
    // Nếu chỉ cập nhật status, không cần kiểm tra bàn
    if (Object.keys(data).length === 1 && data.status) {
      return this.updateReservationStatus(id, data.status as ReservationStatus);
    }

    // Kiểm tra tính khả dụng của bàn khi có thay đổi về bàn, ngày hoặc khung giờ
    if (data.tableId || data.date || data.timeSlot) {
      const reservation = await prisma.reservation.findUnique({
        where: { id }
      });

      if (!reservation) {
        throw new Error('Reservation not found');
      }

      const availableTables = await TableService.getAvailableTables(
        data.date || reservation.date,
        data.timeSlot || reservation.time,
        data.guests || reservation.guests
      );

      const targetTableId = data.tableId || reservation.tableId;
      if (!availableTables.some(table => table.id === targetTableId)) {
        throw new Error('Table is not available for the selected date and time');
      }
    }

    // Tạo dữ liệu cập nhật chính xác cho Prisma
    const updateData: any = { ...data };
    if (data.timeSlot) {
      updateData.time = data.timeSlot;
      delete updateData.timeSlot;
    }

    return prisma.reservation.update({
      where: { id },
      data: updateData,
      include: {
        table: true,
        user: true
      }
    });
  }

  static async deleteReservation(id: string) {
    return prisma.reservation.update({
      where: { id },
      data: {
        isDeleted: true,
        status: 'CANCELLED'
      }
    });
  }

  static async getReservationsByUser(userId: string, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;
    
    const [reservations, total] = await Promise.all([
      prisma.reservation.findMany({
        where: {
          userId,
          isDeleted: false
        },
        include: {
          table: true
        },
        orderBy: {
          date: 'desc'
        },
        skip,
        take: limit
      }),
      prisma.reservation.count({
        where: {
          userId,
          isDeleted: false
        }
      })
    ]);

    return {
      reservations,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }
} 