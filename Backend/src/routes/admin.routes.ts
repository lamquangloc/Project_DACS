import { Router } from 'express';
import {  isAdminOrStaff } from '../middleware/auth.middleware';
import { 
  getDashboardStats, 
  getDailyRevenue, 
  getMonthlyRevenue, 
  getMenuStats,
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  getOrders,
  updateOrderStatus,
  getReservations,
  updateReservationStatus,
  getCombos,
  createCombo,
  updateCombo,
  deleteCombo
} from '../controllers/admin.controller';

const router = Router();

// Dashboard routes
router.get('/stats/revenue', isAdminOrStaff, getDashboardStats);
router.get('/stats/revenue/daily', isAdminOrStaff, getDailyRevenue);
router.get('/stats/revenue/monthly', isAdminOrStaff, getMonthlyRevenue);
router.get('/stats/menu', isAdminOrStaff, getMenuStats);

// Category routes
router.get('/categories', isAdminOrStaff, getCategories);
router.post('/categories', isAdminOrStaff, createCategory);
router.put('/categories/:id', isAdminOrStaff, updateCategory);
router.delete('/categories/:id', isAdminOrStaff, deleteCategory);

// Product routes
router.get('/products', isAdminOrStaff, getProducts);
router.post('/products', isAdminOrStaff, createProduct);
router.put('/products/:id', isAdminOrStaff, updateProduct);
router.delete('/products/:id', isAdminOrStaff, deleteProduct);

// User routes
router.get('/users', isAdminOrStaff, getUsers);
router.post('/users', isAdminOrStaff, createUser);
router.put('/users/:id', isAdminOrStaff, updateUser);
router.delete('/users/:id', isAdminOrStaff, deleteUser);

// Order routes
router.get('/orders', isAdminOrStaff, getOrders);
router.put('/orders/:id/status', isAdminOrStaff, updateOrderStatus);

// Reservation routes
router.get('/reservations', isAdminOrStaff, getReservations);
router.put('/reservations/:id/status', isAdminOrStaff, updateReservationStatus);

// Combo routes
router.get('/combos', isAdminOrStaff, getCombos);
router.post('/combos', isAdminOrStaff, createCombo);
router.put('/combos/:id', isAdminOrStaff, updateCombo);
router.delete('/combos/:id', isAdminOrStaff, deleteCombo);

export default router;
