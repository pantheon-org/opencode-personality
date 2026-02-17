import type { MoodState, MoodDefinition, PersonalityFile, MoodName, PluginClient } from '../types.js';
import { saveJson, defaultFileSystem } from '../infrastructure/file-system.js';
import type { FileSystem } from '../infrastructure/file-system.js';
import { dirname } from 'node:path';

export function scoreToMood(score: number, moods: MoodDefinition[]): MoodName {
  if (!Number.isFinite(score)) {
    throw new Error(`Invalid mood score: ${score}. Score must be a finite number.`);
  }

  if (moods.length === 0) return 'happy';

  const sorted = [...moods].sort((a, b) => a.score - b.score);
  const firstMood = sorted[0];
  if (!firstMood) {
    throw new Error('Unexpected error: sorted moods array is empty');
  }
  let closest = firstMood;
  let bestDistance = Math.abs(score - closest.score);

  for (const mood of sorted.slice(1)) {
    const distance = Math.abs(score - mood.score);
    if (distance < bestDistance) {
      closest = mood;
      bestDistance = distance;
    }
  }

  return closest.name;
}

export function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

export function driftMood(
  state: MoodState,
  config: PersonalityFile,
  moods: MoodDefinition[],
  seed?: number,
): MoodState {
  if (!Number.isFinite(state.score)) {
    throw new Error(`Invalid state.score: ${state.score}. Score must be a finite number.`);
  }

  if (!Number.isFinite(config.mood.drift) || config.mood.drift < 0 || config.mood.drift > 1) {
    throw new Error(`Invalid mood.drift: ${config.mood.drift}. Drift must be between 0 and 1.`);
  }

  if (seed !== undefined && !Number.isFinite(seed)) {
    throw new Error(`Invalid seed: ${seed}. Seed must be a finite number.`);
  }

  if (moods.length === 0) {
    throw new Error('Cannot drift mood: moods array is empty');
  }

  if (state.override && (!state.overrideExpiry || Date.now() < state.overrideExpiry)) {
    return { ...state, current: state.override, lastUpdate: Date.now() };
  }

  const baseState =
    state.overrideExpiry && Date.now() >= state.overrideExpiry
      ? { ...state, override: null, overrideExpiry: null }
      : state;

  const random = seed !== undefined ? seededRandom(seed + baseState.lastUpdate) : Math.random();
  const driftAmount = (random - 0.5) * 2 * config.mood.drift;
  const minScore = Math.min(...moods.map((mood) => mood.score));
  const maxScore = Math.max(...moods.map((mood) => mood.score));
  const newScore = Math.max(minScore, Math.min(maxScore, baseState.score + driftAmount));

  return {
    ...baseState,
    score: newScore,
    current: scoreToMood(newScore, moods),
    lastUpdate: Date.now(),
  };
}

export async function driftMoodWithToast(
  statePath: string,
  state: MoodState,
  config: PersonalityFile,
  moods: MoodDefinition[],
  seed: number | undefined,
  client: PluginClient,
): Promise<MoodState> {
  const previousMood = state.current;
  const nextState = driftMood(state, config, moods, seed);

  try {
    const dir = dirname(statePath);
    if (!(await defaultFileSystem.exists(dir))) {
      await defaultFileSystem.mkdir(dir, { recursive: true });
    }
    await saveMoodStateToFile(statePath, state, nextState);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Failed to save mood state: ${errorMessage}`);
  }

  if (nextState.current !== previousMood && config.mood.toast) {
    await client.tui.showToast({
      body: {
        title: 'Mood shifted',
        message: `${previousMood} → ${nextState.current}`,
        variant: 'info',
      },
    });
  }

  return nextState;
}

async function saveMoodStateToFile(statePath: string, currentState: MoodState, newState: MoodState): Promise<void> {
  const existing = await defaultFileSystem.exists(statePath);
  if (!existing) {
    return;
  }
  const content = await defaultFileSystem.readFile(statePath, 'utf-8');
  const parsed = JSON.parse(content);
  const file = { ...parsed, state: newState };
  await defaultFileSystem.writeFile(statePath, JSON.stringify(file, null, 2), 'utf-8');
}

export function resolveMoodHint(mood: MoodName, moods: MoodDefinition[]): string {
  const match = moods.find((item) => item.name === mood);
  return match?.hint ?? 'Use a tone that matches the current mood.';
}

export class MoodStateManager {
  constructor(
    private statePath: string,
    private config: PersonalityFile,
    private fs: FileSystem = defaultFileSystem,
  ) {}

  async getCurrentState(): Promise<MoodState> {
    const content = await this.fs.readFile(this.statePath, 'utf-8');
    const parsed = JSON.parse(content);
    const moods = this.config.moods || [];
    const defaultMood = this.config.mood.default || 'happy';

    if (parsed.state) {
      return normalizeState(parsed.state, defaultMood, moods);
    }

    return normalizeState(
      {
        current: defaultMood as MoodName,
        score: 0,
        lastUpdate: Date.now(),
        override: this.config.mood.override,
        overrideExpiry: null,
      },
      defaultMood,
      moods,
    );
  }

  async updateState(update: Partial<MoodState>): Promise<void> {
    const current = await this.getCurrentState();
    const updated = { ...current, ...update, lastUpdate: Date.now() };

    const dir = dirname(this.statePath);
    if (!(await this.fs.exists(dir))) {
      await this.fs.mkdir(dir, { recursive: true });
    }

    const existing = await this.fs.exists(this.statePath)
      ? JSON.parse(await this.fs.readFile(this.statePath, 'utf-8'))
      : {};
    const file = { ...existing, state: updated };
    await this.fs.writeFile(this.statePath, JSON.stringify(file, null, 2), 'utf-8');
  }
}

function normalizeState(state: MoodState, defaultMood: string, moods: MoodDefinition[]): MoodState {
  const moodNames = new Set(moods.map((item) => item.name));
  const normalized: MoodState = { ...state };

  const validDefaultMood = moodNames.has(defaultMood)
    ? defaultMood
    : (moods[0]?.name ?? 'happy');

  if (!moodNames.has(normalized.current)) {
    normalized.current = validDefaultMood;
  }

  if (normalized.override && !moodNames.has(normalized.override)) {
    normalized.override = null;
  }

  if (Number.isNaN(normalized.score)) {
    normalized.score = moods.find(m => m.name === normalized.current)?.score ?? 0;
  }

  return normalized;
}

export function createMoodStateManager(
  statePath: string,
  config: PersonalityFile,
  fs?: FileSystem,
): MoodStateManager {
  return new MoodStateManager(statePath, config, fs);
}
