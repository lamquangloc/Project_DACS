import express from 'express';
import {
  saveCart,
  getCart,
  clearCart,
  addItem,
  removeItem,
  updateItemQuantity,
} from '../controllers/cart.controller';
import { isAuthenticated } from '../middleware/auth.middleware';

const router = express.Router();

/**
 * POST /api/cart/save
 * Lưu cart (từ frontend hoặc AI)
 */
router.post('/save', isAuthenticated, saveCart);

/**
 * GET /api/cart
 * Lấy cart của user
 */
router.get('/', isAuthenticated, getCart);

/**
 * DELETE /api/cart
 * Xóa toàn bộ cart
 */
router.delete('/', isAuthenticated, clearCart);

/**
 * POST /api/cart/add
 * Thêm item vào cart
 */
router.post('/add', isAuthenticated, addItem);

/**
 * DELETE /api/cart/item/:productId
 * Xóa item khỏi cart
 */
router.delete('/item/:productId', isAuthenticated, removeItem);

/**
 * PUT /api/cart/item/:productId
 * Cập nhật quantity của item
 */
router.put('/item/:productId', isAuthenticated, updateItemQuantity);

export default router;

