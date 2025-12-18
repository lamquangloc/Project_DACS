import { Router } from 'express';
import { OrderController } from '../controllers/order.controller';
import { isAuthenticated } from '../middleware/auth.middleware';
import { isAdmin } from '../middleware/admin.middleware';
import { chatBotAuth } from '../middleware/chatbot.middleware';

const router = Router();

router.get('/vnpay-return', OrderController.vnpayReturn);

// Chatbot route (không cần user auth, dùng secret key)
router.post('/chatbot', chatBotAuth, OrderController.createOrderFromChatbot);

// Protected routes (User)
router.post('/', isAuthenticated, OrderController.createOrder);
router.get('/me', isAuthenticated, OrderController.getMyOrders);
router.get('/me/:id', isAuthenticated, OrderController.getMyOrderById);
router.get('/:id/qr-code', isAuthenticated, OrderController.getOrderQRCode);
// Tìm đơn hàng theo mã đơn (full hoặc 4 số cuối) - User có thể tra cứu đơn của mình
router.get('/search/:orderCodeOrSuffix', isAuthenticated, OrderController.getOrderByCode);
router.get('/by-code/:orderCodeOrSuffix', isAuthenticated, OrderController.getOrderByCode);

// Protected routes (Admin)
router.get('/', isAuthenticated, isAdmin, OrderController.getAllOrders);
router.get('/:id', isAuthenticated, isAdmin, OrderController.getOrderById);
router.put('/:id/update', isAuthenticated, isAdmin, OrderController.updateOrder);
router.put('/:id/status', isAuthenticated, OrderController.updateOrderStatus);
router.put('/:id/payment-status', isAuthenticated, isAdmin, OrderController.updatePaymentStatus);
router.delete('/:id', isAuthenticated, isAdmin, OrderController.deleteOrder);

export default router; 