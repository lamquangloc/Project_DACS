import { OAuth2Client } from 'google-auth-library';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { SequenceService } from './sequence.service';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

async function downloadImage(url: string, filename: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch image');
  const buffer = await res.buffer();
  const uploadDir = path.join(__dirname, '../../uploads/avatars');
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
  const filePath = path.join(uploadDir, filename);
  fs.writeFileSync(filePath, buffer);
  // Trả về đường dẫn public cho frontend
  return `/uploads/avatars/${filename}`;
}

export class AuthService {
  static async verifyGoogleToken(token: string) {
    try {
      const ticket = await client.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      return ticket.getPayload();
    } catch (error) {
      throw new Error('Invalid Google token');
    }
  }

  static async handleGoogleLogin(token: string) {
    try {
      const payload = await this.verifyGoogleToken(token);
      if (!payload?.email) {
        throw new Error('Invalid Google token payload');
      }

      let user = await prisma.user.findUnique({
        where: { email: payload.email },
        select: {
          id: true,
          orderNumber: true,
          email: true,
          name: true,
          avatar: true,
          role: true,
          isGoogleAccount: true,
        }
      });

      let avatarPath = '';
      if (payload.picture) {
        try {
          const ext = path.extname(new URL(payload.picture).pathname) || '.jpg';
          const filename = `google_${Date.now()}${ext}`;
          avatarPath = await downloadImage(payload.picture, filename);
        } catch (e) {
          avatarPath = '/uploads/avatars/default-avatar.png';
        }
      } else {
        avatarPath = '/uploads/avatars/default-avatar.png';
      }

      if (!user) {
        // Lấy orderNumber mới từ SequenceService
        const orderNumber = await SequenceService.getNextSequenceValue('user');
        // Create new user if not exists
        user = await prisma.user.create({
          data: {
            orderNumber,
            email: payload.email,
            name: payload.name || '',
            avatar: avatarPath,
            isGoogleAccount: true,
            role: 'USER',
          },
          select: {
            id: true,
            orderNumber: true,
            email: true,
            name: true,
            avatar: true,
            role: true,
            isGoogleAccount: true,
          }
        });
      } else {
        // Nếu user cũ là tài khoản thường, cập nhật isGoogleAccount=true và avatar nếu cần
        const updateData: any = {};
        if (!user.isGoogleAccount) updateData.isGoogleAccount = true;
        if (avatarPath && user.avatar !== avatarPath) updateData.avatar = avatarPath;
        if (Object.keys(updateData).length > 0) {
          user = await prisma.user.update({
            where: { id: user.id },
            data: updateData,
            select: {
              id: true,
              orderNumber: true,
              email: true,
              name: true,
              avatar: true,
              role: true,
              isGoogleAccount: true,
            }
          });
        }
      }

      // Generate JWT token
      const jwtToken = jwt.sign(
        { userId: user.id, role: user.role },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '7d' }
      );

      return {
        token: jwtToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatar: user.avatar,
          role: user.role,
          isGoogleAccount: user.isGoogleAccount,
        },
      };
    } catch (error) {
      throw error;
    }
  }
} 