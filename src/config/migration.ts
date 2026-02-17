import { join } from 'node:path';
import type { PersonalityFile, ConfigScope } from '../types.js';
import { unlinkSync, existsSync, writeFileSync, readFileSync } from 'node:fs';
import { ensureDir } from '../infrastructure/file-system.js';

export const OLD_PERSONALITY_FILENAME = 'personality.json';

function tryLoadJsonSync<T>(filePath: string): T | null {
  try {
    const raw = readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function migrateOldPersonalityFormat(
  scope: ConfigScope | string,
  projectDir: string,
  globalConfigDir: string,
): boolean {
  const oldPath =
    scope === 'global'
      ? join(globalConfigDir, OLD_PERSONALITY_FILENAME)
      : join(projectDir, '.opencode', OLD_PERSONALITY_FILENAME);

  if (!existsSync(oldPath)) {
    return false;
  }

  const oldConfig = tryLoadJsonSync<PersonalityFile>(oldPath);
  if (!oldConfig) {
    return false;
  }

  const personalityName = oldConfig.name || 'default';

  const personalitiesDir =
    scope === 'global'
      ? join(globalConfigDir, 'personalities')
      : join(projectDir, '.opencode', 'personalities');

  const newPath = join(personalitiesDir, `${personalityName}.json`);

  ensureDir(newPath);
  writeFileSync(newPath, JSON.stringify(oldConfig, null, 2));

  unlinkSync(oldPath);

  return true;
}

export function migrateConfig(config: PersonalityFile): PersonalityFile {
  return config;
}
