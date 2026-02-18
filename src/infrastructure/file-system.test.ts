import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { NodeFileSystem } from './file-system.js';
import { InMemoryFileSystem } from './memory-file-system.js';
import type { FileSystem } from './file-system.js';

describe('NodeFileSystem', () => {
  let fs: NodeFileSystem;
  let testDir: string;
  let testFilePath: string;

  beforeEach(() => {
    fs = new NodeFileSystem();
    testDir = '/tmp/test-node-fs-' + Date.now();
    testFilePath = testDir + '/test-file.txt';
  });

  afterEach(async () => {
    try {
      await fs.unlink(testFilePath);
    } catch {
      // ignore
    }
    try {
      await fs.unlink(testDir);
    } catch {
      // ignore
    }
  });

  describe('readFile/writeFile', () => {
    test('writes and reads a file', async () => {
      await fs.mkdir(testDir, { recursive: true });
      await fs.writeFile(testFilePath, 'Hello World');
      const content = await fs.readFile(testFilePath);
      expect(content).toBe('Hello World');
    });

    test('returns empty string for empty file', async () => {
      await fs.mkdir(testDir, { recursive: true });
      await fs.writeFile(testFilePath, '');
      const content = await fs.readFile(testFilePath);
      expect(content).toBe('');
    });
  });

  describe('exists', () => {
    test('returns false for non-existent file', async () => {
      const exists = await fs.exists('/non/existent/path.txt');
      expect(exists).toBe(false);
    });

    test('returns true for existing file', async () => {
      await fs.mkdir(testDir, { recursive: true });
      await fs.writeFile(testFilePath, 'test');
      const exists = await fs.exists(testFilePath);
      expect(exists).toBe(true);
    });
  });

  describe('mkdir', () => {
    test('creates a directory', async () => {
      const dirPath = testDir + '/new-dir';
      await fs.mkdir(dirPath, { recursive: true });
      const exists = await fs.exists(dirPath);
      expect(exists).toBe(true);
    });
  });

  describe('readdir', () => {
    test('lists files in directory', async () => {
      const dirPath = testDir + '/list-test';
      await fs.mkdir(dirPath, { recursive: true });
      await fs.writeFile(dirPath + '/file1.txt', 'content1');
      await fs.writeFile(dirPath + '/file2.txt', 'content2');

      const files = await fs.readdir(dirPath);
      expect(files).toContain('file1.txt');
      expect(files).toContain('file2.txt');
    });
  });

  describe('unlink', () => {
    test('deletes a file', async () => {
      await fs.mkdir(testDir, { recursive: true });
      await fs.writeFile(testFilePath, 'to delete');
      await fs.unlink(testFilePath);
      const exists = await fs.exists(testFilePath);
      expect(exists).toBe(false);
    });
  });

  describe('stat', () => {
    test('returns file stats', async () => {
      await fs.mkdir(testDir, { recursive: true });
      await fs.writeFile(testFilePath, 'content');
      const stats = await fs.stat(testFilePath);
      expect(stats.mtime).toBeInstanceOf(Date);
    });
  });

  describe('sync methods', () => {
    test('writeFileSync and readFileSync', () => {
      fs.mkdirSync(testDir, { recursive: true });
      fs.writeFileSync(testFilePath, 'sync test');
      const content = fs.readFileSync(testFilePath);
      expect(content).toBe('sync test');
    });

    test('existsSync', () => {
      fs.mkdirSync(testDir, { recursive: true });
      fs.writeFileSync(testFilePath, 'exists sync');
      const exists = fs.existsSync(testFilePath);
      expect(exists).toBe(true);
    });

    test('existsSync returns false for non-existent', () => {
      const exists = fs.existsSync('/non/existent.txt');
      expect(exists).toBe(false);
    });

    test('statSync', () => {
      fs.mkdirSync(testDir, { recursive: true });
      fs.writeFileSync(testFilePath, 'stat sync');
      const stats = fs.statSync(testFilePath);
      expect(stats.mtime).toBeInstanceOf(Date);
    });
  });
});

