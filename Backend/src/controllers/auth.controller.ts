import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';

export class AuthController {
  static async googleLogin(req: Request, res: Response) {
    try {
      const { credential } = req.body;
      if (!credential) {
        return res.status(400).json({ message: 'Missing Google credential' });
      }

      const result = await AuthService.handleGoogleLogin(credential);
      return res.json(result);
    } catch (error: any) {
      return res.status(400).json({ message: error.message });
    }
  }
} 