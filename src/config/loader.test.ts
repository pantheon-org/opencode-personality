import { describe, it, expect, beforeEach } from 'bun:test';
import path from 'node:path';
import { InMemoryFileSystem } from '../infrastructure/memory-file-system.js';
import { FileSystemConfigLoader } from './loader.js';

describe('config/loader', () => {
  let fs: InMemoryFileSystem;

  beforeEach(() => {
    fs = new InMemoryFileSystem();
  });

  describe('FileSystemConfigLoader', () => {
    it('should return null config when no config exists', async () => {
      const loader = new FileSystemConfigLoader(fs);
      const result = await loader.load('/nonexistent/project');
      expect(result.config).toBeNull();
      expect(result.source).toBe('none');
    });

    it('should load config from project directory', async () => {
      const projectDir = '/test/project';
      const configDir = path.join(projectDir, '.opencode');
      const configPath = path.join(configDir, 'personality.json');
      
      fs.setFile(configPath, JSON.stringify({
        name: 'Test Personality',
        description: 'A test personality',
        emoji: '🤖',
        slangIntensity: 0.5,
        mood: { enabled: true, default: 'happy', drift: 0.1, toast: true }
      }));

      const loader = new FileSystemConfigLoader(fs);
      const result = await loader.load(projectDir);
      expect(result.config).not.toBeNull();
      expect(result.config?.name).toBe('Test Personality');
      expect(result.config?.emoji).toBe('🤖');
      expect(result.source).toBe('project');
    });

    it('should prefer project config over global', async () => {
      const projectDir = '/test/project';
      const globalConfigPath = path.join('/test/.config/opencode', 'personality.json');
      const projectConfigPath = path.join(projectDir, '.opencode', 'personality.json');
      
      fs.setFile(globalConfigPath, JSON.stringify({ name: 'Global Personality', emoji: '🌍' }));
      fs.setFile(projectConfigPath, JSON.stringify({ name: 'Project Personality', emoji: '📁' }));

      const loader = new FileSystemConfigLoader(fs);
      const result = await loader.load(projectDir);
      expect(result.config?.name).toBe('Project Personality');
    });

    it('should handle missing config gracefully', async () => {
      const loader = new FileSystemConfigLoader(fs);
      const result = await loader.load('/nonexistent/path');
      expect(result.config).toBeNull();
      expect(result.source).toBe('none');
    });
  });
});
