import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Request } from 'express';

// Extend Express Request type to include fileValidationError
declare global {
  namespace Express {
    interface Request {
      fileValidationError?: string;
    }
  }
}

// Ensure upload directories exist
const createUploadDirs = () => {
  const dirs = [
    'uploads',
    'uploads/avatars',
    'uploads/categories',
    'uploads/products',
    'uploads/combos'
  ];
  
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
};

createUploadDirs();

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: (req: Request, _file: Express.Multer.File, cb) => {
    let uploadDir = 'uploads/categories'; // default to categories
    
    if (req.baseUrl.includes('users')) {
      uploadDir = 'uploads/avatars';
    } else if (req.baseUrl.includes('products')) {
      uploadDir = 'uploads/products';
    } else if (req.baseUrl.includes('combos')) {
      uploadDir = 'uploads/combos';
      console.log('Saving combo image to:', uploadDir);
    }
    
    // Use absolute path
    const absolutePath = path.join(__dirname, '../../', uploadDir);
    console.log('Absolute path for file upload:', absolutePath);
    cb(null, absolutePath);
  },
  filename: (_req: Request, file: Express.Multer.File, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `image-${uniqueSuffix}${ext}`);
  }
});

// File filter
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Check file type
  if (!file.mimetype.startsWith('image/')) {
    return cb(new Error('Only image files are allowed!'));
  }

  // Check file extension
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (!allowedExtensions.includes(ext)) {
    return cb(new Error('Invalid file type. Only jpg, jpeg, png, gif, and webp files are allowed.'));
  }

  // Check file size (5MB limit)
  const maxSize = 5 * 1024 * 1024; // 5MB
  const contentLength = req.headers['content-length'];
  if (contentLength && parseInt(contentLength) > maxSize) {
    return cb(new Error('File size too large. Maximum size is 5MB.'));
  }

  cb(null, true);
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024
  }
});

export default upload; 