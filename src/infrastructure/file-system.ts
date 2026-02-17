import { readFile as _readFile, writeFile, access, mkdir, readdir, unlink, stat } from 'node:fs/promises';
import { dirname } from 'node:path';

export interface FileSystem {
  readFile(path: string, encoding?: string): Promise<string>;
  writeFile(path: string, data: string, encoding?: string): Promise<void>;
  exists(path: string): Promise<boolean>;
  mkdir(path: string, options?: { recursive?: boolean }): Promise<void>;
  readdir(path: string): Promise<string[]>;
  unlink(path: string): Promise<void>;
  stat(path: string): Promise<{ mtime: Date }>;
}

class NodeFileSystem implements FileSystem {
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
