import express, { Request, Response, NextFunction } from 'express';
import { ProductController } from '../controllers/product.controller';
import { isAuthenticated } from '../middleware/auth.middleware';
import { isAdmin } from '../middleware/admin.middleware';
import upload from '../config/multer.config';

const router = express.Router();

// Public routes
router.get('/', ProductController.getAllProducts);
router.get('/search', ProductController.getAllProducts);
router.get('/random', ProductController.getRandomProducts);
router.get('/:id', ProductController.getProductById);

// Debug middleware cho việc upload
const debugUpload = (req: Request, _res: Response, next: NextFunction) => {
  console.log('Upload request received:');
  console.log('Files:', req.files);
  console.log('File:', req.file);
  console.log('Body:', req.body);
  next();
};

// Protected routes (Admin only)
router.post('/', 
  isAuthenticated, 
  isAdmin,
  debugUpload,
  upload.single('image'), 
  ProductController.createProduct
);

router.put('/:id', 
  isAuthenticated, 
  isAdmin,
  debugUpload,
  upload.single('image'), 
  ProductController.updateProduct
);

router.delete('/:id', 
  isAuthenticated, 
  isAdmin, 
  ProductController.deleteProduct
);

router.post('/delete', 
  isAuthenticated, 
  isAdmin, 
  ProductController.deleteMany
);

export default router; 