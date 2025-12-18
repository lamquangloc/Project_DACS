import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { PaymentStatus } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Payment Controller
 * Xử lý các callback từ cổng thanh toán
 */
export class PaymentController {
  /**
   * VietQR Callback
   * POST /api/payments/vietqr/callback
   * Nhận callback từ VietQR khi thanh toán thành công
   */
  static async vietqrCallback(req: Request, res: Response, _next: NextFunction) {
    try {
      const callbackData = req.body;

      console.log('📥 VietQR Callback received:', callbackData);

      // ⚠️ LƯU Ý: Format URL đơn giản của VietQR.io không có callback tự động
      // Nếu cần callback, phải sử dụng VietQR API chính thức (cần đăng ký)
      // Hiện tại, callback này chỉ để xử lý nếu có webhook từ ngân hàng
      
      // Extract data từ callback (format có thể khác nhau tùy ngân hàng)
      let orderId = callbackData.orderId || callbackData.order_id;
      const orderCode = callbackData.orderCode || callbackData.order_code;
      const amount = callbackData.amount || callbackData.total;
      const transactionId = callbackData.transactionId || callbackData.transaction_id || callbackData.id;
      
      // Nếu không có orderId, thử tìm bằng orderCode
      if (!orderId && orderCode) {
        const orderByCode = await prisma.order.findUnique({
          where: { orderCode: orderCode }
        });
        if (orderByCode) {
          orderId = orderByCode.id; // Sử dụng orderId từ database
        }
      }

      if (!orderId) {
        return res.status(400).json({
          success: false,
          message: 'Missing orderId or orderCode in callback'
        });
      }

      // Find order
      const order = await prisma.order.findUnique({
        where: { id: orderId }
      });

      if (!order) {
        console.error('❌ Order not found:', orderId);
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

      // Verify amount
      if (order.total !== amount) {
        console.error('❌ Amount mismatch:', {
          orderTotal: order.total,
          paymentAmount: amount
        });
        return res.status(400).json({
          success: false,
          message: 'Amount mismatch'
        });
      }

      // Update payment status
      const updatedOrder = await prisma.order.update({
        where: { id: orderId },
        data: {
          paymentStatus: PaymentStatus.PAID,
          // ✅ Giữ nguyên note, không thêm thông tin transaction
          note: order.note,
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

      console.log('✅ Payment status updated:', {
        orderId: updatedOrder.id,
        orderCode: updatedOrder.orderCode,
        paymentStatus: updatedOrder.paymentStatus,
        transactionId
      });

      // Return success response
      return res.status(200).json({
        success: true,
        message: 'Payment confirmed',
        data: {
          orderId: updatedOrder.id,
          orderCode: updatedOrder.orderCode,
          paymentStatus: updatedOrder.paymentStatus,
          transactionId
        }
      });
    } catch (error) {
      console.error('Error processing VietQR callback:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * Check payment status
   * GET /api/payments/status/:orderId
   * Hoặc GET /api/payments/status/by-code/:orderCode
   */
  static async checkPaymentStatus(req: Request, res: Response, _next: NextFunction) {
    try {
      const { orderId, orderCode } = req.params;

      // Tìm order theo orderId hoặc orderCode
      const where = orderId 
        ? { id: orderId }
        : orderCode 
        ? { orderCode: orderCode }
        : null;

      if (!where) {
        return res.status(400).json({
          success: false,
          message: 'Missing orderId or orderCode'
        });
      }

      const order = await prisma.order.findUnique({
        where,
        select: {
          id: true,
          orderCode: true,
          paymentStatus: true,
          total: true,
          createdAt: true,
        }
      });

      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

      return res.status(200).json({
        success: true,
        data: {
          orderId: order.id,
          orderCode: order.orderCode,
          paymentStatus: order.paymentStatus,
          total: order.total,
          createdAt: order.createdAt,
        }
      });
    } catch (error) {
      console.error('Error checking payment status:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * Confirm payment manually
   * POST /api/payments/confirm/:orderId
   * User xác nhận đã thanh toán thành công (sau khi quét QR code)
   */
  static async confirmPayment(req: Request, res: Response, _next: NextFunction) {
    try {
      const { orderId } = req.params;
      const userId = (req as any).user?.id || (req as any).user?.userId; // Lấy từ auth middleware

      if (!orderId) {
        return res.status(400).json({
          success: false,
          message: 'Missing orderId'
        });
      }

      // Tìm order
      const order = await prisma.order.findUnique({
        where: { id: orderId }
      });

      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

      // Kiểm tra quyền: chỉ user sở hữu đơn hàng mới được xác nhận
      if (userId && order.userId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to confirm this order'
        });
      }

      // Kiểm tra trạng thái hiện tại
      if (order.paymentStatus === PaymentStatus.PAID) {
        return res.status(200).json({
          success: true,
          message: 'Order already paid',
          data: {
            orderId: order.id,
            orderCode: order.orderCode,
            paymentStatus: order.paymentStatus,
          }
        });
      }

      // Cập nhật trạng thái thanh toán
      const updatedOrder = await prisma.order.update({
        where: { id: orderId },
        data: {
          paymentStatus: PaymentStatus.PAID,
            // ✅ Giữ nguyên note, không thêm thông báo payment confirmation
            note: order.note,
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

      console.log('✅ Payment confirmed manually:', {
        orderId: updatedOrder.id,
        orderCode: updatedOrder.orderCode,
        paymentStatus: updatedOrder.paymentStatus,
        userId
      });

      return res.status(200).json({
        success: true,
        message: 'Payment confirmed successfully',
        data: {
          orderId: updatedOrder.id,
          orderCode: updatedOrder.orderCode,
          paymentStatus: updatedOrder.paymentStatus,
        }
      });
    } catch (error) {
      console.error('Error confirming payment:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }
}

