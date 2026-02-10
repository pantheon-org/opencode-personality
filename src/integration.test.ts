import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { existsSync, mkdirSync, rmSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ensurePluginConfig } from './plugin-config.js';
import { installDefaultPersonalities } from './install-defaults.js';
import { loadConfigWithPrecedence } from './config.js';

describe('Plugin Initialization Integration', () => {
  const testDir = join(process.cwd(), '.opencode-test');
  const globalDir = join(testDir, 'global');
  const projectDir = join(testDir, 'project');

  beforeEach(() => {
    // Clean up any existing test directories
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
    mkdirSync(testDir, { recursive: true });
    mkdirSync(globalDir, { recursive: true });
    mkdirSync(projectDir, { recursive: true });
  });

  afterEach(() => {
    // Clean up test directories
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('should complete full initialization flow', () => {
    // 1. Ensure plugin config is created
    const config = ensurePluginConfig('project', projectDir, globalDir);
    expect(config).toBeDefined();
    expect(config.selectedPersonality).toBeNull();
    expect(config.randomPersonality).toBe(true);

    // 2. Verify config file was created
    const configPath = join(projectDir, '.opencode', 'personality.json');
    expect(existsSync(configPath)).toBe(true);

    // 3. Install default personalities
    const result = installDefaultPersonalities('project', projectDir, globalDir);
    expect(result.success).toBe(true);
    expect(result.installed).toBe(12);
    expect(result.errors).toHaveLength(0);

    // 4. Verify personalities directory exists and contains files
    const personalitiesDir = join(projectDir, '.opencode', 'personalities');
    expect(existsSync(personalitiesDir)).toBe(true);

    const files = readdirSync(personalitiesDir).filter((f) => f.endsWith('.json'));
    expect(files).toHaveLength(12);

    // 5. Verify all personality files have valid structure
    let validFiles = 0;
    for (const file of files) {
      const content = JSON.parse(readFileSync(join(personalitiesDir, file), 'utf-8'));
      if (content.name && content.moods && Array.isArray(content.moods) && content.mood) {
        validFiles++;
      }
    }
    expect(validFiles).toBe(12);

    // 6. Verify no duplicates were created
    const uniqueNames = new Set(
      files.map((f) => {
        const content = JSON.parse(readFileSync(join(personalitiesDir, f), 'utf-8'));
        return content.name;
      }),
    );
    expect(uniqueNames.size).toBe(12);

  });

  it('should not duplicate personalities on second install', () => {
    // First install
    installDefaultPersonalities('project', projectDir, globalDir);

    const personalitiesDir = join(projectDir, '.opencode', 'personalities');
    const filesAfterFirst = readdirSync(personalitiesDir).filter((f) => f.endsWith('.json'));
    expect(filesAfterFirst).toHaveLength(12);

    // Second install should not add duplicates
    const result = installDefaultPersonalities('project', projectDir, globalDir);
    expect(result.installed).toBe(0); // No new personalities installed

    const filesAfterSecond = readdirSync(personalitiesDir).filter((f) => f.endsWith('.json'));
    expect(filesAfterSecond).toHaveLength(12); // Still 12 files
  });

  it('should handle project scope correctly', () => {
    // Create config at project scope
    ensurePluginConfig('project', projectDir, globalDir);

    const projectConfigPath = join(projectDir, '.opencode', 'personality.json');
    expect(existsSync(projectConfigPath)).toBe(true);

    // Install personalities at project scope
    installDefaultPersonalities('project', projectDir, globalDir);

    const projectPersonalitiesDir = join(projectDir, '.opencode', 'personalities');
    expect(existsSync(projectPersonalitiesDir)).toBe(true);

    const files = readdirSync(projectPersonalitiesDir).filter((f) => f.endsWith('.json'));
    expect(files).toHaveLength(12);
  });

  it('should handle global scope correctly', () => {
    // Create config at global scope
    ensurePluginConfig('global', projectDir, globalDir);

    const globalConfigPath = join(globalDir, 'personality.json');
    expect(existsSync(globalConfigPath)).toBe(true);

    // Install personalities at global scope
    installDefaultPersonalities('global', projectDir, globalDir);

    const globalPersonalitiesDir = join(globalDir, 'personalities');
    expect(existsSync(globalPersonalitiesDir)).toBe(true);

    const files = readdirSync(globalPersonalitiesDir).filter((f) => f.endsWith('.json'));
    expect(files).toHaveLength(12);
  });
});
