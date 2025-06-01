import { Router } from 'express';
import { OrderService } from '../services/order.service';
import { isAuthenticated } from '../middleware/auth.middleware';
import { Role } from '@prisma/client';
import { Request, Response, NextFunction } from 'express';

const router = Router();

// Middleware to authorize roles
const authorize = (roles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    if (!roles.includes(req.user.role as Role)) {
      return res.status(403).json({
        status: 'error',
        message: 'Forbidden'
      });
    }

    next();
    return;
  };
};

router.get('/stats', isAuthenticated, authorize([Role.ADMIN]), async (req, res, _next) => {
  console.log('Dashboard /stats route called');
  try {
    const timeRange = req.query.timeRange as 'today' | 'week' | 'month' | 'year' | 'all' || 'today';
    const stats = await OrderService.getDashboardStats(timeRange);
    res.json({
      status: 'success',
      data: stats
    });
  } catch (error) {
    console.error('Dashboard /stats error:', error);
    res.status(500).json({ status: 'error', message: error.message || 'Internal server error' });
  }
});

export default router; 