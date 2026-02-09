import type { Plugin, PluginInput } from '@opencode-ai/plugin';
import type { CommandOutput } from './types.js';
import {
  loadPersonality,
  resolveMoods,
  loadMoodState,
  mergeWithDefaults,
  listPersonalities,
  migrateOldPersonalityFormat,
  getPersonalitiesDir,
} from './config.js';
import { loadPluginConfig, savePluginConfig } from './plugin-config.js';
import { hasPersonalities, installDefaultPersonalities } from './install-defaults.js';
import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { buildPersonalityPrompt } from './prompt.js';
import { driftMoodWithToast } from './mood.js';
import { createSetMoodTool } from './tools/setMood.js';
import { createSavePersonalityTool } from './tools/savePersonality.js';
import { handleMoodCommand } from './commands/mood.js';
import { handlePersonalityCommand } from './commands/personality.js';

// Mutex for mood state updates to prevent race conditions
let moodStateLock: Promise<void> | null = null;

async function withMoodStateLock<T>(fn: () => Promise<T>): Promise<T> {
  // Wait for any existing lock to release
  while (moodStateLock) {
    await moodStateLock;
  }

  // Acquire lock
  let releaseLock: () => void;
  moodStateLock = new Promise((resolve) => {
    releaseLock = resolve;
  });

  try {
    return await fn();
  } finally {
    // Release lock
    releaseLock!();
    moodStateLock = null;
  }
}

function isCommandOutput(value: unknown): value is CommandOutput {
  if (typeof value !== 'object' || value === null || !('parts' in value)) {
    return false;
  }
  const obj = value as { parts: unknown };
  if (!Array.isArray(obj.parts)) {
    return false;
  }
  // Validate that all parts have the correct shape
  return obj.parts.every(
    (part) =>
      typeof part === 'object' &&
      part !== null &&
      'type' in part &&
      'text' in part &&
      typeof (part as { type: unknown }).type === 'string' &&
      typeof (part as { text: unknown }).text === 'string',
  );
}

// Initialize plugin directories and migration
function initializePlugin(projectDir: string, globalConfigDir: string): void {
  // Ensure global config directory exists
  if (!existsSync(globalConfigDir)) {
    mkdirSync(globalConfigDir, { recursive: true });
  }

  // Ensure personalities directories exist
  const globalPersonalitiesDir = getPersonalitiesDir('global', projectDir, globalConfigDir);
  if (!existsSync(globalPersonalitiesDir)) {
    mkdirSync(globalPersonalitiesDir, { recursive: true });
  }

  const projectPersonalitiesDir = getPersonalitiesDir('project', projectDir, globalConfigDir);
  if (!existsSync(projectPersonalitiesDir)) {
    mkdirSync(projectPersonalitiesDir, { recursive: true });
  }

  // Migrate old personality format if needed
  migrateOldPersonalityFormat('project', projectDir, globalConfigDir);
}

// Get or set selected personality
function getSelectedPersonality(
  projectDir: string,
  globalConfigDir: string,
  available: ReturnType<typeof listPersonalities>,
): string | null {
  let pluginConfig = loadPluginConfig(projectDir, globalConfigDir);

  // If no personality is selected and we have available ones, select the first one
  if (pluginConfig.selectedPersonality === null && available.length > 0) {
    const first = available[0];
    if (first) {
      pluginConfig.selectedPersonality = first.name;
      savePluginConfig(pluginConfig, first.source, projectDir, globalConfigDir);
    }
  }

  return pluginConfig.selectedPersonality;
}

const personalityPlugin: Plugin = async (input: PluginInput) => {
  const { directory: projectDir, client } = input;
  const globalConfigDir = join(Bun.env.HOME || Bun.env.USERPROFILE || '', '.config/opencode');

  // Initialize directories and migrate old format
  initializePlugin(projectDir, globalConfigDir);

  // Install default personalities if none exist
  if (!hasPersonalities(projectDir, globalConfigDir)) {
    installDefaultPersonalities('global', projectDir, globalConfigDir);
  }

  // Get list of available personalities
  const available = listPersonalities(projectDir, globalConfigDir);

  // Get currently selected personality
  const selectedName = getSelectedPersonality(projectDir, globalConfigDir, available);

  // Load selected personality configuration
  const personalityLoadResult = selectedName ? loadPersonality(selectedName, projectDir, globalConfigDir) : null;

  const config = personalityLoadResult?.personality ?? mergeWithDefaults({});
  const selectedSource = personalityLoadResult?.metadata.source ?? 'global';

  // Create tools
  const savePersonalityTool = createSavePersonalityTool(projectDir, globalConfigDir, client);

  // If no personality is selected, only provide personality management commands
  if (!selectedName || !personalityLoadResult) {
    return {
      tool: {
        savePersonality: savePersonalityTool,
      },

      'command.execute.before': async (cmdInput, output) => {
        if (cmdInput.command === 'personality' && isCommandOutput(output)) {
          await handlePersonalityCommand(
            cmdInput.arguments,
            config,
            { config: null, source: 'none' as const, statePath: '', globalPath: '', projectPath: '' },
            output,
            projectDir,
            globalConfigDir,
          );
        }
      },
    };
  }

  const moods = resolveMoods(config);
  const setMoodTool = createSetMoodTool(personalityLoadResult.path, config, moods, client);

  return {
    tool: {
      setMood: setMoodTool,
      savePersonality: savePersonalityTool,
    },

    'command.execute.before': async (cmdInput, output) => {
      if (!isCommandOutput(output)) return;

      if (cmdInput.command === 'personality') {
        await handlePersonalityCommand(
          cmdInput.arguments,
          config,
          {
            config: null,
            source: selectedSource,
            statePath: personalityLoadResult.path,
            globalPath: getPersonalitiesDir('global', projectDir, globalConfigDir),
            projectPath: getPersonalitiesDir('project', projectDir, globalConfigDir),
          },
          output,
          projectDir,
          globalConfigDir,
        );
        return;
      }

      if (cmdInput.command === 'mood') {
        handleMoodCommand(
          cmdInput.arguments,
          personalityLoadResult.path,
          config,
          moods,
          {
            config: null,
            source: selectedSource,
            statePath: personalityLoadResult.path,
            globalPath: getPersonalitiesDir('global', projectDir, globalConfigDir),
            projectPath: getPersonalitiesDir('project', projectDir, globalConfigDir),
          },
          output,
        );
      }
    },

    'experimental.chat.system.transform': async (_hookInput, output) => {
      // Use mutex to prevent race conditions with event hook
      const state = await withMoodStateLock(async () => {
        let currentState = loadMoodState(personalityLoadResult.path, config);

        if (config.mood.enabled) {
          currentState = await driftMoodWithToast(
            personalityLoadResult.path,
            currentState,
            config,
            moods,
            config.mood.seed,
            client,
          );
        }

        return currentState;
      });

      const prompt = buildPersonalityPrompt(config, state.current, moods);
      output.system.push(`<personality>\n${prompt}\n</personality>`);
    },

    event: async ({ event }) => {
      if (event.type === 'message.updated' && config.mood.enabled) {
        const msg = event.properties as { info?: { sessionID?: string; role?: string } };
        if (msg.info?.sessionID && msg.info.role === 'assistant') {
          // Use mutex to prevent race conditions with transform hook
          await withMoodStateLock(async () => {
            const state = loadMoodState(personalityLoadResult.path, config);
            await driftMoodWithToast(personalityLoadResult.path, state, config, moods, config.mood.seed, client);
          });
        }
      }
    },
  };
};

export default personalityPlugin;
