import { readFile as _readFile, writeFile, access, mkdir, readdir, unlink, stat } from 'node:fs/promises';
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, unlinkSync, statSync } from 'node:fs';
import { dirname } from 'node:path';

export interface FileSystem {
  // Async methods
  readFile(path: string, encoding?: string): Promise<string>;
  writeFile(path: string, data: string, encoding?: string): Promise<void>;
  exists(path: string): Promise<boolean>;
  mkdir(path: string, options?: { recursive?: boolean }): Promise<void>;
  readdir(path: string): Promise<string[]>;
  unlink(path: string): Promise<void>;
  stat(path: string): Promise<{ mtime: Date }>;
  copyFile(src: string, dest: string): Promise<void>;
  rename(oldPath: string, newPath: string): Promise<void>;

  // Sync methods
  readFileSync(path: string, encoding?: string): string;
  writeFileSync(path: string, data: string, encoding?: string): void;
  existsSync(path: string): boolean;
  mkdirSync(path: string, options?: { recursive?: boolean }): void;
  readdirSync(path: string): string[];
  unlinkSync(path: string): void;
  statSync(path: string): { mtime: Date };
}

export class NodeFileSystem implements FileSystem {
  async copyFile(src: string, dest: string): Promise<void> {
    const content = await this.readFile(src);
    await this.writeFile(dest, content);
  }

  async rename(oldPath: string, newPath: string): Promise<void> {
    const content = await this.readFile(oldPath);
    await this.writeFile(newPath, content);
    await this.unlink(oldPath);
  }
  async readFile(path: string, encoding?: string): Promise<string> {
    return _readFile(path, (encoding as BufferEncoding | undefined) ?? 'utf-8');
  }

  async writeFile(path: string, data: string, _encoding?: string): Promise<void> {
    return writeFile(path, data, 'utf-8');
  }

  async exists(path: string): Promise<boolean> {
    try {
      await access(path);
      return true;
    } catch {
      return false;
    }
  }

  async mkdir(path: string, options?: { recursive?: boolean }): Promise<void> {
    await mkdir(path, options);
  }

  async readdir(path: string): Promise<string[]> {
    return readdir(path);
  }

  async unlink(path: string): Promise<void> {
    return unlink(path);
  }

  async stat(path: string): Promise<{ mtime: Date }> {
    const stats = await stat(path);
    return { mtime: stats.mtime };
  }

  readFileSync(path: string, encoding?: string): string {
    return readFileSync(path, (encoding as BufferEncoding | undefined) ?? 'utf-8');
  }

  writeFileSync(path: string, data: string, _encoding?: string): void {
    writeFileSync(path, data, 'utf-8');
  }

  existsSync(path: string): boolean {
    return existsSync(path);
  }

  mkdirSync(path: string, options?: { recursive?: boolean }): void {
    mkdirSync(path, options);
  }

  readdirSync(path: string): string[] {
    return readdirSync(path);
  }

  unlinkSync(path: string): void {
    unlinkSync(path);
  }

  statSync(path: string): { mtime: Date } {
    const stats = statSync(path);
    return { mtime: stats.mtime };
  }
}

export const defaultFileSystem: FileSystem = new NodeFileSystem();

export function ensureDir(filePath: string, fs: FileSystem = defaultFileSystem): Promise<void> {
  const dir = dirname(filePath);
  return fs.mkdir(dir, { recursive: true });
}

export function tryLoadJson<T>(filePath: string, fs: FileSystem = defaultFileSystem): Promise<T | null> {
  return fs.exists(filePath).then(async (exists) => {
    if (!exists) return null;
    try {
      const raw = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  });
}

export async function saveJson<T>(filePath: string, data: T, fs: FileSystem = defaultFileSystem): Promise<void> {
  await ensureDir(filePath, fs);
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

export function tryLoadJsonSync<T>(filePath: string, fs: FileSystem = defaultFileSystem): T | null {
  if (!fs.existsSync(filePath)) return null;
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function ensureDirSync(filePath: string, fs: FileSystem = defaultFileSystem): void {
  const dir = dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function saveJsonSync<T>(filePath: string, data: T, fs: FileSystem = defaultFileSystem): void {
  ensureDirSync(filePath, fs);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}
