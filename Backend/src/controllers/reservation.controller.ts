import { Request, Response, NextFunction } from 'express';
import { ReservationService } from '../services/reservation.service';
import { AppError } from '../middleware/error.middleware';

export class ReservationController {
  static async createReservation(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({ status: 'error', message: 'Unauthorized' });
      }
      const { tableId, date, time, guests, name, phone, email, note } = req.body;

      if (!tableId || !date || !time || !guests || !name || !phone || !email) {
        throw new AppError('Missing required fields', 400);
      }

      // Validate date
      const reservationDate = new Date(date);
      const currentDate = new Date();
      currentDate.setHours(0, 0, 0, 0);

      if (reservationDate < currentDate) {
        throw new AppError('Reservation date must be in the future', 400);
      }

      // Validate guests
      const guestsNum = parseInt(guests);
      if (isNaN(guestsNum) || guestsNum <= 0) {
        throw new AppError('Number of guests must be a positive number', 400);
      }

      // Validate time slot
      const validTimeSlots = ['08:00', '10:00', '14:00', '16:00', '18:00', '20:00'];
      if (!validTimeSlots.includes(time)) {
        throw new AppError('Invalid time slot. Available time slots: ' + validTimeSlots.join(', '), 400);
      }

      const reservation = await ReservationService.createReservation({
        userId: req.user.id,
        tableId,
        date: reservationDate,
        timeSlot: time,
        guests: guestsNum,
        name,
        phone,
        email,
        note
      });

      res.status(201).json(reservation);
    } catch (error) {
      next(error);
    }
    return;
  }

  static async getMyReservations(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({ status: 'error', message: 'Unauthorized' });
      }
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const result = await ReservationService.getReservationsByUser(req.user.id, page, limit);
      res.json(result);
    } catch (error) {
      next(error);
    }
    return;
  }

  static async getAllReservations(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const includeDeleted = req.query.includeDeleted === 'true';

      const result = await ReservationService.getAllReservations(page, limit, includeDeleted);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  static async getReservationById(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({ status: 'error', message: 'Unauthorized' });
      }
      const { id } = req.params;
      const reservation = await ReservationService.getReservationById(id);

      if (!reservation) {
        throw new AppError('Reservation not found', 404);
      }

      // Kiểm tra quyền xem reservation
      if (reservation.userId !== req.user.id && req.user.role !== 'ADMIN') {
        throw new AppError('You do not have permission to view this reservation', 403);
      }

      res.json(reservation);
    } catch (error) {
      next(error);
    }
    return;
  }

  static async updateReservationStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!status) {
        throw new AppError('Status is required', 400);
      }

      if (!['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED'].includes(status)) {
        throw new AppError('Invalid status value', 400);
      }

      const reservation = await ReservationService.updateReservationStatus(id, status);

      if (!reservation) {
        throw new AppError('Reservation not found', 404);
      }

      res.json(reservation);
    } catch (error) {
      next(error);
    }
  }

  static async updateReservation(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({ status: 'error', message: 'Unauthorized' });
      }
      const { id } = req.params;
      const { tableId, date, time, guests, name, phone, email, note } = req.body;

      const updateData: any = {};

      if (tableId) updateData.tableId = tableId;
      
      if (date) {
        const reservationDate = new Date(date);
        const currentDate = new Date();
        currentDate.setHours(0, 0, 0, 0);

        if (reservationDate < currentDate) {
          throw new AppError('Reservation date must be in the future', 400);
        }
        updateData.date = reservationDate;
      }

      if (time) {
        const validTimeSlots = ['08:00', '10:00', '14:00', '16:00', '18:00', '20:00'];
        if (!validTimeSlots.includes(time)) {
          throw new AppError('Invalid time slot. Available time slots: ' + validTimeSlots.join(', '), 400);
        }
        updateData.timeSlot = time;
      }

      if (guests) {
        const guestsNum = parseInt(guests);
        if (isNaN(guestsNum) || guestsNum <= 0) {
          throw new AppError('Number of guests must be a positive number', 400);
        }
        updateData.guests = guestsNum;
      }

      if (name) updateData.name = name;
      if (phone) updateData.phone = phone;
      if (email) updateData.email = email;
      if (note !== undefined) updateData.note = note;

      // Lấy reservation hiện tại để kiểm tra quyền
      const currentReservation = await ReservationService.getReservationById(id);
      
      if (!currentReservation) {
        throw new AppError('Reservation not found', 404);
      }

      // Chỉ cho phép chủ sở hữu hoặc admin cập nhật
      if (currentReservation.userId !== req.user.id && req.user.role !== 'ADMIN') {
        throw new AppError('You do not have permission to update this reservation', 403);
      }

      const reservation = await ReservationService.updateReservation(id, updateData);
      res.json(reservation);
    } catch (error) {
      next(error);
    }
    return;
  }

  static async deleteReservation(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({ status: 'error', message: 'Unauthorized' });
      }
      const { id } = req.params;
      
      // Lấy reservation hiện tại để kiểm tra quyền
      const currentReservation = await ReservationService.getReservationById(id);
      
      if (!currentReservation) {
        throw new AppError('Reservation not found', 404);
      }

      // Chỉ cho phép chủ sở hữu hoặc admin xóa
      if (currentReservation.userId !== req.user.id && req.user.role !== 'ADMIN') {
        throw new AppError('You do not have permission to delete this reservation', 403);
      }

      const reservation = await ReservationService.deleteReservation(id);
      
      res.json({
        message: 'Reservation cancelled successfully',
        reservation
      });
    } catch (error) {
      next(error);
    }
    return;
  }
} 