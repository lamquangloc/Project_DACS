import { PrismaClient,  Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { SequenceService } from './sequence.service';
import { AppError } from '../middleware/error.middleware';

const prisma = new PrismaClient();

const DEFAULT_AVATAR = '/uploads/avatars/default-avatar.png';

export interface CreateUserDto {
  name: string;
  email: string;
  password: string;
  role?: Role;
  phoneNumber?: string;
  address?: string;
}

export interface UpdateUserDto {
  name?: string;
  email?: string;
  phoneNumber?: string;
  address?: string;
  avatar?: string;
  role?: Role;
  password?: string;
}

export interface UpdatePasswordDto {
  currentPassword: string;
  newPassword: string;
}

export class UserService {
  static async register(data: {
    name: string;
    email: string;
    password: string;
    phoneNumber?: string;
    address?: string;
  }) {
    try {
      // Check if user exists
      const existingUser = await prisma.user.findUnique({
        where: { email: data.email }
      });

      if (existingUser) {
        throw new Error('User already exists');
      }

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(data.password, salt);

      // Get next order number
      const orderNumber = await SequenceService.getNextSequenceValue('user');

      // Create user with default avatar
      const user = await prisma.user.create({
        data: {
          orderNumber,
          name: data.name,
          email: data.email,
          password: hashedPassword,
          phoneNumber: data.phoneNumber,
          address: data.address,
          avatar: DEFAULT_AVATAR
        }
      });

      // Generate token
      const secret = Buffer.from(process.env.JWT_SECRET ?? 'secret', 'utf-8');
      const token = jwt.sign(
        { id: user.id },
        secret,
        { expiresIn: '1d' }
      );

      return {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          phoneNumber: user.phoneNumber,
          address: user.address,
          avatar: user.avatar
        },
        token
      };
    } catch (error) {
      throw error;
    }
  }

  static async login(email: string, password: string): Promise<{ user: any; token: string }> {
    try {
      // Tìm user theo email
      const user = await prisma.user.findUnique({
        where: {
          email,
        },
        select: {
          id: true,
          name: true,
          email: true,
          password: true,
          role: true,
          avatar: true,
          phoneNumber: true,
          address: true,
          isDeleted: true,
        },
      });

      // Kiểm tra nếu user không tồn tại
      if (!user) {
        throw new AppError('Invalid credentials', 401);
      }

      // Kiểm tra nếu user đã bị xóa
      if (user.isDeleted) {
        throw new AppError('User account has been deleted', 401);
      }

      // Kiểm tra password
      const isPasswordValid = await bcrypt.compare(password, user.password as string);
      if (!isPasswordValid) {
        throw new AppError('Invalid credentials', 401);
      }

      // Tạo JWT token
      // @ts-expect-error: Type mismatch due to jsonwebtoken v9 type definitions
      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET ?? 'secret',
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      );

      // Loại bỏ password và isDeleted trước khi trả về
      const { password: _, isDeleted: __, ...userWithoutPassword } = user;

      // Log thông tin để debug
      console.log('Login successful:', { 
        id: user.id, 
        email: user.email, 
        role: user.role 
      });

      return {
        user: userWithoutPassword,
        token,
      };
    } catch (error) {
      console.error('Login error:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(`Error in login: ${error.message}`, 500);
    }
  }

  static async getCurrentUser(userId: string) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        throw new Error('User not found');
      }

      return user;
    } catch (error) {
      throw error;
    }
  }

  static async getAllUsers(page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;
    
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where: {
          isDeleted: false
        },
        orderBy: {
          orderNumber: 'desc'
        },
        skip,
        take: limit,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          phoneNumber: true,
          address: true,
          avatar: true,
          createdAt: true,
          updatedAt: true
        }
      }),
      prisma.user.count({
        where: {
          isDeleted: false
        }
      })
    ]);

    return {
      users,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  static async getUserById(id: string) {
    return prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phoneNumber: true,
        address: true,
        avatar: true,
        orderNumber: true,
        createdAt: true,
        updatedAt: true,
        password: true,
        isDeleted: true,
        isGoogleAccount: true,
        resetToken: true,
        resetTokenExpires: true
      }
    });
  }

  static async updateUser(id: string, data: UpdateUserDto) {
    try {
      // Prepare update data
      const updateData: any = {};
      
      if (data.name) updateData.name = data.name;
      if (data.email) updateData.email = data.email;
      if (data.phoneNumber) updateData.phoneNumber = data.phoneNumber;
      if (data.address) updateData.address = data.address;
      if (data.avatar) updateData.avatar = data.avatar;
      if (data.role) updateData.role = data.role;
      
      // If password is provided, hash it
      if (data.password) {
        const salt = await bcrypt.genSalt(10);
        updateData.password = await bcrypt.hash(data.password, salt);
      }

      // Update user
      const updatedUser = await prisma.user.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          phoneNumber: true,
          address: true,
          avatar: true,
          createdAt: true,
          updatedAt: true
        }
      });

      console.log('Updated user:', updatedUser);
      return updatedUser;
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  static async deleteUser(id: string) {
    return prisma.user.update({
      where: { id },
      data: {
        isDeleted: true
      }
    });
  }

  static async findByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        password: true,
        role: true,
        phoneNumber: true,
        address: true,
        avatar: true
      }
    });
  }

  static async verifyPassword(password: string, hashedPassword: string) {
    return bcrypt.compare(password, hashedPassword);
  }

  static async updatePassword(userId: string, data: { currentPassword: string, newPassword: string }) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError('User not found', 404);
    if (!user.password) throw new AppError('User has no password set', 400);
    const isMatch = await bcrypt.compare(data.currentPassword, user.password);
    if (!isMatch) throw new AppError('Mật khẩu hiện tại không đúng', 400);
    const hashed = await bcrypt.hash(data.newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashed }
    });
    return { status: 'success' };
  }

  static async getUserByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phoneNumber: true,
        address: true,
        avatar: true,
        orderNumber: true,
        createdAt: true,
        updatedAt: true,
        password: true,
        isDeleted: true,
        isGoogleAccount: true,
        resetToken: true,
        resetTokenExpires: true
      }
    });
  }

  static async saveResetToken(userId: string, token: string, expires: number) {
    return prisma.user.update({
      where: { id: userId },
      data: { resetToken: token, resetTokenExpires: new Date(expires) }
    });
  }

  static async getUserByResetToken(token: string) {
    return prisma.user.findFirst({ where: { resetToken: token } });
  }

  static async updatePasswordById(userId: string, password: string) {
    const hashed = await bcrypt.hash(password, 10);
    return prisma.user.update({
      where: { id: userId },
      data: { password: hashed }
    });
  }

  static async clearResetToken(userId: string) {
    return prisma.user.update({
      where: { id: userId },
      data: { resetToken: null, resetTokenExpires: null }
    });
  }
} 