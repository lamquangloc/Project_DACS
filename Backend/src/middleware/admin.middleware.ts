import { Request, Response, NextFunction } from 'express';
import { AppError } from './error.middleware';

export const isAdmin = async (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user || req.user.role !== 'ADMIN') {
      throw new AppError('Access denied. Admin privileges required.', 403);
    }
    next();
  } catch (error) {
    next(error);
  }
}; 