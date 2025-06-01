import { Request, Response, NextFunction } from 'express';
import { OrderService } from '../services/order.service';
import { AppError } from '../middleware/error.middleware';
import { OrderStatus, PaymentStatus } from '@prisma/client';
import { PrismaClient } from '@prisma/client';
import { generateOrderCode } from '../utils/codeGenerator';
import { vnpay } from '../utils/vnpay';
import { format } from 'date-fns';
import { ProductCode, VnpLocale } from 'vnpay';

const prisma = new PrismaClient();

export class OrderController {
  static async createOrder(req: Request, res: Response, _next: NextFunction) {
    try {
      const { userId, items, total, address, phoneNumber, note, paymentStatus, status, provinceCode, provinceName, districtCode, districtName, wardCode, wardName } = req.body;

      // Validate required fields
      if (!userId || !items || !total || !address || !phoneNumber || !provinceCode || !provinceName || !districtCode || !districtName || !wardCode || !wardName) {
        return res.status(400).json({
          status: 'error',
          message: 'Missing required fields'
        });
      }

      // Get the next order number
      const sequence = await prisma.sequence.upsert({
        where: { name: 'order' },
        update: { value: { increment: 1 } },
        create: { name: 'order', value: 1 }
      });

      // Generate order code
      const orderCode = generateOrderCode(sequence.value);

      // Create order with items
      const order = await prisma.order.create({
        data: {
          orderNumber: sequence.value,
          orderCode,
          userId,
          total,
          address,
          provinceCode,
          provinceName,
          districtCode,
          districtName,
          wardCode,
          wardName,
          phoneNumber,
          note,
          paymentStatus: paymentStatus || 'PENDING',
          status: status || 'PENDING',
          items: {
            create: items.map((item: any) => ({
              productId: item.productId || null,
              comboId: item.comboId || null,
              quantity: item.quantity,
              price: item.price
            }))
          }
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

      // Nếu là VNPAY (paymentStatus === 'PAID')
      if (paymentStatus === 'PAID') {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);

        const ip = Array.isArray(req.headers['x-forwarded-for'])
          ? req.headers['x-forwarded-for'][0]
          : (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1') as string;

        const paymentUrl = vnpay.buildPaymentUrl({
          vnp_Amount: (total/100) * 100,
          vnp_IpAddr: ip,
          vnp_TxnRef: String(order.id),
          vnp_OrderInfo: `Thanh toan don hang ${order.id}`,
          vnp_OrderType: ProductCode.Other,
          vnp_ReturnUrl: 'http://localhost:3000/orders/vnpay-return',
          vnp_Locale: VnpLocale.VN,
          vnp_CreateDate: Number(format(new Date(), 'yyyyMMddHHmmss')),
          vnp_ExpireDate: Number(format(tomorrow, 'yyyyMMddHHmmss')),
        });
        return res.json({ paymentUrl });
      }

      // Nếu là COD
      res.status(201).json({
        status: 'success',
        message: 'Order created successfully',
        data: order
      });
    } catch (error) {
      console.error('Error creating order:', error);
      res.status(500).json({
        status: 'error',
        message: error instanceof Error ? error.message : 'Internal server error'
      });
    }
    return;
  }

  static async getMyOrders(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({ status: 'error', message: 'Unauthorized' });
      }
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const status = req.query.status ? OrderStatus[req.query.status as keyof typeof OrderStatus] : undefined;
      const result = await OrderService.getMyOrders(req.user.id, page, limit, status);
      res.json(result);
    } catch (error) {
      next(error);
    }
    return;
  }

  static async getMyOrderById(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({ status: 'error', message: 'Unauthorized' });
      }
      const { id } = req.params;
      const order = await OrderService.getMyOrderById(req.user.id, id);
      if (!order) {
        throw new AppError('Order not found', 404);
      }
      res.json(order);
    } catch (error) {
      next(error);
    }
    return;
  }

  static async getAllOrders(req: Request, res: Response, next: NextFunction) {
    try {
      const status = req.query.status ? OrderStatus[req.query.status as keyof typeof OrderStatus] : undefined;
      const result = await OrderService.getAllOrders(undefined, undefined, status);
      res.json({ status: 'success', data: result });
    } catch (error) {
      console.error('Error getting orders:', error);
      next(error);
    }
  }

  static async getOrderById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const order = await OrderService.getOrderById(id);

      if (!order) {
        throw new AppError('Order not found', 404);
      }

      res.json(order);
    } catch (error) {
      next(error);
    }
  }

  static async updateOrderStatus(req: Request, res: Response, _next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({ status: 'error', message: 'Unauthorized' });
      }
      const { id } = req.params;
      const { status } = req.body;
      // Lấy đơn hàng
      const order = await prisma.order.findUnique({ where: { id } });
      if (!order) {
        return res.status(404).json({ status: 'error', message: 'Order not found' });
      }
      // Nếu không phải admin và không phải chủ đơn thì cấm
      if (req.user.role !== 'ADMIN' && order.userId !== req.user.id) {
        return res.status(403).json({ status: 'error', message: 'Bạn không có quyền cập nhật đơn này!' });
      }
      if (!status || !Object.values(OrderStatus).includes(status)) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid order status'
        });
      }
      const updatedOrder = await OrderService.updateOrderStatus(id, { status });
      if (!updatedOrder) {
        return res.status(404).json({
          status: 'error',
          message: 'Order not found'
        });
      }
      return res.status(200).json({
        status: 'success',
        data: updatedOrder
      });
    } catch (error) {
      console.error('Error updating order status:', error);
      return res.status(500).json({
        status: 'error',
        message: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }

  static async updatePaymentStatus(req: Request, res: Response, _next: NextFunction) {
    try {
      const { id } = req.params;
      const { paymentStatus } = req.body;

      if (!paymentStatus || !Object.values(PaymentStatus).includes(paymentStatus)) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid payment status'
        });
      }

      const order = await OrderService.updatePaymentStatus(id, { paymentStatus });

      if (!order) {
        return res.status(404).json({
          status: 'error',
          message: 'Order not found'
        });
      }

      return res.status(200).json({
        status: 'success',
        data: order
      });
    } catch (error) {
      console.error('Error updating payment status:', error);
      return res.status(500).json({
        status: 'error',
        message: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }

  static async deleteOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const order = await OrderService.deleteOrder(id);

      res.json({ 
        message: 'Order deleted successfully',
        order 
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateOrder(req: Request, res: Response, _next: NextFunction) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      // Validate the order exists
      const existingOrder = await prisma.order.findUnique({
        where: { id }
      });

      if (!existingOrder) {
        return res.status(404).json({
          status: 'error',
          message: 'Order not found'
        });
      }

      // Update order information
      const updatedOrder = await prisma.order.update({
        where: { id },
        data: {
          address: updateData.address,
          phoneNumber: updateData.phoneNumber,
          note: updateData.note,
          total: updateData.total,
          items: {
            deleteMany: {},
            create: updateData.items.map((item: any) => ({
              productId: item.productId || null,
              comboId: item.comboId || null,
              quantity: item.quantity,
              price: item.price
            }))
          }
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

      return res.status(200).json({
        status: 'success',
        data: updatedOrder
      });
    } catch (error) {
      console.error('Error updating order:', error);
      return res.status(500).json({
        status: 'error',
        message: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }

  static async vnpayReturn(req: Request, res: Response) {
    try {
      // Ép kiểu req.query về object thuần
      const queryObj = Object.fromEntries(Object.entries(req.query).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]));
      // Xác thực checksum
      const isValid = vnpay.verifyReturnUrl(queryObj as any);
      if (!isValid) {
        return res.status(400).json({ status: 'error', message: 'Invalid checksum' });
      }
      // Lấy orderId từ vnp_TxnRef
      const orderId = queryObj.vnp_TxnRef as string;
      if (!orderId) {
        return res.status(400).json({ status: 'error', message: 'Missing orderId in VNPAY return' });
      }
      // Luôn trả về order (kể cả khi vnp_ResponseCode khác '00')
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          items: { include: { product: true, combo: true } },
          user: true
        }
      });
      if (!order) {
        return res.status(404).json({ status: 'error', message: 'Order not found' });
      }
      // Nếu thanh toán thành công, cập nhật trạng thái
      const vnp_ResponseCode = queryObj.vnp_ResponseCode;
      if (vnp_ResponseCode === '00') {
        await prisma.order.update({
          where: { id: orderId },
          data: { paymentStatus: 'PAID', status: 'CONFIRMED' }
        });
      }
      return res.json({ order });
    } catch (error) {
      return res.status(500).json({ status: 'error', message: error.message });
    }
  }
} 