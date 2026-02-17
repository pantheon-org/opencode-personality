import type { PersonalityFile, ConfigResult, MoodConfig, MoodDefinition, ConfigScope } from '../types.js';
import { DEFAULT_MOOD_CONFIG, DEFAULT_MOODS } from './defaults.js';
import { getConfigPaths, getPersonalitiesDir } from '../infrastructure/directory.js';
import type { FileSystem } from '../infrastructure/file-system.js';
import { tryLoadJson, defaultFileSystem } from '../infrastructure/file-system.js';

export interface ConfigLoader {
  load(projectDir: string): Promise<ConfigResult>;
}

export class FileSystemConfigLoader implements ConfigLoader {
  constructor(private fs: FileSystem = defaultFileSystem) {}

  async load(projectDir: string): Promise<ConfigResult> {
    const { globalPath, projectPath } = getConfigPaths(projectDir);

    const [globalFile, projectFile] = await Promise.all([
      tryLoadJson<Partial<PersonalityFile>>(globalPath, this.fs),
      tryLoadJson<Partial<PersonalityFile>>(projectPath, this.fs),
    ]);

    const hasGlobal = globalFile !== null;
    const hasProject = projectFile !== null;

    if (!hasGlobal && !hasProject) {
      return { config: null, source: 'none', statePath: '', globalPath, projectPath };
    }

    let merged: PersonalityFile = this.getDefaults();

    if (hasGlobal) {
      merged = this.deepMerge(merged, globalFile);
      if (globalFile.mood) {
        merged.mood = this.deepMerge(DEFAULT_MOOD_CONFIG, globalFile.mood);
      }
    }

    if (hasProject) {
      merged = this.deepMerge(merged, projectFile);
      if (projectFile.mood) {
        merged.mood = this.deepMerge(merged.mood, projectFile.mood);
      }
    }

    const source = hasGlobal && hasProject ? 'both' : hasProject ? 'project' : 'global';
    const statePath = hasProject ? projectPath : globalPath;

    return { config: merged, source, statePath, globalPath, projectPath };
  }

  private getDefaults(): PersonalityFile {
    return {
      name: '',
      description: '',
      emoji: '🤖',
      slangIntensity: 0,
      moods: DEFAULT_MOODS,
      mood: { ...DEFAULT_MOOD_CONFIG },
    };
  }

  private deepMerge<T extends Record<string, unknown>>(target: T, source: Partial<T>): T {
    const result = { ...target };
    for (const key of Object.keys(source) as (keyof T)[]) {
      const sourceVal = source[key];
      const targetVal = target[key];
      if (
        sourceVal !== undefined &&
        typeof sourceVal === 'object' &&
        sourceVal !== null &&
        !Array.isArray(sourceVal) &&
        typeof targetVal === 'object' &&
        targetVal !== null &&
        !Array.isArray(targetVal)
      ) {
        result[key] = this.deepMerge(targetVal as Record<string, unknown>, sourceVal as Record<string, unknown>) as T[keyof T];
      } else if (sourceVal !== undefined) {
        result[key] = sourceVal as T[keyof T];
      }
    }
    return result;
  }
}

export async function loadConfigWithPrecedence(projectDir: string): Promise<ConfigResult> {
  const loader = new FileSystemConfigLoader();
  return loader.load(projectDir);
}

export function mergeWithDefaults(partial: Partial<PersonalityFile>): PersonalityFile {
  let merged: PersonalityFile = {
    name: '',
    description: '',
    emoji: '🤖',
    slangIntensity: 0,
    moods: DEFAULT_MOODS,
    mood: { ...DEFAULT_MOOD_CONFIG },
  };

  merged = deepMerge(merged, partial);
  if (partial.mood) {
    merged.mood = deepMerge(merged.mood, partial.mood);
  }
  return merged;
}

function deepMerge<T extends Record<string, unknown>>(target: T, source: Partial<T>): T {
  const result = { ...target };
  for (const key of Object.keys(source) as (keyof T)[]) {
    const sourceVal = source[key];
    const targetVal = target[key];
    if (
      sourceVal !== undefined &&
      typeof sourceVal === 'object' &&
      sourceVal !== null &&
      !Array.isArray(sourceVal) &&
      typeof targetVal === 'object' &&
      targetVal !== null &&
      !Array.isArray(targetVal)
    ) {
      result[key] = deepMerge(targetVal as Record<string, unknown>, sourceVal as Record<string, unknown>) as T[keyof T];
    } else if (sourceVal !== undefined) {
      result[key] = sourceVal as T[keyof T];
    }
  }
  return result;
}

export function resolveMoods(config: PersonalityFile): MoodDefinition[] {
  if (config.moods && config.moods.length > 0) return config.moods;
  return DEFAULT_MOODS;
}

export type MoodName = 'bored' | 'angry' | 'disappointed' | 'happy' | 'ecstatic';

export function resolveDefaultMood(config: PersonalityFile, moods: MoodDefinition[]): MoodName {
  const byName = moods.find((mood) => mood.name === config.mood.default);
  if (byName) return byName.name as MoodName;
  if (moods.length === 0) return DEFAULT_MOOD_CONFIG.default as MoodName;
  const firstMood = moods[0];
  if (!firstMood) return DEFAULT_MOOD_CONFIG.default as MoodName;
  return firstMood.name as MoodName;
}

export function resolveScope(flags: Record<string, string | boolean>, configResult: ConfigResult): ConfigScope {
  const scopeFlag = typeof flags.scope === 'string' ? flags.scope.toLowerCase() : null;
  if (scopeFlag === 'global' || scopeFlag === 'project') {
    return scopeFlag;
  }

  if (configResult.projectPath) return 'project';
  if (configResult.globalPath) return 'global';
  return 'project';
}

export function resolveScopePath(scope: ConfigScope, configResult: ConfigResult): string {
  return scope === 'project' ? configResult.projectPath : configResult.globalPath;
}
