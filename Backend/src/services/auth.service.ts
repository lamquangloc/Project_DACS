import { OAuth2Client } from 'google-auth-library';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { SequenceService } from './sequence.service';

const prisma = new PrismaClient();
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

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

      if (!user) {
        // Lấy orderNumber mới từ SequenceService
        const orderNumber = await SequenceService.getNextSequenceValue('user');
        // Create new user if not exists
        user = await prisma.user.create({
          data: {
            orderNumber,
            email: payload.email,
            name: payload.name || '',
            avatar: payload.picture || '',
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
        // Update user avatar if Google provides one and it's different
        if (payload.picture && user.avatar !== payload.picture) {
          user = await prisma.user.update({
            where: { id: user.id },
            data: { avatar: payload.picture },
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