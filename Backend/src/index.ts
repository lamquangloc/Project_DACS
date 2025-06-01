import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from 'dotenv';
import { errorHandler } from './middleware/error.middleware';
import { PrismaClient } from '@prisma/client';
import path from 'path';
import fs from 'fs';

// Routes
import authRoutes from './routes/auth.routes';
import categoryRoutes from './routes/category.routes';
import productRoutes from './routes/product.routes';
import userRoutes from './routes/user.routes';
import orderRoutes from './routes/order.routes';
import tableRoutes from './routes/table.routes';
import reservationRoutes from './routes/reservation.routes';
import comboRoutes from './routes/combo.routes';
import unitRoutes from './routes/unitRoutes';
import dashboardRoutes from './routes/dashboard.route';

// Thêm import router AI chat (dùng require để tránh lỗi type)
// eslint-disable-next-line @typescript-eslint/no-var-requires
const aiChatRoutes = require('./routes/aiChat');

// Load environment variables
config();

const app = express();
const prisma = new PrismaClient();

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
const categoryUploadsDir = path.join(uploadsDir, 'categories');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}
if (!fs.existsSync(categoryUploadsDir)) {
  fs.mkdirSync(categoryUploadsDir);
}

// Middleware
app.use(cors({
  origin: [process.env.FRONTEND_URL!, process.env.ADMIN_URL!],
  credentials: true
}));
app.use(helmet({
  crossOriginResourcePolicy: {
    policy: "cross-origin"
  }
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/users', userRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/tables', tableRoutes);
app.use('/api/reservations', reservationRoutes);
app.use('/api/combos', comboRoutes);
app.use('/api/units', unitRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/ai', aiChatRoutes);

// Error handling
app.use(errorHandler);

const startServer = async () => {
  try {
    // Test database connection
    await prisma.$connect();
    console.log('✅ Database connection established');

    // Start server
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`🚀 Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('❌ Error starting server:', error);
    process.exit(1);
  }
};

startServer(); 