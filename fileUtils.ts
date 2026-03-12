import fs from 'fs/promises';
import path from 'path';
export class FileUtils {
  private dataDir: string;
  constructor() {
    this.dataDir = path.join(__dirname, '../../data');
  }

  async readFile<T>(filename: string): Promise<T[]> {
    try {
      const filePath = path.join(this.dataDir, filename);
      const data = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      return [];
    }
  }
  async writeFile<T>(filename: string, data: T[]): Promise<void> {
    const filePath = path.join(this.dataDir, filename);
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
  }

  async findById<T extends { id: string }>(filename: string, id: string): Promise<T | null> {
    const items = await this.readFile<T>(filename);
    return items.find(item => item.id === id) || null;
  }
  async save<T extends { id: string }>(filename: string, item: T): Promise<T> {
    const items = await this.readFile<T>(filename);
    const index = items.findIndex(i => i.id === item.id);
    if (index >= 0) {
      items[index] = item;
    } else {
      items.push(item);
    }
    await this.writeFile(filename, items);
    return item;
  }
}