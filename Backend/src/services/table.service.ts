import { PrismaClient, TableStatus } from '@prisma/client';
import { SequenceService } from './sequence.service';

const prisma = new PrismaClient();

export class TableService {
  static async createTable(data: {
    number: number;
    capacity: number;
  }) {
    const orderNumber = await SequenceService.getNextSequenceValue('table');
    
    return prisma.table.create({
      data: {
        ...data,
        orderNumber,
        status: 'AVAILABLE'
      }
    });
  }

  static async getAllTables(page: number = 1, limit: number = 10, includeDeleted: boolean = false) {
    const skip = (page - 1) * limit;
    
    const where = includeDeleted ? {} : { isDeleted: false };
    
    const [tables, total] = await Promise.all([
      prisma.table.findMany({
        where,
        orderBy: {
          number: 'asc'
        },
        skip,
        take: limit
      }),
      prisma.table.count({ where })
    ]);

    return {
      tables,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  static async getTableById(id: string) {
    return prisma.table.findUnique({
      where: { id },
      include: {
        reservations: {
          where: {
            isDeleted: false,
            status: { not: 'COMPLETED' }
          },
          orderBy: {
            date: 'asc'
          }
        }
      }
    });
  }

  static async updateTable(id: string, data: {
    number?: number;
    capacity?: number;
    status?: string;
  }) {
    const updateData: any = {};
    if (data.number !== undefined) updateData.number = data.number;
    if (data.capacity !== undefined) updateData.capacity = data.capacity;
    if (data.status !== undefined) updateData.status = data.status as TableStatus;

    return prisma.table.update({
      where: { id },
      data: updateData
    });
  }

  static async deleteTable(id: string) {
    return prisma.table.update({
      where: { id },
      data: {
        isDeleted: true,
        status: 'DELETED'
      }
    });
  }

  static async getAvailableTables(date: Date, timeSlot: string, guests: number) {
    return prisma.table.findMany({
      where: {
        isDeleted: false,
        capacity: {
          gte: guests
        },
        NOT: {
          reservations: {
            some: {
              date: date,
              time: timeSlot,
              status: { not: 'CANCELLED' },
              isDeleted: false
            }
          }
        }
      },
      orderBy: {
        capacity: 'asc'
      }
    });
  }
} 