import { PrismaClient, Prisma, OrderStatus, PaymentStatus } from '@prisma/client';
import { SequenceService } from './sequence.service';
import { AppError } from '../utils/appError';
import { startOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subYears } from 'date-fns';

const prisma = new PrismaClient();

interface OrderItem {
  productId: string;
  quantity: number;
  price: number;
}

export interface CreateOrderDto {
  userId: string;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  address: string;
  provinceCode: string;
  provinceName: string;
  districtCode: string;
  districtName: string;
  wardCode: string;
  wardName: string;
  phoneNumber: string;
  note?: string;
}

export interface UpdateOrderDto {
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  note?: string;
}

export interface UpdateOrderStatusDto {
  status: OrderStatus;
}

export interface UpdatePaymentStatusDto {
  paymentStatus: PaymentStatus;
}

export class OrderService {
  static async getAllOrders(_page = 1, _limit = 10, status?: OrderStatus) {
    const where = status ? { status } : {};
    const orders = await prisma.order.findMany({
      where,
      include: {
        user: true,
        items: {
          include: {
            product: true,
            combo: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    return { orders };
  }

  static async getMyOrders(userId: string, _page = 1, _limit = 10, status?: OrderStatus) {
    const where: Prisma.OrderWhereInput = { userId };
    if (status) {
      where.status = status;
    }
    const orders = await prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        items: {
          include: {
            product: true,
            combo: true
          }
        }
      }
    });
    return { orders };
  }

  static async createOrder(data: CreateOrderDto) {
    const orderNumber = await SequenceService.getNextSequenceValue('order');
    const orderCode = `ORD${orderNumber.toString().padStart(6, '0')}`;
    
    return prisma.order.create({
      data: {
        orderNumber,
        orderCode,
        userId: data.userId,
        total: data.total,
        status: data.status,
        paymentStatus: data.paymentStatus,
        address: data.address,
        provinceCode: data.provinceCode,
        provinceName: data.provinceName,
        districtCode: data.districtCode,
        districtName: data.districtName,
        wardCode: data.wardCode,
        wardName: data.wardName,
        phoneNumber: data.phoneNumber,
        note: data.note,
        items: {
          create: data.items.map((item: any) => ({
            quantity: item.quantity,
            price: item.price,
            productId: item.productId,
            comboId: item.comboId
          }))
        }
      },
      include: {
        user: true,
        items: {
          include: {
            product: true,
            combo: true
          }
        }
      }
    });
  }

  static async getOrderById(id: string) {
    return prisma.order.findUnique({
      where: { id },
      include: {
        user: true,
        items: {
          include: {
            product: true,
            combo: true
          }
        }
      }
    });
  }

  static async getMyOrderById(userId: string, id: string) {
    const order = await prisma.order.findFirst({
      where: { id, userId },
      include: {
        items: {
          include: {
            product: true,
            combo: true
          }
        }
      }
    });

    if (!order) {
      throw new Error('Order not found');
    }

    return order;
  }

  static async updateOrder(id: string, data: UpdateOrderDto) {
    return prisma.order.update({
      where: { id },
      data,
      include: {
        user: true,
        items: {
          include: {
            product: true,
            combo: true
          }
        }
      }
    });
  }

  static async updateOrderStatus(id: string, data: UpdateOrderStatusDto) {
    const order = await prisma.order.update({
      where: { id },
      data: { status: data.status },
      include: {
        items: {
          include: {
            product: true,
            combo: true
          }
        },
        user: true
      }
    });

    return order;
  }

  static async updatePaymentStatus(id: string, data: UpdatePaymentStatusDto) {
    const order = await prisma.order.update({
      where: { id },
      data: { paymentStatus: data.paymentStatus },
      include: {
        items: {
          include: {
            product: true,
            combo: true
          }
        },
        user: true
      }
    });

    return order;
  }

  static async deleteOrder(id: string) {
    return prisma.order.delete({
      where: { id }
    });
  }

  static async getOrderStats() {
    const [totalOrders, totalRevenue, ordersByStatus] = await Promise.all([
      prisma.order.count(),
      prisma.order.aggregate({
        _sum: {
          total: true
        }
      }),
      prisma.order.groupBy({
        by: ['status'],
        _count: true
      })
    ]);

    return {
      totalOrders,
      totalRevenue: totalRevenue._sum?.total || 0,
      ordersByStatus: ordersByStatus.reduce((acc, curr) => {
        acc[curr.status] = curr._count;
        return acc;
      }, {} as Record<OrderStatus, number>)
    };
  }

  static async getDashboardStats(timeRange: 'today' | 'week' | 'month' | 'year' | 'all' = 'today') {
    try {
      let startDate: Date;
      let endDate: Date = new Date();
      let interval: 'hour' | 'day' | 'month' | 'quarter';
      let labels: string[] = [];

      switch (timeRange) {
        case 'today':
          startDate = startOfDay(new Date());
          interval = 'hour';
          // Generate labels for every 2 hours from 8:00 to 22:00
          labels = Array.from({ length: 8 }, (_, i) => `${8 + i * 2}:00`);
          break;

        case 'week':
          startDate = startOfWeek(new Date());
          endDate = endOfWeek(new Date());
          interval = 'day';
          // Generate labels for days of the week
          labels = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];
          break;

        case 'month':
          startDate = startOfMonth(new Date());
          endDate = endOfMonth(new Date());
          interval = 'day';
          // Generate labels for every 5 days
          const daysInMonth = endDate.getDate();
          labels = Array.from({ length: Math.ceil(daysInMonth / 5) }, (_, i) => 
            `Ngày ${1 + i * 5}${i === Math.floor(daysInMonth / 5) ? `-${daysInMonth}` : `-${Math.min((i + 1) * 5, daysInMonth)}`}`
          );
          break;

        case 'year':
          startDate = startOfYear(new Date());
          endDate = endOfYear(new Date());
          interval = 'month';
          // Generate labels for months
          labels = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'];
          break;

        case 'all':
          startDate = startOfYear(subYears(new Date(), 2)); // Start from 2 years ago
          interval = 'quarter';
          // Generate labels for quarters
          const quarters = Math.ceil((endDate.getTime() - startDate.getTime()) / (3 * 30 * 24 * 60 * 60 * 1000));
          labels = Array.from({ length: quarters }, (_, i) => {
            const year = startDate.getFullYear() + Math.floor(i / 4);
            const quarter = (i % 4) + 1;
            return `Q${quarter}/${year}`;
          });
          break;

        default:
          throw new AppError('Invalid time range', 400);
      }

      // Get orders within date range
      const orders = await prisma.order.findMany({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate
          },
          status: {
            not: OrderStatus.CANCELLED
          },
          paymentStatus: 'PAID'
        },
        include: {
          items: {
            include: {
              product: true,
              combo: true
            }
          },
          user: true
        }
      });

      // Calculate revenue and profit data
      const revenueData = {
        labels,
        revenue: new Array(labels.length).fill(0),
        profit: new Array(labels.length).fill(0)
      };

      orders.forEach(order => {
        const orderDate = new Date(order.createdAt);
        let index = 0;

        switch (interval) {
          case 'hour':
            index = Math.floor((orderDate.getHours() - 8) / 2);
            break;
          case 'day':
            index = timeRange === 'week' 
              ? orderDate.getDay() - 1 // Monday is 0
              : Math.floor(orderDate.getDate() / 5);
            break;
          case 'month':
            index = orderDate.getMonth();
            break;
          case 'quarter':
            const monthsSinceStart = (orderDate.getFullYear() - startDate.getFullYear()) * 12 
              + orderDate.getMonth() - startDate.getMonth();
            index = Math.floor(monthsSinceStart / 3);
            break;
        }

        if (index >= 0 && index < labels.length) {
          revenueData.revenue[index] += order.total;
          // Calculate profit
          const profit = order.items.reduce((acc, item) => {
            const costPrice = item.product?.costPrice || item.combo?.price || 0;
            return acc + (item.price - costPrice) * item.quantity;
          }, 0);
          revenueData.profit[index] += profit;
        }
      });

      // Get unique customers (user + staff)
      const userCount = await prisma.user.count({
        where: {
          isDeleted: false,
          OR: [
            { role: 'USER' },
            { role: 'STAFF' }
          ]
        }
      });

      // Get product stats (chỉ tính đơn hàng PAID)
      const productStats = await prisma.product.findMany({
        where: {
          isDeleted: false
        },
        include: {
          categories: {
            include: {
              category: true
            }
          },
          orderItems: {
            where: {
              order: {
                status: {
                  not: OrderStatus.CANCELLED
                },
                paymentStatus: 'PAID'
              }
            }
          }
        }
      });

      const formattedProductStats = productStats.map(product => ({
        id: product.id,
        name: product.name,
        category: product.categories[0]?.category.name || 'Không có danh mục',
        price: product.price,
        totalSold: product.orderItems.reduce((acc: number, item: any) => acc + item.quantity, 0),
        image: product.image || ''
      }));

      // Sort products by total sold and get top 5
      const totalSoldAll = formattedProductStats.reduce((acc, p) => acc + p.totalSold, 0) || 1;
      const topProducts = formattedProductStats
        .sort((a, b) => b.totalSold - a.totalSold)
        .slice(0, 5)
        .map(product => ({
          name: product.name,
          percentage: Math.round(product.totalSold / totalSoldAll * 100)
        }));
    
    return {
        totalOrders: orders.length,
        totalRevenue: orders.reduce((acc, order) => acc + order.total, 0),
        totalCustomers: userCount,
        revenueData,
        productStats: formattedProductStats,
        topProducts
      };
    } catch (error) {
      console.error('Error getting dashboard stats:', error);
      throw error;
    }
  }
  
  static async getDailyRevenue(startDate: string, endDate: string) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    const orders = await prisma.order.findMany({
      where: {
        createdAt: {
          gte: start,
          lte: end
        },
        paymentStatus: PaymentStatus.PAID
      },
      select: {
        createdAt: true,
        total: true
      },
      orderBy: {
        createdAt: 'asc'
      }
    });
    
    // Group by day
    const revenueByDay: Record<string, number> = {};
    
    orders.forEach(order => {
      const date = order.createdAt.toISOString().split('T')[0];
      revenueByDay[date] = (revenueByDay[date] || 0) + order.total;
    });
    
    return revenueByDay;
  }
  
  static async getMonthlyRevenue(year: string) {
    const startDate = new Date(`${year}-01-01`);
    const endDate = new Date(`${year}-12-31`);
    
    const orders = await prisma.order.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate
        },
        paymentStatus: PaymentStatus.PAID
      },
      select: {
        createdAt: true,
        total: true
      },
      orderBy: {
        createdAt: 'asc'
      }
    });
    
    // Group by month
    const revenueByMonth: Record<string, number> = {};
    
    orders.forEach(order => {
      const month = order.createdAt.toISOString().split('T')[0].substring(0, 7); // YYYY-MM
      revenueByMonth[month] = (revenueByMonth[month] || 0) + order.total;
    });
    
    return revenueByMonth;
  }
} 