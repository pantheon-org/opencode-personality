import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import fs from 'node:fs';
import path from 'node:path';
import { createTempDir, cleanupTempDir, createMockGlobalConfigDir, createMockProjectDir } from './test-utils.js';
import { detectPluginLoadScope } from './index.js';

describe('detectPluginLoadScope', () => {
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

  it('should return "global" when project opencode.json does not exist', async () => {
    const result = await detectPluginLoadScope(projectDir, globalConfigDir);
    expect(result).toBe('global');
  });

  it('should return "global" when project opencode.json exists but has no plugins', async () => {
    const projectConfigPath = path.join(projectDir, '.opencode', 'opencode.json');
    fs.mkdirSync(path.dirname(projectConfigPath), { recursive: true });
    fs.writeFileSync(projectConfigPath, JSON.stringify({}));

    const result = await detectPluginLoadScope(projectDir, globalConfigDir);
    expect(result).toBe('global');
  });

  it('should return "global" when project opencode.json has plugins but not opencode-personality', async () => {
    const projectConfigPath = path.join(projectDir, '.opencode', 'opencode.json');
    fs.mkdirSync(path.dirname(projectConfigPath), { recursive: true });
    fs.writeFileSync(projectConfigPath, JSON.stringify({
      plugin: ['some-other-plugin', '@another/plugin']
    }));

    const result = await detectPluginLoadScope(projectDir, globalConfigDir);
    expect(result).toBe('global');
  });

  it('should return "project" when project opencode.json contains opencode-personality plugin', async () => {
    const projectConfigPath = path.join(projectDir, '.opencode', 'opencode.json');
    fs.mkdirSync(path.dirname(projectConfigPath), { recursive: true });
    fs.writeFileSync(projectConfigPath, JSON.stringify({
      plugin: [
        'some-other-plugin',
        'file:///path/to/opencode-personality',
        '@another/plugin'
      ]
    }));

    const result = await detectPluginLoadScope(projectDir, globalConfigDir);
    expect(result).toBe('project');
  });

  it('should return "project" when project opencode.json contains opencode-personality npm package', async () => {
    const projectConfigPath = path.join(projectDir, '.opencode', 'opencode.json');
    fs.mkdirSync(path.dirname(projectConfigPath), { recursive: true });
    fs.writeFileSync(projectConfigPath, JSON.stringify({
      plugin: [
        '@pantheon-org/opencode-personality@latest'
      ]
    }));

    const result = await detectPluginLoadScope(projectDir, globalConfigDir);
    expect(result).toBe('project');
  });

  it('should return "global" when project opencode.json has invalid JSON', async () => {
    const projectConfigPath = path.join(projectDir, '.opencode', 'opencode.json');
    fs.mkdirSync(path.dirname(projectConfigPath), { recursive: true });
    fs.writeFileSync(projectConfigPath, 'invalid json {]');

    const result = await detectPluginLoadScope(projectDir, globalConfigDir);
    expect(result).toBe('global');
  });

  it('should return "global" when project opencode.json has non-array plugins field', async () => {
    const projectConfigPath = path.join(projectDir, '.opencode', 'opencode.json');
    fs.mkdirSync(path.dirname(projectConfigPath), { recursive: true });
    fs.writeFileSync(projectConfigPath, JSON.stringify({
      plugin: 'not-an-array'
    }));

    const result = await detectPluginLoadScope(projectDir, globalConfigDir);
    expect(result).toBe('global');
  });

  it('should return "global" when project opencode.json has non-string entries in plugins array', async () => {
    const projectConfigPath = path.join(projectDir, '.opencode', 'opencode.json');
    fs.mkdirSync(path.dirname(projectConfigPath), { recursive: true });
    fs.writeFileSync(projectConfigPath, JSON.stringify({
      plugin: [123, { name: 'plugin' }, null]
    }));

    const result = await detectPluginLoadScope(projectDir, globalConfigDir);
    expect(result).toBe('global');
  });
});
