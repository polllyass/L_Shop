import { FileUtils } from '../utils/fileUtils';
import { IUser } from '../types';
import bcrypt from 'bcrypt';
async function initData() {
  const fileUtils = new FileUtils();
  const testUser: IUser = {
    id: 'test-user-1',
    name: 'Тестовый Пользователь',
    email: 'test@example.com',
    login: 'testuser',
    phone: '+1234567890',
    password: await bcrypt.hash('password123', 10),
    createdAt: new Date().toISOString(),
  };
  await fileUtils.writeFile('users.json', [testUser]);
  await fileUtils.writeFile('sessions.json', []);
  console.log('Данные инициализированы');
}
initData().catch(console.error);