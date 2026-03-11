import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { FileUtils } from '../utils/fileUtils';
import { SessionUtils } from '../utils/sessionUtils';
import { IUser, IUserSafe, IUserSession } from '../types';
import { v4 as uuidv4 } from 'uuid';

export class UserController {
  private fileUtils: FileUtils;

  constructor() {
    this.fileUtils = new FileUtils();
  }

  register = async (req: Request, res: Response): Promise<void> => {
    try {
      const { name, email, login, phone, password } = req.body;

      if (!name || !email || !login || !phone || !password) {
        res.status(400).json({ error: 'Все поля обязательны' });
        return;
      }

      const users = await this.fileUtils.readFile<IUser>('users.json');
      
      const existingUser = users.find(
        u => u.email === email || u.login === login || u.phone === phone
      );

      if (existingUser) {
        res.status(400).json({ 
          error: 'Пользователь с таким email, логином или телефоном уже существует' 
        });
        return;
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const newUser: IUser = {
        id: uuidv4(),
        name,
        email,
        login,
        phone,
        password: hashedPassword,
        createdAt: new Date().toISOString(),
      };

      users.push(newUser);
      await this.fileUtils.writeFile('users.json', users);

      await this.createSession(res, newUser.id);

      const { password: _, ...userSafe } = newUser;
      res.status(201).json(userSafe);
    } catch (error) {
      console.error('Register error:', error);
      res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
  };

  login = async (req: Request, res: Response): Promise<void> => {
    try {
      const { login, password } = req.body;

      if (!login || !password) {
        res.status(400).json({ error: 'Логин и пароль обязательны' });
        return;
      }

      const users = await this.fileUtils.readFile<IUser>('users.json');
      
      const user = users.find(
        u => u.login === login || u.email === login
      );

      if (!user) {
        res.status(401).json({ error: 'Неверный логин или пароль' });
        return;
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        res.status(401).json({ error: 'Неверный логин или пароль' });
        return;
      }

      user.lastLogin = new Date().toISOString();
      await this.fileUtils.save('users.json', user);

      await this.createSession(res, user.id);

      const { password: _, ...userSafe } = user;
      res.json(userSafe);
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
  };

  logout = async (req: Request, res: Response): Promise<void> => {
    try {
      const sessionId = req.cookies[SessionUtils.COOKIE_NAME];

      if (sessionId) {
        const sessions = await this.fileUtils.readFile<IUserSession>('sessions.json');
        const updatedSessions = sessions.filter(s => s.sessionId !== sessionId);
        await this.fileUtils.writeFile('sessions.json', updatedSessions);
      }

      res.clearCookie(SessionUtils.COOKIE_NAME);
      res.json({ message: 'Успешный выход' });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
  };

  getCurrentUser = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Не авторизован' });
        return;
      }

      const user = await this.fileUtils.findById<IUser>('users.json', req.userId);
      
      if (!user) {
        res.status(404).json({ error: 'Пользователь не найден' });
        return;
      }

      const { password: _, ...userSafe } = user;
      res.json(userSafe);
    } catch (error) {
      console.error('Get current user error:', error);
      res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
  };

  private createSession = async (res: Response, userId: string): Promise<void> => {
    const sessions = await this.fileUtils.readFile<IUserSession>('sessions.json');
    
    const filteredSessions = sessions.filter(s => s.userId !== userId);
    
    const newSession: IUserSession = {
      userId,
      sessionId: SessionUtils.generateSessionId(),
      expiresAt: SessionUtils.getExpirationTime(),
    };

    filteredSessions.push(newSession);
    await this.fileUtils.writeFile('sessions.json', filteredSessions);

    res.cookie(SessionUtils.COOKIE_NAME, newSession.sessionId, {
      httpOnly: true,
      maxAge: SessionUtils.COOKIE_MAX_AGE,
      sameSite: 'strict',
      path: '/',
    });
  };
}