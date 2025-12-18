import { Router } from 'express';
import { PaymentController } from '../controllers/payment.controller';
import { isAuthenticated } from '../middleware/auth.middleware';

const router = Router();

// VietQR callback (public endpoint - được gọi từ VietQR service)
router.post('/vietqr/callback', PaymentController.vietqrCallback);

// Check payment status (protected - user phải đăng nhập)
router.get('/status/:orderId', isAuthenticated, PaymentController.checkPaymentStatus);

// Check payment status by order code (protected - user phải đăng nhập)
router.get('/status/by-code/:orderCode', isAuthenticated, PaymentController.checkPaymentStatus);

// Confirm payment manually (protected - user phải đăng nhập)
router.post('/confirm/:orderId', isAuthenticated, PaymentController.confirmPayment);

export default router;

