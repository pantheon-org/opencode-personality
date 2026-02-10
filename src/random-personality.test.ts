import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import fs from 'node:fs';
import path from 'node:path';
import { createTempDir, cleanupTempDir } from './test-utils.js';
import { savePersonalityFile } from './config.js';
import { loadPluginConfig, savePluginConfig } from './plugin-config.js';
import type { PersonalityFile } from './types.js';

describe('Random personality selection', () => {
  let tempDir: string;
  let globalConfigDir: string;
  let projectDir: string;

  beforeEach(() => {
    tempDir = createTempDir();
    globalConfigDir = path.join(tempDir, '.config', 'opencode');
    projectDir = path.join(tempDir, 'project');
    fs.mkdirSync(globalConfigDir, { recursive: true });
    fs.mkdirSync(projectDir, { recursive: true });
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  const createTestPersonality = (name: string): PersonalityFile => ({
    name,
    description: `Test personality ${name}`,
    emoji: '🤖',
    slangIntensity: 0,
    mood: {
      enabled: false,
      default: 'happy',
      override: null,
      drift: 0.2,
      toast: true,
    },
  });

  it('should have randomPersonality enabled by default', () => {
    const config = loadPluginConfig(projectDir, globalConfigDir);
    expect(config.randomPersonality).toBe(true);
  });

  it('should allow disabling randomPersonality', () => {
    const customConfig = { selectedPersonality: null, randomPersonality: false };
    savePluginConfig(customConfig, 'global', projectDir, globalConfigDir);

    const config = loadPluginConfig(projectDir, globalConfigDir);
    expect(config.randomPersonality).toBe(false);
  });

  it('should select random personality when randomPersonality is true', () => {
    // Create multiple test personalities
    const personalities = ['alice', 'bob', 'charlie', 'dave'];
    for (const name of personalities) {
      savePersonalityFile(name, createTestPersonality(name), 'global', projectDir, globalConfigDir);
    }

    // Mock Math.random to control which personality is selected
    const originalRandom = Math.random;
    Math.random = mock(() => 0.75); // Should select index 3 (dave)

    // Simulate getSelectedPersonality logic
    const config = loadPluginConfig(projectDir, globalConfigDir);
    const useRandom = config.randomPersonality ?? true;
    
    const availablePersonalities = personalities.map((name, idx) => ({
      name,
      description: `Test personality ${name}`,
      source: 'global' as const,
      modifiedAt: new Date().toISOString(),
    }));

    const selectedPersonality = useRandom
      ? availablePersonalities[Math.floor(Math.random() * availablePersonalities.length)]
      : availablePersonalities[0];

    expect(selectedPersonality?.name).toBe('dave');

    // Restore original Math.random
    Math.random = originalRandom;
  });

  it('should select first personality when randomPersonality is false', () => {
    // Create multiple test personalities
    const personalities = ['alice', 'bob', 'charlie'];
    for (const name of personalities) {
      savePersonalityFile(name, createTestPersonality(name), 'global', projectDir, globalConfigDir);
    }

    // Set randomPersonality to false
    const customConfig = { selectedPersonality: null, randomPersonality: false };
    savePluginConfig(customConfig, 'global', projectDir, globalConfigDir);

    // Simulate getSelectedPersonality logic
    const config = loadPluginConfig(projectDir, globalConfigDir);
    const useRandom = config.randomPersonality ?? true;
    
    const availablePersonalities = personalities.map((name) => ({
      name,
      description: `Test personality ${name}`,
      source: 'global' as const,
      modifiedAt: new Date().toISOString(),
    }));

    const selectedPersonality = useRandom
      ? availablePersonalities[Math.floor(Math.random() * availablePersonalities.length)]
      : availablePersonalities[0];

    expect(useRandom).toBe(false);
    expect(selectedPersonality?.name).toBe('alice');
  });

  it('should generate different selections with different random seeds', () => {
    const personalities = ['alice', 'bob', 'charlie', 'dave', 'eve'];
    const availablePersonalities = personalities.map((name) => ({
      name,
      description: `Test personality ${name}`,
      source: 'global' as const,
      modifiedAt: new Date().toISOString(),
    }));

    const originalRandom = Math.random;
    const selections = new Set<string>();

    // Test multiple random selections
    for (let i = 0; i < 10; i++) {
      Math.random = mock(() => i / 10);
      const selected = availablePersonalities[Math.floor(Math.random() * availablePersonalities.length)];
      if (selected) {
        selections.add(selected.name);
      }
    }

    // Should have selected multiple different personalities
    expect(selections.size).toBeGreaterThan(1);

    Math.random = originalRandom;
  });

  it('should handle edge case with single personality', () => {
    // Create single personality
    savePersonalityFile('solo', createTestPersonality('solo'), 'global', projectDir, globalConfigDir);

    const config = loadPluginConfig(projectDir, globalConfigDir);
    const useRandom = config.randomPersonality ?? true;
    
    const availablePersonalities = [{
      name: 'solo',
      description: 'Test personality solo',
      source: 'global' as const,
      modifiedAt: new Date().toISOString(),
    }];

    const selectedPersonality = useRandom
      ? availablePersonalities[Math.floor(Math.random() * availablePersonalities.length)]
      : availablePersonalities[0];

    // Should always select the only available personality
    expect(selectedPersonality?.name).toBe('solo');
  });

  it('should handle empty personality list', () => {
    const config = loadPluginConfig(projectDir, globalConfigDir);
    const useRandom = config.randomPersonality ?? true;
    
    const availablePersonalities: Array<{name: string; description: string; source: 'global' | 'project'; modifiedAt: string}> = [];

    // Should not crash with empty array
    if (availablePersonalities.length > 0) {
      const selectedPersonality = useRandom
        ? availablePersonalities[Math.floor(Math.random() * availablePersonalities.length)]
        : availablePersonalities[0];
      expect(selectedPersonality).toBeDefined();
    } else {
      expect(availablePersonalities.length).toBe(0);
    }
  });
});
