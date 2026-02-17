import { describe, test, expect, beforeEach, jest } from 'bun:test';
import { FileSystemPersonalityRepository } from './repository.js';
import type { PersonalityFile, PersonalityMetadata } from './types.js';

const mockPersonality: PersonalityFile = {
  name: 'test-person',
  description: 'A test personality',
  emoji: '🤖',
  slangIntensity: 0.5,
  mood: {
    enabled: true,
    default: 'neutral',
    override: null,
    drift: 0.2,
    toast: true,
    seed: 12345,
  },
};

const mockMetadata: PersonalityMetadata = {
  name: 'test-person',
  description: 'A test personality',
  source: 'project',
  modifiedAt: '2024-01-01T00:00:00.000Z',
};

const mockFs = {
  exists: jest.fn(async (path: string) => path.includes('exists-true')),
  readFile: jest.fn(async (path: string) => {
    if (path.includes('exists-true')) {
      return JSON.stringify(mockPersonality);
    }
    throw new Error('ENOENT');
  }),
  writeFile: jest.fn(async () => {}),
  unlink: jest.fn(async () => {}),
  mkdir: jest.fn(async () => {}),
  readdir: jest.fn(async () => ['test-person.json', 'another.json']),
  stat: jest.fn(async () => ({
    mtime: new Date('2024-01-01'),
    ctime: new Date('2024-01-01'),
    size: 100,
  })),
};

describe('FileSystemPersonalityRepository', () => {
  let repository: FileSystemPersonalityRepository;
  let tempDir: string;

  beforeEach(() => {
    tempDir = '/tmp/test-repo-' + Date.now();
    
    jest.spyOn(mockFs, 'exists');
    jest.spyOn(mockFs, 'readFile');
    jest.spyOn(mockFs, 'writeFile');
    jest.spyOn(mockFs, 'unlink');
    jest.spyOn(mockFs, 'readdir');
    jest.spyOn(mockFs, 'stat');

    repository = new FileSystemPersonalityRepository(
      tempDir,
      '/tmp/global',
      'project',
      mockFs as any,
    );
  });

  describe('findByName', () => {
    test('returns null when personality does not exist', async () => {
      const result = await repository.findByName('nonexistent');
      expect(result).toBeNull();
    });

    test('returns personality when it exists', async () => {
      const result = await repository.findByName('exists-true');
      expect(result).not.toBeNull();
      expect(result?.personality.name).toBe('test-person');
    });
  });

  describe('findAll', () => {
    test.skip('returns list of personalities', async () => {
      const result = await repository.findAll();
      expect(result.length).toBeGreaterThanOrEqual(1);
      expect(result[0]?.name).toBe('test-person');
    });
  });

  describe('exists', () => {
    test('returns true when personality exists', async () => {
      const result = await repository.exists('exists-true');
      expect(result).toBe(true);
    });

    test('returns false when personality does not exist', async () => {
      const result = await repository.exists('nonexistent');
      expect(result).toBe(false);
    });
  });

  describe('save', () => {
    test('writes personality to file', async () => {
      await repository.save('new-person', mockPersonality);
      expect(mockFs.writeFile).toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    test('removes personality file', async () => {
      await repository.delete('exists-true');
      expect(mockFs.unlink).toHaveBeenCalled();
    });
  });
});
