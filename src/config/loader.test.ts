import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import fs from 'node:fs';
import path from 'node:path';
import { createTempDir, cleanupTempDir } from '../test-utils.js';
import { FileSystemConfigLoader } from './loader.js';

describe('config/loader', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir();
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  describe('FileSystemConfigLoader', () => {
    it('should return null config when no config exists', async () => {
      const loader = new FileSystemConfigLoader();
      const result = await loader.load(tempDir);
      expect(result.config).toBeNull();
      expect(result.source).toBe('none');
    });

    it('should load config from project directory', async () => {
      const configDir = path.join(tempDir, '.opencode');
      fs.mkdirSync(configDir, { recursive: true });
      const configPath = path.join(configDir, 'personality.json');
      fs.writeFileSync(configPath, JSON.stringify({
        name: 'Test Personality',
        description: 'A test personality',
        emoji: '🤖',
        slangIntensity: 0.5,
        mood: { enabled: true, default: 'happy', drift: 0.1, toast: true }
      }));

      const loader = new FileSystemConfigLoader();
      const result = await loader.load(tempDir);
      expect(result.config).not.toBeNull();
      expect(result.config?.name).toBe('Test Personality');
      expect(result.config?.emoji).toBe('🤖');
      expect(result.source).toBe('project');
    });

    it('should prefer project config over global', async () => {
      const globalConfigPath = path.join(tempDir, '.config', 'opencode', 'personality.json');
      fs.mkdirSync(path.dirname(globalConfigPath), { recursive: true });
      fs.writeFileSync(globalConfigPath, JSON.stringify({ name: 'Global Personality', emoji: '🌍' }));

      const projectConfigDir = path.join(tempDir, '.opencode');
      fs.mkdirSync(projectConfigDir, { recursive: true });
      const projectConfigPath = path.join(projectConfigDir, 'personality.json');
      fs.writeFileSync(projectConfigPath, JSON.stringify({ name: 'Project Personality', emoji: '📁' }));

      const loader = new FileSystemConfigLoader();
      const result = await loader.load(tempDir);
      expect(result.config?.name).toBe('Project Personality');
    });

    it('should handle missing config gracefully', async () => {
      const loader = new FileSystemConfigLoader();
      const result = await loader.load('/nonexistent/path');
      expect(result.config).toBeNull();
      expect(result.source).toBe('none');
    });
  });
});
