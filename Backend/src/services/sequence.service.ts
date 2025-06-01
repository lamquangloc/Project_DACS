import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class SequenceService {
  static async getNextSequenceValue(sequenceName: string): Promise<number> {
    // Check if there are any records in the corresponding table
    let count = 0;
    switch (sequenceName) {
      case 'order':
        count = await prisma.order.count();
        break;
      case 'product':
        count = await prisma.product.count();
        break;
      case 'category':
        count = await prisma.category.count();
        break;
      case 'orderItem':
        count = await prisma.orderItem.count();
        break;
      case 'user':
        count = await prisma.user.count();
        break;
      case 'table':
        count = await prisma.table.count();
        break;
      case 'reservation':
        count = await prisma.reservation.count();
        break;
      case 'combo':
        count = await prisma.combo.count();
        break;
      default:
        break;
    }

    // If no records exist, reset the sequence
    if (count === 0) {
      await this.resetSequence(sequenceName);
    }

    // Get next value
    const sequence = await prisma.sequence.upsert({
      where: { name: sequenceName },
      update: { value: { increment: 1 } },
      create: { name: sequenceName, value: 1 }
    });
    return sequence.value;
  }

  static async getCurrentSequenceValue(sequenceName: string): Promise<number> {
    const sequence = await prisma.sequence.findUnique({
      where: { name: sequenceName }
    });

    return sequence?.value || 0;
  }

  static async resetSequence(sequenceName: string): Promise<void> {
    await prisma.sequence.upsert({
      where: { name: sequenceName },
      update: { value: 0 },
      create: { name: sequenceName, value: 0 }
    });
  }

  static async decrementSequenceValue(name: string): Promise<number> {
    const sequence = await prisma.sequence.update({
      where: { name },
      data: {
        value: {
          decrement: 1
        }
      }
    });
    return sequence.value;
  }
} 