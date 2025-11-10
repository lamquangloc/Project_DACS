import { Request, Response, NextFunction } from 'express';

/**
 * Middleware để xác thực request từ chatbot/n8n
 * Sử dụng secret key thay vì JWT token
 */
export const chatBotAuth = (req: Request, res: Response, next: NextFunction) => {
  // Kiểm tra secret key từ header hoặc query parameter
  const secretKey = req.headers['x-chatbot-secret'] || req.query.secret;
  const expectedSecret = process.env.CHATBOT_SECRET_KEY || 'chatbot-secret-key-default-2024';
  
  if (!secretKey) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Missing chatbot secret key',
      message: 'Thiếu secret key. Vui lòng thêm header: x-chatbot-secret'
    });
  }
  
  if (secretKey !== expectedSecret) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Invalid chatbot secret key',
      message: 'Secret key không hợp lệ'
    });
  }
  
  // Xác thực thành công, tiếp tục
  next();
};


