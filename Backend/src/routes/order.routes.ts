import { Router } from 'express';
import { OrderController } from '../controllers/order.controller';
import { isAuthenticated } from '../middleware/auth.middleware';
import { isAdmin } from '../middleware/admin.middleware';

const router = Router();

router.get('/vnpay-return', OrderController.vnpayReturn);

// Protected routes (User)
router.post('/', isAuthenticated, OrderController.createOrder);
router.get('/me', isAuthenticated, OrderController.getMyOrders);
router.get('/me/:id', isAuthenticated, OrderController.getMyOrderById);

// Protected routes (Admin)
router.get('/', isAuthenticated, isAdmin, OrderController.getAllOrders);
router.get('/:id', isAuthenticated, isAdmin, OrderController.getOrderById);
router.put('/:id/update', isAuthenticated, isAdmin, OrderController.updateOrder);
router.put('/:id/status', isAuthenticated, OrderController.updateOrderStatus);
router.put('/:id/payment-status', isAuthenticated, isAdmin, OrderController.updatePaymentStatus);
router.delete('/:id', isAuthenticated, isAdmin, OrderController.deleteOrder);

export default router; 