describe('InMemoryFileSystem', () => {
  let fs: InMemoryFileSystem;

  beforeEach(() => {
    fs = new InMemoryFileSystem();
  });

  describe('readFile/writeFile', () => {
    test('writes and reads a file', async () => {
      await fs.writeFile('/test/file.txt', 'Hello World');
      const content = await fs.readFile('/test/file.txt');
      expect(content).toBe('Hello World');
    });

    test('throws ENOENT for non-existent file', async () => {
      await expect(fs.readFile('/non/existent.txt')).rejects.toThrow('ENOENT');
    });

    test('throws EISDIR when reading a directory', async () => {
      await fs.mkdir('/test/dir', { recursive: true });
      await expect(fs.readFile('/test/dir')).rejects.toThrow('EISDIR');
    });
  });

  describe('readFileSync/writeFileSync', () => {
    test('writes and reads synchronously', () => {
      fs.writeFileSync('/sync/file.txt', 'Sync Content');
      const content = fs.readFileSync('/sync/file.txt');
      expect(content).toBe('Sync Content');
    });

    test('throws ENOENT for non-existent file', () => {
      expect(() => fs.readFileSync('/non/existent.txt')).toThrow('ENOENT');
    });
  });

  describe('exists', () => {
    test('returns false for non-existent file', async () => {
      const exists = await fs.exists('/non/existent.txt');
      expect(exists).toBe(false);
    });

    test('returns true for existing file', async () => {
      await fs.writeFile('/exists/file.txt', 'content');
      const exists = await fs.exists('/exists/file.txt');
      expect(exists).toBe(true);
    });
  });

  describe('existsSync', () => {
    test('returns false for non-existent file', () => {
      const exists = fs.existsSync('/non/existent.txt');
      expect(exists).toBe(false);
    });

    test('returns true for existing file', () => {
      fs.writeFileSync('/exists-sync/file.txt', 'content');
      const exists = fs.existsSync('/exists-sync/file.txt');
      expect(exists).toBe(true);
    });
  });

  describe('mkdir', () => {
    test('creates a directory', async () => {
      await fs.mkdir('/new/dir', { recursive: true });
      const exists = await fs.exists('/new/dir');
      expect(exists).toBe(true);
    });

    test('creates nested directories with recursive', async () => {
      await fs.mkdir('/a/b/c/d', { recursive: true });
      const exists = await fs.exists('/a/b/c/d');
      expect(exists).toBe(true);
    });
  });

  describe('mkdirSync', () => {
    test('creates a directory synchronously', () => {
      fs.mkdirSync('/sync-dir/nested', { recursive: true });
      const exists = fs.existsSync('/sync-dir/nested');
      expect(exists).toBe(true);
    });
  });

  describe('readdir', () => {
    test('lists files in directory', async () => {
      await fs.mkdir('/list-test', { recursive: true });
      await fs.writeFile('/list-test/file1.txt', 'content1');
      await fs.writeFile('/list-test/file2.txt', 'content2');

      const files = await fs.readdir('/list-test');
      expect(files).toContain('file1.txt');
      expect(files).toContain('file2.txt');
    });
  });

  describe('readdirSync', () => {
    test('lists files synchronously', () => {
      fs.mkdirSync('/list-sync', { recursive: true });
      fs.writeFileSync('/list-sync/file1.txt', 'content1');
      fs.writeFileSync('/list-sync/file2.txt', 'content2');

      const files = fs.readdirSync('/list-sync');
      expect(files).toContain('file1.txt');
      expect(files).toContain('file2.txt');
    });
  });

  describe('unlink', () => {
    test('deletes a file', async () => {
      await fs.writeFile('/delete/me.txt', 'to delete');
      await fs.unlink('/delete/me.txt');
      const exists = await fs.exists('/delete/me.txt');
      expect(exists).toBe(false);
    });

    test('throws EISDIR when deleting a directory', async () => {
      await fs.mkdir('/dir-delete', { recursive: true });
      await expect(fs.unlink('/dir-delete')).rejects.toThrow('EISDIR');
    });
  });

  describe('unlinkSync', () => {
    test('deletes a file synchronously', () => {
      fs.writeFileSync('/delete-sync/file.txt', 'content');
      fs.unlinkSync('/delete-sync/file.txt');
      const exists = fs.existsSync('/delete-sync/file.txt');
      expect(exists).toBe(false);
    });
  });

  describe('stat/statSync', () => {
    test('returns stats with mtime', async () => {
      await fs.writeFile('/stat/file.txt', 'content');
      const stats = await fs.stat('/stat/file.txt');
      expect(stats.mtime).toBeInstanceOf(Date);
    });

    test('statSync returns stats', () => {
      fs.writeFileSync('/stat-sync/file.txt', 'content');
      const stats = fs.statSync('/stat-sync/file.txt');
      expect(stats.mtime).toBeInstanceOf(Date);
    });

    test('throws ENOENT for non-existent file', async () => {
      await expect(fs.stat('/non/existent.txt')).rejects.toThrow('ENOENT');
    });

    test('statSync throws ENOENT for non-existent file', () => {
      expect(() => fs.statSync('/non/existent.txt')).toThrow('ENOENT');
    });
  });

  describe('copyFile', () => {
    test('copies a file', async () => {
      await fs.writeFile('/src/file.txt', 'original');
      await fs.copyFile('/src/file.txt', '/dest/file.txt');
      const content = await fs.readFile('/dest/file.txt');
      expect(content).toBe('original');
    });
  });

  describe('rename', () => {
    test('renames a file', async () => {
      await fs.writeFile('/old/name.txt', 'content');
      await fs.rename('/old/name.txt', '/new/name.txt');
      const content = await fs.readFile('/new/name.txt');
      expect(content).toBe('content');
      const oldExists = await fs.exists('/old/name.txt');
      expect(oldExists).toBe(false);
    });
  });

  describe('reset', () => {
    test('clears all files', async () => {
      await fs.writeFile('/file1.txt', 'content1');
      await fs.writeFile('/file2.txt', 'content2');
      fs.reset();
      const exists1 = await fs.exists('/file1.txt');
      const exists2 = await fs.exists('/file2.txt');
      expect(exists1).toBe(false);
      expect(exists2).toBe(false);
    });
  });

  describe('setFile', () => {
    test('sets file content directly', () => {
      fs.setFile('/set/file.txt', 'direct content');
      const content = fs.readFileSync('/set/file.txt');
      expect(content).toBe('direct content');
    });
  });

  describe('setDirectory', () => {
    test('creates directory entry', () => {
      fs.setDirectory('/custom/dir');
      const exists = fs.existsSync('/custom/dir');
      expect(exists).toBe(true);
    });
  });

  describe('dump', () => {
    test('returns all file contents', async () => {
      await fs.writeFile('/dump/file1.txt', 'content1');
      await fs.writeFile('/dump/file2.txt', 'content2');
      const dump = fs.dump();
      expect(dump['/dump/file1.txt']).toBe('content1');
      expect(dump['/dump/file2.txt']).toBe('content2');
    });

    test('excludes directories from dump', async () => {
      await fs.mkdir('/dump/dir', { recursive: true });
      await fs.writeFile('/dump/file.txt', 'file content');
      const dump = fs.dump();
      expect(Object.keys(dump)).not.toContain('/dump/dir');
      expect(dump['/dump/file.txt']).toBe('file content');
    });
  });

  describe('path normalization', () => {
    test('handles different path separators', async () => {
      if (process.platform === 'win32') {
        await fs.writeFile('/normalized/sub/file.txt', 'content');
        const content = await fs.readFile('/normalized\\sub\\file.txt');
        expect(content).toBe('content');
      } else {
        await fs.writeFile('/normalized/sub/file.txt', 'content');
        const content = await fs.readFile('/normalized/sub/file.txt');
        expect(content).toBe('content');
      }
    });

    test('handles relative paths', async () => {
      fs.writeFileSync('relative/file.txt', 'relative content');
      const content = fs.readFileSync('relative/file.txt');
      expect(content).toBe('relative content');
    });
  });
});
