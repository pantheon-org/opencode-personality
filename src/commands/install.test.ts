import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import fs from 'node:fs';
import path from 'node:path';
import { createTempDir, cleanupTempDir, createMockGlobalConfigDir, createMockProjectDir } from '../test-utils.js';
import { installCommands } from './install.js';
import { getMoodCommandMarkdown } from './mood.js';
import { getPersonalityCommandMarkdown } from './personality.js';

describe('commands/install', () => {
  let tempDir: string;
  let globalConfigDir: string;
  let projectDir: string;

  beforeEach(() => {
    tempDir = createTempDir();
    globalConfigDir = createMockGlobalConfigDir(tempDir);
    projectDir = createMockProjectDir(tempDir);
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  describe('getMoodCommandMarkdown', () => {
    it('should return valid markdown with frontmatter', () => {
      const markdown = getMoodCommandMarkdown();
      expect(markdown).toContain('---');
      expect(markdown).toContain('description:');
      expect(markdown).toContain('setMood');
    });
  });

  describe('getPersonalityCommandMarkdown', () => {
    it('should return valid markdown with frontmatter', () => {
      const markdown = getPersonalityCommandMarkdown();
      expect(markdown).toContain('---');
      expect(markdown).toContain('description:');
      expect(markdown).toContain('personality');
    });
  });

  describe('installCommands', () => {
    it('should create commands directory and install command files for global scope', () => {
      const result = installCommands('global', projectDir, globalConfigDir);

      expect(result.success).toBe(true);
      expect(result.installed).toBe(2);
      expect(result.skipped.length).toBe(0);
      expect(result.errors.length).toBe(0);

      const commandsDir = path.join(globalConfigDir, 'commands');
      expect(fs.existsSync(commandsDir)).toBe(true);
      expect(fs.existsSync(path.join(commandsDir, 'mood.md'))).toBe(true);
      expect(fs.existsSync(path.join(commandsDir, 'personality.md'))).toBe(true);
    });

    it('should create commands directory and install command files for project scope', () => {
      const result = installCommands('project', projectDir, globalConfigDir);

      expect(result.success).toBe(true);
      expect(result.installed).toBe(2);
      expect(result.skipped.length).toBe(0);
      expect(result.errors.length).toBe(0);

      const commandsDir = path.join(projectDir, '.opencode', 'commands');
      expect(fs.existsSync(commandsDir)).toBe(true);
      expect(fs.existsSync(path.join(commandsDir, 'mood.md'))).toBe(true);
      expect(fs.existsSync(path.join(commandsDir, 'personality.md'))).toBe(true);
    });

    it('should skip existing command files and not overwrite them', () => {
      const commandsDir = path.join(globalConfigDir, 'commands');
      fs.mkdirSync(commandsDir, { recursive: true });
      const customContent = '---\ndescription: Custom mood command\n---\nCustom content';
      fs.writeFileSync(path.join(commandsDir, 'mood.md'), customContent, 'utf-8');

      const result = installCommands('global', projectDir, globalConfigDir);

      expect(result.success).toBe(true);
      expect(result.installed).toBe(1); // Only personality installed
      expect(result.skipped).toContain('mood');
      expect(result.errors.length).toBe(0);

      // Verify custom content was not overwritten
      const moodContent = fs.readFileSync(path.join(commandsDir, 'mood.md'), 'utf-8');
      expect(moodContent).toBe(customContent);
    });

    it('should write correct markdown content for mood command', () => {
      installCommands('global', projectDir, globalConfigDir);

      const commandsDir = path.join(globalConfigDir, 'commands');
      const moodContent = fs.readFileSync(path.join(commandsDir, 'mood.md'), 'utf-8');
      
      expect(moodContent).toContain('---');
      expect(moodContent).toContain('description:');
      expect(moodContent).toContain('setMood');
    });

    it('should write correct markdown content for personality command', () => {
      installCommands('project', projectDir, globalConfigDir);

      const commandsDir = path.join(projectDir, '.opencode', 'commands');
      const personalityContent = fs.readFileSync(path.join(commandsDir, 'personality.md'), 'utf-8');
      
      expect(personalityContent).toContain('---');
      expect(personalityContent).toContain('description:');
      expect(personalityContent).toContain('personality');
    });

    it('should handle multiple install calls gracefully (skip all on second run)', () => {
      // First install
      const result1 = installCommands('global', projectDir, globalConfigDir);
      expect(result1.success).toBe(true);
      expect(result1.installed).toBe(2);

      // Second install should skip all
      const result2 = installCommands('global', projectDir, globalConfigDir);
      expect(result2.success).toBe(true);
      expect(result2.installed).toBe(0);
      expect(result2.skipped.length).toBe(2);
      expect(result2.skipped).toContain('mood');
      expect(result2.skipped).toContain('personality');
    });

    it('should create parent directories recursively if needed', () => {
      // Ensure .opencode directory doesn't exist
      const opencodeDir = path.join(projectDir, '.opencode');
      if (fs.existsSync(opencodeDir)) {
        fs.rmSync(opencodeDir, { recursive: true });
      }

      const result = installCommands('project', projectDir, globalConfigDir);

      expect(result.success).toBe(true);
      expect(result.installed).toBe(2);
      expect(fs.existsSync(path.join(projectDir, '.opencode', 'commands'))).toBe(true);
    });
  });
});
