import { PrismaClient, Prisma } from '@prisma/client';
import { CreateProductDto, UpdateProductDto } from '../dtos/product.dto';


const prisma = new PrismaClient();

export class ProductService {
  static async getAllProducts(
    page = 1,
    limit = 10,
    search?: string,
    sortBy: string = 'createdAt',
    sortOrder: 'asc' | 'desc' = 'desc',
    categoryId?: string
  ) {
    const skip = (page - 1) * limit;
    const where: Prisma.ProductWhereInput = {
      isDeleted: false
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (categoryId) {
      where.categories = {
        some: {
          categoryId: categoryId
        }
      };
    }

    // Debug log
    console.log('DEBUG where:', where);
const [products, total] = await Promise.all([
  prisma.product.findMany({
    where,
    skip,
    take: limit,
    orderBy: { [sortBy]: sortOrder },
    include: {
      categories: {
        include: {
          category: true
        }
      },
      unit: true
    }
  }),
  prisma.product.count({ where })
]);
console.log('DEBUG products:', products);

    // Debug log
    console.log('DEBUG getAllProducts products:', products);

    return {
      products,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  static async getProductById(id: string) {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        categories: {
          include: {
            category: true
          }
        },
        unit: true
      }
    });

    if (!product) {
      throw new Error('Product not found');
    }

    return product;
  }

  static async createProduct(data: CreateProductDto) {
    const { categoryIds, ...productData } = data;

    const product = await prisma.product.create({
      data: {
        ...productData,
        categories: {
          create: categoryIds.map(categoryId => ({
            category: {
              connect: { id: categoryId }
            }
          }))
        }
      },
      include: {
        categories: {
          include: {
            category: true
          }
        },
        unit: true
      }
    });

    return product;
  }

  static async updateProduct(id: string, data: UpdateProductDto) {
    const { categoryIds, ...updateData } = data;

    // Start a transaction
    const product = await prisma.$transaction(async (prisma) => {
      // If categoryIds is provided, update the categories
      if (categoryIds) {
        // Delete existing category relationships
        await prisma.productCategory.deleteMany({
          where: { productId: id }
        });

        // Create new category relationships
        await prisma.product.update({
          where: { id },
          data: {
            categories: {
              create: categoryIds.map(categoryId => ({
                category: {
                  connect: { id: categoryId }
                }
              }))
            }
          }
        });
      }

      // Update other product data
      return prisma.product.update({
        where: { id },
        data: updateData,
        include: {
          categories: {
            include: {
              category: true
            }
          },
          unit: true
        }
      });
    });

    return product;
  }

  static async deleteProduct(id: string) {
    await prisma.product.update({
      where: { id },
      data: { isDeleted: true }
    });
  }

  static async deleteMany(ids: string[]) {
    await prisma.product.updateMany({
      where: { id: { in: ids } },
      data: { isDeleted: true }
    });
  }

  // Admin dashboard methods
  static async getMenuStats() {
    const [totalProducts, availableProducts, totalCategories, topProducts] = await Promise.all([
      prisma.product.count({ where: { isDeleted: false } }),
      prisma.product.count({
        where: { isDeleted: false }
      }),
      prisma.category.count({ where: { isDeleted: false } }),
      prisma.orderItem.groupBy({
        by: ['productId'],
        _sum: {
          quantity: true
        },
        orderBy: {
          _sum: {
            quantity: 'desc'
          }
        },
        take: 5
      })
    ]);

    const topProductsWithDetails = await Promise.all(
      topProducts.map(async (item) => {
        const product = await prisma.product.findUnique({
          where: { id: String(item.productId) },
          select: {
            name: true,
            price: true
          }
        });

        return {
          ...product,
          totalSold: item._sum.quantity || 0
        };
      })
    );

    return {
      totalProducts,
      availableProducts,
      totalCategories,
      topProducts: topProductsWithDetails
    };
  }
} 