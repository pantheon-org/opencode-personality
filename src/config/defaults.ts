import type { MoodConfig, MoodDefinition } from '../types.js';

export const DEFAULT_MOOD_CONFIG: MoodConfig = {
  enabled: false,
  default: 'happy',
  override: null,
  drift: 0.2,
  toast: true,
};

export const DEFAULT_MOODS: MoodDefinition[] = [
  {
    name: 'bored',
    hint: 'Your responses should feel slightly disinterested, using shorter sentences and occasional sighs.',
    score: -2,
  },
  {
    name: 'angry',
    hint: 'Your responses should have an edge - terse, direct, maybe a bit snippy.',
    score: -1,
  },
  {
    name: 'disappointed',
    hint: 'Your responses should feel a bit deflated, with lowered expectations.',
    score: 0,
  },
  {
    name: 'happy',
    hint: 'Your responses should be warm, engaged, and positive.',
    score: 1,
  },
  {
    name: 'ecstatic',
    hint: 'Your responses should be enthusiastic, excited, with lots of energy!',
    score: 2,
  },
];
