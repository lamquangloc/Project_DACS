import { Request, Response, NextFunction } from 'express';
import { UserService } from '../services/user.service';
import { AppError } from '../middleware/error.middleware';
import { sendResetPasswordEmail } from '../utils/sendResetPasswordEmail';
import crypto from 'crypto';

export class UserController {
  static async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, email, password, phoneNumber, address } = req.body;

      if (!name || !email || !password) {
        throw new AppError('Name, email and password are required', 400);
      }

      const result = await UserService.register({
        name,
        email,
        password,
        phoneNumber,
        address
      });

      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        throw new AppError('Email and password are required', 400);
      }

      const result = await UserService.login(email, password);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  static async getCurrentUser(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({ status: 'error', message: 'Unauthorized' });
      }
      const user = await UserService.getCurrentUser(req.user.id);
      res.json(user);
    } catch (error) {
      next(error);
    }
    return;
  }

  static async updateUser(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { name, email, phoneNumber, address, role, password } = req.body;
      let avatar = undefined;
      if (req.file) {
        const filename = req.file.filename || req.file.path.split(/[\\/]/).pop();
        avatar = `/uploads/avatars/${filename}`;
      }

      // Validate phone number if provided
      if (phoneNumber && !/^[0-9]{10}$/.test(phoneNumber)) {
        throw new AppError('Số điện thoại phải có 10 chữ số', 400);
      }

      // Prepare update data
      const updateData: any = {};

      // Check user permissions
      const isAdmin = req.user?.role === 'ADMIN';
      const isSameUser = req.user?.id === id;
      const isStaff = req.user?.role === 'STAFF';

      // Only admin can change role
      if (role) {
        if (!isAdmin) {
          throw new AppError('Only admin can change user roles', 403);
        }
        updateData.role = role;
      }

      // Basic info can be updated by admin, the user themselves, or staff
      if (isAdmin || isSameUser || isStaff) {
        if (name) updateData.name = name.trim();
        if (email) updateData.email = email.trim();
        if (phoneNumber) updateData.phoneNumber = phoneNumber.trim();
        if (address) updateData.address = address.trim();
        if (avatar) updateData.avatar = avatar;
      } else {
        throw new AppError('Unauthorized to update user information', 403);
      }

      // Password can only be changed by admin or the user themselves
      if (password) {
        if (!isAdmin && !isSameUser) {
          throw new AppError('Unauthorized to change password', 403);
        }
        updateData.password = password;
      }

      console.log('Updating user with data:', {
        ...updateData,
        id,
        isAdmin,
        isSameUser,
        isStaff
      });

      const user = await UserService.updateUser(id, updateData);
      
      console.log('Update successful:', user);
      res.json({
        status: 'success',
        data: user
      });
    } catch (error) {
      console.error('Update user error:', error);
      next(error);
    }
  }

  static async updatePassword(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({ status: 'error', message: 'Unauthorized' });
      }
      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword) {
        throw new AppError('Current password and new password are required', 400);
      }
      const result = await UserService.updatePassword(req.user.id, {
        currentPassword,
        newPassword
      });
      res.json(result);
    } catch (error) {
      next(error);
    }
    return;
  }

  static async deleteUser(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      await UserService.deleteUser(id);
      res.json({ message: 'User deleted successfully' });
    } catch (error) {
      next(error);
    }
  }

  static async updateProfile(req: Request, res: Response, _next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          status: 'error',
          message: 'Unauthorized'
        });
      }

      const { name, email, phoneNumber, address } = req.body;

      // Prepare update data
      const updateData: any = {};
      if (name) updateData.name = name;
      if (email) updateData.email = email;
      if (phoneNumber) updateData.phoneNumber = phoneNumber;
      if (address) updateData.address = address;

      // If new avatar was uploaded
      if (req.file) {
        const filename = req.file.filename || req.file.path.split(/[\\/]/).pop();
        updateData.avatar = `/uploads/avatars/${filename}`;
      }

      const user = await UserService.updateUser(userId, updateData);

      res.json({
        status: 'success',
        data: user
      });
    } catch (error) {
      // If there was a file validation error
      if (req.fileValidationError) {
        return res.status(400).json({
          status: 'error',
          message: req.fileValidationError
        });
      }

      // For other errors
      if (error instanceof Error) {
        return res.status(400).json({
          status: 'error',
          message: error.message
        });
      }

      return res.status(500).json({
        status: 'error',
        message: 'Internal server error'
      });
    }
    return;
  }

  static async getProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not found', 404);
      }

      const user = await UserService.getUserById(userId);
      res.json(user);
    } catch (error) {
      next(error);
    }
  }

  static async getAllUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const { page = 1, limit = 10 } = req.query;
      const result = await UserService.getAllUsers(
        Number(page),
        Number(limit)
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  static async getUserById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const user = await UserService.getUserById(id);
      res.json(user);
    } catch (error) {
      next(error);
    }
  }

  static async createUser(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, email, password, phoneNumber, address, role } = req.body;

      // Validate required fields
      if (!name || !email || !password) {
        throw new AppError('Name, email and password are required', 400);
      }

      // Validate phone number if provided
      if (phoneNumber && !/^[0-9]{10}$/.test(phoneNumber)) {
        throw new AppError('Số điện thoại phải có 10 chữ số', 400);
      }

      // Create user data
      const userData = {
        name: name.trim(),
        email: email.trim(),
        password,
        role,
        phoneNumber: phoneNumber?.trim(),
        address: address?.trim()
      };

      console.log('Creating user with data:', { ...userData, password: '***' });

      const user = await UserService.register(userData);
      
      console.log('User created successfully:', user);
      res.status(201).json({
        status: 'success',
        data: user
      });
    } catch (error) {
      console.error('Create user error:', error);
      next(error);
    }
  }

  static async forgotPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { email } = req.body;
      if (!email) {
        throw new AppError('Email is required', 400);
      }
      const user = await UserService.getUserByEmail(email);
      if (!user) {
        return res.json({ success: false, message: 'EMAIL_NOT_FOUND' });
      }
      const token = crypto.randomBytes(32).toString('hex');
      const expires = Date.now() + 10 * 60 * 1000;
      await UserService.saveResetToken(user.id, token, expires);
      const resetLink = `http://localhost:3000/reset-password?token=${token}`;
      await sendResetPasswordEmail(user.email, resetLink);
      return res.json({ success: true, message: 'Đã gửi email', token });
    } catch (error) {
      next(error);
    }
    return;
  }

  static async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { token, password } = req.body;
      if (!token || !password) {
        throw new AppError('Token và mật khẩu mới là bắt buộc', 400);
      }
      const user = await UserService.getUserByResetToken(token);
      if (!user || !user.resetTokenExpires || user.resetTokenExpires.getTime() < Date.now()) {
        return res.status(400).json({ success: false, message: 'Token đã hết hạn hoặc không hợp lệ' });
      }
      await UserService.updatePasswordById(user.id, password);
      await UserService.clearResetToken(user.id);
      return res.json({ success: true, message: 'Đặt lại mật khẩu thành công' });
    } catch (error) {
      next(error);
    }
    return;
  }
} 