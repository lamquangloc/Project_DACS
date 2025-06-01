import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { isAuthenticated } from '../middleware/auth.middleware';
import { isAdmin } from '../middleware/admin.middleware';
import upload from '../config/multer.config';

const router = Router();

// Public routes
router.post('/register', UserController.register);
router.post('/login', UserController.login);

// Protected routes
router.get('/profile', isAuthenticated, UserController.getProfile);
router.put('/profile', 
  isAuthenticated, 
  upload.single('avatar'),
  UserController.updateProfile
);
router.put(
  '/profile/password',
  isAuthenticated,
  UserController.updatePassword
);

// Admin routes
router.get('/', isAuthenticated, isAdmin, UserController.getAllUsers);
router.post('/', isAuthenticated, isAdmin, upload.single('avatar'), UserController.createUser);
router.get('/:id', isAuthenticated, isAdmin, UserController.getUserById);
router.put('/:id', isAuthenticated, isAdmin, upload.single('avatar'), UserController.updateUser);
router.delete('/:id', isAuthenticated, isAdmin, UserController.deleteUser);

export default router; 