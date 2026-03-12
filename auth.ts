import { Request, Response, NextFunction } from 'express';
import { FileUtils } from '../utils/fileUtils';
import { SessionUtils } from '../utils/sessionUtils';
import { IUserSession } from '../types';
declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}
export class AuthMiddleware {
  private fileUtils: FileUtils;
  constructor() {
    this.fileUtils = new FileUtils();
  }
  checkAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const sessionId = req.cookies[SessionUtils.COOKIE_NAME];
      if (!sessionId) {
        res.status(401).json({ error: 'Не авторизован' });
        return;
      }
      const sessions = await this.fileUtils.readFile<IUserSession>('sessions.json');
      const session = sessions.find(s => s.sessionId === sessionId);
      if (!session) {
        res.clearCookie(SessionUtils.COOKIE_NAME);
        res.status(401).json({ error: 'Сессия не найдена' });
        return;
      }
      if (SessionUtils.isSessionExpired(session.expiresAt)) {
        const updatedSessions = sessions.filter(s => s.sessionId !== sessionId);
        await this.fileUtils.writeFile('sessions.json', updatedSessions);
        res.clearCookie(SessionUtils.COOKIE_NAME);
        res.status(401).json({ error: 'Сессия истекла' });
        return;
      }
      req.userId = session.userId;
      next();
    } catch (error) {
      console.error('Auth middleware error:', error);
      res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
  };
  optionalAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const sessionId = req.cookies[SessionUtils.COOKIE_NAME];

      if (!sessionId) {
        next();
        return;
      }
      const sessions = await this.fileUtils.readFile<IUserSession>('sessions.json');
      const session = sessions.find(s => s.sessionId === sessionId);

      if (session && !SessionUtils.isSessionExpired(session.expiresAt)) {
        req.userId = session.userId;
      }
      next();
    } catch (error) {
      next();
    }
  };
}