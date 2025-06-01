import { PrismaClient } from '@prisma/client';
import { SequenceService } from './sequence.service';

const prisma = new PrismaClient();

export interface ComboItemInput {
  productId: string;
  quantity: number;
}

export class ComboService {
  static async createCombo(data: {
    name: string;
    description: string;
    price: number;
    image?: string;
    items: ComboItemInput[];
  }) {
    const orderNumber = await SequenceService.getNextSequenceValue('combo');
    
    // Kiểm tra sản phẩm có tồn tại không
    for (const item of data.items) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId }
      });
      
      if (!product) {
        throw new Error(`Product with ID ${item.productId} not found`);
      }
    }
    
    // Tạo combo
    return prisma.combo.create({
      data: {
        orderNumber,
        name: data.name,
        description: data.description,
        price: data.price,
        image: data.image,
        items: {
          create: data.items.map(item => ({
            quantity: item.quantity,
            product: {
              connect: {
                id: item.productId
              }
            }
          }))
        }
      },
      include: {
        items: {
          include: {
            product: true
          }
        }
      }
    });
  }

  static async getAllCombos(page: number = 1, limit: number = 10, includeDeleted: boolean = false) {
    const skip = (page - 1) * limit;
    
    const where = includeDeleted ? {} : { isDeleted: false };
    
    const [combos, total] = await Promise.all([
      prisma.combo.findMany({
        where,
        include: {
          items: {
            include: {
              product: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take: limit
      }),
      prisma.combo.count({ where })
    ]);

    return {
      combos,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  static async getComboById(id: string) {
    return prisma.combo.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: true
          }
        }
      }
    });
  }

  static async updateCombo(id: string, data: {
    name?: string;
    description?: string;
    price?: number;
    image?: string;
    items?: ComboItemInput[];
  }) {
    // Kiểm tra combo có tồn tại không
    const existingCombo = await prisma.combo.findUnique({
      where: { id },
      include: {
        items: true
      }
    });

    if (!existingCombo) {
      throw new Error('Combo not found');
    }

    // Nếu có cập nhật items
    if (data.items && data.items.length > 0) {
      // Kiểm tra sản phẩm có tồn tại không
      for (const item of data.items) {
        const product = await prisma.product.findUnique({
          where: { id: item.productId }
        });
        
        if (!product) {
          throw new Error(`Product with ID ${item.productId} not found`);
        }
      }

      // Xóa các items cũ
      await prisma.comboItem.deleteMany({
        where: { comboId: id }
      });

      // Thêm items mới
      for (const item of data.items) {
        await prisma.comboItem.create({
          data: {
            comboId: id,
            productId: item.productId,
            quantity: item.quantity
          }
        });
      }
    }

    // Cập nhật thông tin combo
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.price !== undefined) updateData.price = data.price;
    if (data.image !== undefined) updateData.image = data.image;

    return prisma.combo.update({
      where: { id },
      data: updateData,
      include: {
        items: {
          include: {
            product: true
          }
        }
      }
    });
  }

  static async deleteCombo(id: string) {
    return prisma.combo.update({
      where: { id },
      data: {
        isDeleted: true
      }
    });
  }

  static async deleteManyCombos(ids: string[]) {
    return prisma.combo.updateMany({
      where: { id: { in: ids } },
      data: { isDeleted: true }
    });
  }
} 