import express from 'express';
import cookieParser from 'cookie-parser';
import userRoutes from './routes/userRoutes';
import { AuthMiddleware } from './middleware/auth';
const app = express();
const authMiddleware = new AuthMiddleware();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(authMiddleware.optionalAuth);
app.use('/api/users', userRoutes);
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});
export default app;