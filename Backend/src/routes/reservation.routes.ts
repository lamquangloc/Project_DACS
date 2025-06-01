import { Router } from 'express';
import { ReservationController } from '../controllers/reservation.controller';
import { isAuthenticated } from '../middleware/auth.middleware';
import { isAdmin } from '../middleware/admin.middleware';

const router = Router();

// Route cho người dùng đăng nhập
router.post('/', isAuthenticated, ReservationController.createReservation);
router.get('/me', isAuthenticated, ReservationController.getMyReservations);
router.get('/me/:id', isAuthenticated, ReservationController.getReservationById);
router.put('/me/:id', isAuthenticated, ReservationController.updateReservation);
router.delete('/me/:id', isAuthenticated, ReservationController.deleteReservation);

// Route cho admin
router.get('/', isAuthenticated, isAdmin, ReservationController.getAllReservations);
router.get('/:id', isAuthenticated, isAdmin, ReservationController.getReservationById);
router.put('/:id', isAuthenticated, isAdmin, ReservationController.updateReservation);
router.put('/:id/status', isAuthenticated, isAdmin, ReservationController.updateReservationStatus);
router.delete('/:id', isAuthenticated, isAdmin, ReservationController.deleteReservation);

export default router; 