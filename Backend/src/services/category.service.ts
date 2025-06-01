import { PrismaClient } from '@prisma/client';
import { SequenceService } from './sequence.service';

const prisma = new PrismaClient();

export interface CreateCategoryDto {
  name: string;
  description: string;
  image: string;
}

export interface UpdateCategoryDto {
  name?: string;
  description?: string;
  image?: string;
}

export class CategoryService {
  static async createCategory(data: CreateCategoryDto) {
    const orderNumber = await SequenceService.getNextSequenceValue('category');
    
    return prisma.category.create({
      data: {
        name: data.name,
        description: data.description,
        image: data.image,
        orderNumber
      }
    });
  }

  static async getAllCategories(page: number = 1, limit: number = 10) {
    // Nếu limit quá lớn hoặc không truyền, lấy tất cả danh mục
    if (!limit || limit > 1000) {
      const categories = await prisma.category.findMany({
        where: { isDeleted: false },
        orderBy: { orderNumber: 'desc' },
        include: {
          _count: { select: { products: true } }
        }
      });
      const total = categories.length;
      return {
        categories,
        total,
        page: 1,
        totalPages: 1
      };
    }
    const skip = (page - 1) * limit;
    const [categories, total] = await Promise.all([
      prisma.category.findMany({
        where: { isDeleted: false },
        orderBy: { orderNumber: 'desc' },
        skip,
        take: limit,
        include: {
          _count: { select: { products: true } }
        }
      }),
      prisma.category.count({ where: { isDeleted: false } })
    ]);
    return {
      categories,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  static async getCategoryById(id: string) {
    return prisma.category.findFirst({
      where: { 
        id,
        isDeleted: false
      }
    });
  }

  static async updateCategory(id: string, data: UpdateCategoryDto) {
    // First check if category exists and is not deleted
    const existingCategory = await prisma.category.findFirst({
      where: { 
        id,
        isDeleted: false
      }
    });

    if (!existingCategory) {
      throw new Error('Category not found or has been deleted');
    }

    return prisma.category.update({
      where: { id },
      data
    });
  }

  static async deleteCategory(id: string) {
    // First check if category exists and is not already deleted
    const existingCategory = await prisma.category.findFirst({
      where: { 
        id,
        isDeleted: false
      }
    });

    if (!existingCategory) {
      throw new Error('Category not found or has been deleted');
    }

    return prisma.category.update({
      where: { id },
      data: {
        isDeleted: true
      }
    });
  }

  static async deleteMany(ids: string[]) {
    // Kiểm tra xem các danh mục có tồn tại và chưa bị xóa
    const existingCategories = await prisma.category.findMany({
      where: {
        id: { in: ids },
        isDeleted: false
      }
    });

    if (existingCategories.length === 0) {
      throw new Error('Không tìm thấy danh mục nào để xóa');
    }

    // Cập nhật trạng thái isDeleted cho tất cả các danh mục
    return prisma.category.updateMany({
      where: {
        id: { in: ids },
        isDeleted: false
      },
      data: {
        isDeleted: true
      }
    });
  }
} 