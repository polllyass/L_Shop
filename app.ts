import express, { Request, Response } from 'express';
import cookieParser from 'cookie-parser';
import { AuthMiddleware } from './middleware/auth';
import userRoutes from './routes/userRoutes';
import productsRouter from './routes/products';
import cartRouter from './routes/cart';

const app = express();
const authMiddleware = new AuthMiddleware();

// Базовые middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Auth middleware (добавляет req.userId если есть кука)
app.use(authMiddleware.optionalAuth);

// Роуты
app.use('/api/users', userRoutes);           // регистрация/логин от Разработчика 1
app.use('/api/products', productsRouter);     // товары (твой код)
app.use('/api/cart', cartRouter);             // корзина (твой код)

// Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    user: (req as any).userId || 'anonymous'
  });
});

// 404 handler
app.use('*', (req: Request, res: Response) => {
  res.status(404).json({ error: 'Route not found' });
});

export default app;