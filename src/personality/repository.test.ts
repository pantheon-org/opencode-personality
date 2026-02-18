import { describe, test, expect, beforeEach } from 'bun:test';
import { FileSystemPersonalityRepository } from './repository.js';
import { InMemoryFileSystem } from '../infrastructure/memory-file-system.js';
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

describe('FileSystemPersonalityRepository', () => {
  let fs: InMemoryFileSystem;
  let repository: FileSystemPersonalityRepository;
  let tempDir: string;

  beforeEach(() => {
    fs = new InMemoryFileSystem();
    tempDir = '/tmp/test-repo-' + Date.now();
    
    repository = new FileSystemPersonalityRepository(
      tempDir,
      '/tmp/global',
      'project',
      fs,
    );
  });

  describe('findByName', () => {
    test('returns null when personality does not exist', async () => {
      const result = await repository.findByName('nonexistent');
      expect(result).toBeNull();
    });

    test('returns personality when it exists', async () => {
      fs.setDirectory(tempDir + '/.opencode/personalities');
      fs.setFile(tempDir + '/.opencode/personalities/test-person.json', JSON.stringify(mockPersonality));

      const result = await repository.findByName('test-person');
      expect(result).not.toBeNull();
      expect(result?.personality.name).toBe('test-person');
    });
  });

  describe('findAll', () => {
    test('returns list of personalities', async () => {
      fs.setDirectory(tempDir + '/.opencode/personalities');
      fs.setFile(tempDir + '/.opencode/personalities/test-person.json', JSON.stringify(mockPersonality));

      const result = await repository.findAll();
      expect(result.length).toBeGreaterThanOrEqual(1);
      expect(result[0]?.name).toBe('test-person');
    });
  });

  describe('exists', () => {
    test('returns true when personality exists', async () => {
      fs.setDirectory(tempDir + '/.opencode/personalities');
      fs.setFile(tempDir + '/.opencode/personalities/exists-true.json', JSON.stringify(mockPersonality));

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
      const exists = await fs.exists(tempDir + '/.opencode/personalities/new-person.json');
      expect(exists).toBe(true);
    });
  });

  describe('delete', () => {
    test('removes personality file', async () => {
      fs.setDirectory(tempDir + '/.opencode/personalities');
      fs.setFile(tempDir + '/.opencode/personalities/to-delete.json', JSON.stringify(mockPersonality));

      await repository.delete('to-delete');
      
      const exists = await fs.exists(tempDir + '/.opencode/personalities/to-delete.json');
      expect(exists).toBe(false);
    });
  });
});
