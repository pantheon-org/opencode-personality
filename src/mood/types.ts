import type { MoodDefinition } from '../types.js';

export type { MoodState, MoodDefinition, MoodName } from '../types.js';

export interface MoodStateOptions {
  statePath: string;
  config: {
    moods: MoodDefinition[];
    mood: {
      default: string;
      override: string | null;
    };
  };
}
