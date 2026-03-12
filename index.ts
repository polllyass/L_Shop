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

export interface IProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  inStock: boolean;
  image?: string;
  createdAt: string;
}

export interface ICartItem {
  productId: string;
  quantity: number;
  addedAt: string;
}

export interface ICart {
  id: string;
  userId: string;
  items: ICartItem[];
  updatedAt: string;
}

export interface ICartWithProducts extends ICart {
  items: (ICartItem & { product: IProduct | null })[];
}