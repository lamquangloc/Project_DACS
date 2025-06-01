import { Router } from 'express';
import { CategoryController } from '../controllers/category.controller';
import { isAuthenticated } from '../middleware/auth.middleware';
import { isAdmin } from '../middleware/admin.middleware';
import upload from '../config/multer.config';

const router = Router();

// Public routes
router.get('/', CategoryController.getAll);
router.get('/:id', CategoryController.getById);

// Admin routes
router.post('/', 
  isAuthenticated, 
  isAdmin, 
  upload.single('image'),
  CategoryController.create
);

router.put('/:id', 
  isAuthenticated, 
  isAdmin, 
  upload.single('image'),
  CategoryController.update
);

router.delete('/:id', 
  isAuthenticated, 
  isAdmin, 
  CategoryController.delete
);

router.post('/delete', 
  isAuthenticated, 
  isAdmin, 
  CategoryController.deleteMany
);

export default router; 