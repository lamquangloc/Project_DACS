import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from '../utils/appError';
import { UserService } from '../services/user.service';

export const isAuthenticated = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      throw new AppError('No token provided', 401);
    }

    // Extract token from "Bearer <token>" format
    const token = authHeader.split(' ')[1];
    if (!token) {
      console.error('❌ Token extraction failed. Authorization header:', authHeader?.substring(0, 20) + '...');
      throw new AppError('Invalid authorization header format. Expected: Bearer <token>', 401);
    }

    // Log token info for debugging (without exposing full token)
    console.log('🔐 Token info:', {
      hasToken: !!token,
      tokenLength: token.length,
      tokenPrefix: token.substring(0, 10) + '...',
      authHeaderFormat: authHeader.startsWith('Bearer ') ? 'correct' : 'incorrect'
    });

    // Validate token format (JWT should have 3 parts separated by dots)
    const tokenParts = token.split('.');
    if (tokenParts.length !== 3) {
      console.error('❌ Invalid token format. Expected JWT format (3 parts separated by dots). Token parts:', tokenParts.length);
      throw new AppError('Invalid token format', 401);
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { id?: string; userId?: string; email?: string };
    let user = null;
    const userId = decoded.id || decoded.userId;
    if (userId && typeof userId === 'string') {
      user = await UserService.getUserById(userId);
    } else if (decoded.email) {
      user = await UserService.getUserByEmail(decoded.email);
    } else {
      throw new AppError('Invalid token payload: missing user identifier', 401);
    }

    if (!user) {
      throw new AppError('User not found', 404);
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

export const isAdmin = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401);
    }

    if (req.user.role !== 'ADMIN') {
      throw new AppError('Access denied. Admin only.', 403);
    }

    next();
  } catch (error) {
    next(error);
  }
};

export const isAdminOrStaff = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401);
    }

    if (req.user.role !== 'ADMIN' && req.user.role !== 'STAFF') {
      throw new AppError('Access denied. Admin or Staff only.', 403);
    }

    next();
  } catch (error) {
    next(error);
  }
}; 