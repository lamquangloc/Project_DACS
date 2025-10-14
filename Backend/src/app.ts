import express from 'express';
import cors from 'cors';
import path from 'path';
import morgan from 'morgan';
import { errorHandler } from './middleware/error.middleware';
import productRoutes from './routes/product.routes';
import categoryRoutes from './routes/category.routes';
import userRoutes from './routes/user.routes';
import orderRoutes from './routes/order.routes';
import reservationRoutes from './routes/reservation.routes';
import tableRoutes from './routes/table.routes';
import comboRoutes from './routes/combo.routes';
import authRoutes from './routes/auth.routes';
import adminRoutes from './routes/admin.routes';
import { isAuthenticated, isAdminOrStaff } from './middleware/auth.middleware';
import fs from 'fs';
import unitRoutes from './routes/unitRoutes';
import dashboardRoutes from './routes/dashboard.route';
import n8nChatRoutes from './routes/n8nChat';

const aiChatRoutes = require('./routes/aiChat');
const app = express();

// CORS configuration
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5000', 'http://localhost:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'X-Requested-With', 'Accept'],
  exposedHeaders: ['Content-Disposition']
}));

// Middleware to parse JSON bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Static files
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// Public routes
app.use('/api/auth', authRoutes);
app.use('/api/ai', aiChatRoutes);
app.use('/api/n8n', n8nChatRoutes);

// Protected routes
app.use('/api/categories', categoryRoutes);
app.use('/api/products', isAuthenticated, productRoutes);
app.use('/api/orders', isAuthenticated, orderRoutes);
app.use('/api/reservations', isAuthenticated, reservationRoutes);
app.use('/api/tables', isAuthenticated, tableRoutes);
app.use('/api/combos', isAuthenticated, comboRoutes);
app.use('/api/users', isAuthenticated, userRoutes);
app.use('/api/admin', isAuthenticated, isAdminOrStaff, adminRoutes);
app.use('/api/units', unitRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Error handling
app.use(errorHandler);

export default app; 