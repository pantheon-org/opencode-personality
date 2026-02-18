import type { FileSystem } from './file-system.js';
import path from 'node:path';

interface FileEntry {
  content: string;
  isDirectory: boolean;
  mtime: Date;
}

export class InMemoryFileSystem implements FileSystem {
  private files = new Map<string, FileEntry>();

  async readFile(filePath: string, encoding?: string): Promise<string> {
    const entry = this.files.get(path.normalize(filePath));
    if (!entry) throw new Error(`ENOENT: no such file or directory ${filePath}`);
    if (entry.isDirectory) throw new Error(`EISDIR: ${filePath} is a directory`);
    return entry.content;
  }

  async writeFile(filePath: string, data: string, _encoding?: string): Promise<void> {
    const normalized = path.normalize(filePath);
    const existing = this.files.get(normalized);
    this.files.set(normalized, {
      content: data,
      isDirectory: existing?.isDirectory ?? false,
      mtime: new Date(),
    });
  }

  async exists(filePath: string): Promise<boolean> {
    return this.files.has(path.normalize(filePath));
  }

  async mkdir(filePath: string, options?: { recursive?: boolean }): Promise<void> {
    const normalized = path.normalize(filePath);
    if (options?.recursive) {
      const isAbsolute = path.isAbsolute(normalized);
      const parts = normalized.split(path.sep).filter(Boolean);
      let current = isAbsolute ? path.sep : '';
      for (const part of parts) {
        current = current ? path.join(current, part) : part;
        if (!this.files.has(current)) {
          this.files.set(current, { content: '', isDirectory: true, mtime: new Date() });
        }
      }
    } else {
      this.files.set(normalized, { content: '', isDirectory: true, mtime: new Date() });
    }
  }

  async readdir(dirPath: string): Promise<string[]> {
    const normalizedDir = path.normalize(dirPath);
    const entries: string[] = [];

    for (const [filePath, entry] of this.files) {
      if (entry.isDirectory && filePath === normalizedDir) {
        for (const [subPath, subEntry] of this.files) {
          if (!subEntry.isDirectory && path.dirname(subPath) === normalizedDir) {
            entries.push(path.basename(subPath));
          }
        }
        break;
      }
    }

    return entries;
  }

  async unlink(filePath: string): Promise<void> {
    const normalized = path.normalize(filePath);
    const entry = this.files.get(normalized);
    if (entry?.isDirectory) {
      throw new Error(`EISDIR: ${filePath} is a directory`);
    }
    this.files.delete(normalized);
  }

  async stat(filePath: string): Promise<{ mtime: Date }> {
    const entry = this.files.get(path.normalize(filePath));
    if (!entry) throw new Error(`ENOENT: no such file or directory ${filePath}`);
    return { mtime: entry.mtime };
  }

  readFileSync(filePath: string, _encoding?: string): string {
    const entry = this.files.get(path.normalize(filePath));
    if (!entry) throw new Error(`ENOENT: no such file or directory ${filePath}`);
    if (entry.isDirectory) throw new Error(`EISDIR: ${filePath} is a directory`);
    return entry.content;
  }

  writeFileSync(filePath: string, data: string, _encoding?: string): void {
    const normalized = path.normalize(filePath);
    const dir = path.dirname(normalized);
    const dirEntry = this.files.get(dir);
    if (!dirEntry?.isDirectory && dir !== normalized) {
      this.mkdirSync(dir, { recursive: true });
    }
    this.files.set(normalized, { content: data, isDirectory: false, mtime: new Date() });
  }

  existsSync(filePath: string): boolean {
    return this.files.has(path.normalize(filePath));
  }

  mkdirSync(filePath: string, options?: { recursive?: boolean }): void {
    const normalized = path.normalize(filePath);
    if (options?.recursive) {
      const isAbsolute = path.isAbsolute(normalized);
      const parts = normalized.split(path.sep).filter(Boolean);
      let current = isAbsolute ? path.sep : '';
      for (const part of parts) {
        current = current ? path.join(current, part) : part;
        if (!this.files.has(current)) {
          this.files.set(current, { content: '', isDirectory: true, mtime: new Date() });
        }
      }
    } else {
      this.files.set(normalized, { content: '', isDirectory: true, mtime: new Date() });
    }
  }

  readdirSync(dirPath: string): string[] {
    const normalizedDir = path.normalize(dirPath);
    const entries: string[] = [];

    for (const [filePath, entry] of this.files) {
      if (entry.isDirectory && filePath === normalizedDir) {
        for (const [subPath, subEntry] of this.files) {
          if (!subEntry.isDirectory && path.dirname(subPath) === normalizedDir) {
            entries.push(path.basename(subPath));
          }
        }
        break;
      }
    }

    return entries;
  }

  unlinkSync(filePath: string): void {
    const normalized = path.normalize(filePath);
    this.files.delete(normalized);
  }

  statSync(filePath: string): { mtime: Date } {
    const entry = this.files.get(path.normalize(filePath));
    if (!entry) throw new Error(`ENOENT: no such file or directory ${filePath}`);
    return { mtime: entry.mtime };
  }

  async copyFile(src: string, dest: string): Promise<void> {
    const content = await this.readFile(src);
    await this.writeFile(dest, content);
  }

  async rename(oldPath: string, newPath: string): Promise<void> {
    const content = await this.readFile(oldPath);
    await this.writeFile(newPath, content);
    await this.unlink(oldPath);
  }

  reset(): void {
    this.files.clear();
  }

  setFile(filePath: string, content: string): void {
    const normalized = path.normalize(filePath);
    const dir = path.dirname(normalized);
    const dirEntry = this.files.get(dir);
    if (!dirEntry?.isDirectory && dir !== normalized) {
      this.files.set(dir, { content: '', isDirectory: true, mtime: new Date() });
    }
    this.files.set(normalized, { content, isDirectory: false, mtime: new Date() });
  }

  setDirectory(dirPath: string): void {
    const normalized = path.normalize(dirPath);
    this.files.set(normalized, { content: '', isDirectory: true, mtime: new Date() });
  }

  dump(): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [filePath, entry] of this.files) {
      if (!entry.isDirectory) {
        result[filePath] = entry.content;
      }
    }
    return result;
  }
}
