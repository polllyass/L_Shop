export interface IUser {
  id: string;
  name: string;
  email: string;
  login: string;
  phone: string;
  password: string;
  createdAt: string;
  lastLogin?: string;
}

export interface IUserSession {
  userId: string;
  sessionId: string;
  expiresAt: number;
}

export type IUserSafe = Omit<IUser, 'password'>;