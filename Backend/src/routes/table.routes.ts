import { Router } from 'express';
import { TableController } from '../controllers/table.controller';
import { isAuthenticated } from '../middleware/auth.middleware';
import { isAdmin } from '../middleware/admin.middleware';

const router = Router();

// Route lấy tất cả bàn (public - không cần đăng nhập)
router.get('/', TableController.getAllTables);

// Route lấy bàn có sẵn
router.get('/available', TableController.getAvailableTables);

// Route lấy chi tiết bàn theo ID (public - không cần đăng nhập)
router.get('/:id', TableController.getTableById);

// Routes yêu cầu quyền admin
router.post('/', isAuthenticated, isAdmin, TableController.createTable);
router.put('/:id', isAuthenticated, isAdmin, TableController.updateTable);
router.delete('/:id', isAuthenticated, isAdmin, TableController.deleteTable);

export default router; 