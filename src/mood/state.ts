import { dirname } from 'node:path';
import type { PersonalityFile, MoodState, MoodDefinition, MoodName } from '../types.js';
import { tryLoadJson, saveJson, ensureDir, defaultFileSystem } from '../infrastructure/file-system.js';
import type { FileSystem } from '../infrastructure/file-system.js';
import { DEFAULT_MOODS, DEFAULT_MOOD_CONFIG } from '../config/defaults.js';

export interface MoodStateRepository {
  load(): Promise<MoodState>;
  save(state: MoodState): Promise<void>;
}

export class FileSystemMoodStateRepository implements MoodStateRepository {
  constructor(
    private statePath: string,
    private config: PersonalityFile,
    private fs: FileSystem = defaultFileSystem,
  ) {}

  async load(): Promise<MoodState> {
    const file = await tryLoadJson<PersonalityFile>(this.statePath, this.fs);
    const moods = this.config.moods || DEFAULT_MOODS;
    const defaultMood = resolveDefaultMood(this.config.mood.default, moods);

    if (file?.state) {
      const normalized = normalizeState(file.state, defaultMood, moods);
      return normalized;
    }

    return normalizeState(
      {
        current: defaultMood,
        score: resolveMoodScore(defaultMood, moods),
        lastUpdate: Date.now(),
        override: this.config.mood.override,
        overrideExpiry: null,
      },
      defaultMood,
      moods,
    );
  }

  async save(state: MoodState): Promise<void> {
    const dir = dirname(this.statePath);
    if (!(await this.fs.exists(dir))) {
      await this.fs.mkdir(dir, { recursive: true });
    }

    const existing = await tryLoadJson<PersonalityFile>(this.statePath, this.fs);
    if (!existing) {
      return;
    }
    const file: PersonalityFile = { ...existing, state };

    await saveJson(this.statePath, file, this.fs);
  }
}

export function resolveMoodScore(mood: MoodName, moods: MoodDefinition[]): number {
  const match = moods.find((item) => item.name === mood);
  return match?.score ?? 0;
}

export function resolveDefaultMood(configDefault: string, moods: MoodDefinition[]): MoodName {
  const byName = moods.find((mood) => mood.name === configDefault);
  if (byName) return byName.name as MoodName;
  if (moods.length === 0) return DEFAULT_MOOD_CONFIG.default as MoodName;
  const firstMood = moods[0];
  if (!firstMood) return DEFAULT_MOOD_CONFIG.default as MoodName;
  return firstMood.name as MoodName;
}

export function normalizeState(state: MoodState, defaultMood: MoodName, moods: MoodDefinition[]): MoodState {
  const moodNames = new Set(moods.map((item) => item.name));
  const normalized: MoodState = { ...state };

  const validDefaultMood = moodNames.has(defaultMood)
    ? defaultMood
    : (moods[0]?.name ?? DEFAULT_MOOD_CONFIG.default) as MoodName;

  if (!moodNames.has(normalized.current)) {
    normalized.current = validDefaultMood;
  }

  if (normalized.override && !moodNames.has(normalized.override)) {
    normalized.override = null;
  }

  if (Number.isNaN(normalized.score)) {
    normalized.score = resolveMoodScore(normalized.current, moods);
  }

  return normalized;
}

export function createMoodStateRepository(
  statePath: string,
  config: PersonalityFile,
  fs?: FileSystem,
): MoodStateRepository {
  return new FileSystemMoodStateRepository(statePath, config, fs);
}
