import { tool } from '@opencode-ai/plugin';
import type { PersonalityFile, MoodDefinition, PluginClient, MoodDuration } from '../types.js';
import { loadMoodState, saveMoodState } from '../config.js';
import { isFailure } from '../errors/index.js';

export function createSetMoodTool(
  statePath: string,
  config: PersonalityFile,
  moods: MoodDefinition[],
  client: PluginClient,
) {
  return tool({
    description: "Set the assistant's current mood",
    args: {
      mood: tool.schema.string().describe('The mood to set'),
      duration: tool.schema
        .enum(['message', 'session', 'permanent'])
        .optional()
        .describe(
          'How long the override lasts: message (next response only), session (until session ends), permanent (persists across sessions)',
        ),
    },
    async execute(args) {
      const moodLoadResult = loadMoodState(statePath, config);

      if (isFailure(moodLoadResult)) {
        return `Error loading mood state: ${moodLoadResult.error.message}`;
      }

      const state = moodLoadResult.data;

      if (!moods.some((item) => item.name === args.mood)) {
        return `Invalid mood. Choose from: ${moods.map((item) => item.name).join(', ')}`;
      }

      // Validate duration if provided
      const validDurations: MoodDuration[] = ['message', 'session', 'permanent'];
      const duration = (args.duration as MoodDuration) ?? 'session';
      if (args.duration !== undefined && !validDurations.includes(duration)) {
        return `Invalid duration. Choose from: ${validDurations.join(', ')}`;
      }

      state.override = args.mood;
      state.current = args.mood;

      // Set expiry based on duration
      if (duration === 'message') {
        state.overrideExpiry = Date.now() + 1;
      } else if (duration === 'session') {
        state.overrideExpiry = null; // Session-scoped (no expiry in state file)
      } else if (duration === 'permanent') {
        state.overrideExpiry = null; // Permanent persists in state file
      }

      const saveResult = saveMoodState(statePath, state);
      if (isFailure(saveResult)) {
        return `Error saving mood state: ${saveResult.error.message}`;
      }

      await client.app.log({
        body: {
          service: 'personality-plugin',
          level: 'info',
          message: `Mood set to ${args.mood} (duration: ${duration})`,
        },
      });

      return `Mood changed to ${args.mood} (duration: ${duration})`;
    },
  });
}
