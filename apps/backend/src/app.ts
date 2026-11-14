import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import { env } from './config/env';
import { errorHandler } from './middlewares/errorHandler';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import eventRoutes from './routes/event.routes';
import voucherRoutes from './routes/voucher.routes';
import transactionRoutes from './routes/transaction.routes';
import reviewRoutes from './routes/review.routes';
import dashboardRoutes from './routes/dashboard.routes';

const app = express();

// Middlewares
app.use(cors({
  origin: env.FRONTEND_URL,
  credentials: true,
}));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files untuk uploaded images
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Health check
app.get('/health', (req, res) => {
  res.json({ success: true, message: 'Tiketmu API is running' });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/vouchers', voucherRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/dashboard', dashboardRoutes);
// dst...

// Error handler (SELALU di paling akhir)
app.use(errorHandler);

export default app;
