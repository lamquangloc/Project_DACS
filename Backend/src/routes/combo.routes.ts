import { Router, Request, Response, NextFunction } from 'express';
import { ComboController } from '../controllers/combo.controller';
import { isAuthenticated } from '../middleware/auth.middleware';
import { isAdmin } from '../middleware/admin.middleware';
import upload from '../config/multer.config';

const router = Router();

// Debug middleware
const debugMiddleware = (req: Request, _res: Response, next: NextFunction) => {
  console.log('Debug middleware:');
  console.log('Request body:', req.body);
  console.log('Request file:', req.file);
  console.log('Request headers:', req.headers);
  next();
};

// Error handling middleware
const errorHandler = (err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Error in combo routes:', err);
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      status: 'error',
      message: 'File size too large'
    });
  }
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
      status: 'error',
      message: 'Unexpected field'
    });
  }
  res.status(500).json({ status: 'error', message: err.message || 'Internal server error' });
  return;
};

// Public routes
router.get('/', ComboController.getAllCombos);
router.get('/:id', ComboController.getComboById);

// Admin routes
router.post('/', 
  isAuthenticated, 
  isAdmin,
  upload.single('image'),
  debugMiddleware,
  ComboController.createCombo
);

router.put('/:id', 
  isAuthenticated, 
  isAdmin,
  upload.single('image'),
  debugMiddleware,
  ComboController.updateCombo
);

router.delete('/:id', isAuthenticated, isAdmin, ComboController.deleteCombo);
router.delete('/delete-many', isAuthenticated, isAdmin, ComboController.deleteManyCombos);

// Apply error handling
router.use(errorHandler);

export default router; 