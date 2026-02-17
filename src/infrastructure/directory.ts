import { join } from 'node:path';
import { homedir } from 'node:os';

export const PERSONALITIES_DIR = 'personalities';
export const BACKUPS_DIR = 'backups';

export function getGlobalConfigDir(): string {
  return join(homedir(), '.config', 'opencode');
}

export function getPersonalitiesDir(
  scope: 'global' | 'project',
  projectDir: string,
  globalConfigDir: string,
): string {
  const baseDir = scope === 'global' ? globalConfigDir : join(projectDir, '.opencode');
  return join(baseDir, PERSONALITIES_DIR);
}

export function getBackupsDir(
  scope: 'global' | 'project',
  projectDir: string,
  globalConfigDir: string,
): string {
  const baseDir = scope === 'global' ? globalConfigDir : join(projectDir, '.opencode');
  return join(baseDir, BACKUPS_DIR);
}

export function getConfigPaths(projectDir: string): {
  globalPath: string;
  projectPath: string;
} {
  const globalPath = join(getGlobalConfigDir(), 'personality.json');
  const projectPath = join(projectDir, '.opencode', 'personality.json');
  return { globalPath, projectPath };
}
