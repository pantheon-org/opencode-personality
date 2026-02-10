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
import { loadPluginConfig, savePluginConfig, ensurePluginConfig } from './plugin-config.js';
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

/**
 * Detects whether the plugin was loaded from the project or global config.
 * 
 * Strategy: Check if the project-level opencode.json exists and contains
 * a reference to this plugin. If so, assume project-level load.
 * 
 * @param projectDir - The project directory
 * @param _globalConfigDir - The global config directory (unused but kept for API consistency)
 * @returns 'project' if loaded from project config, 'global' otherwise
 */
export async function detectPluginLoadScope(projectDir: string, _globalConfigDir: string): Promise<'project' | 'global'> {
  const projectConfigPath = join(projectDir, '.opencode', 'opencode.json');
  
  if (!existsSync(projectConfigPath)) {
    return 'global';
  }
  
  try {
    const projectConfigContent = Bun.file(projectConfigPath);
    const projectConfig = await projectConfigContent.json();
    
    // Check if plugin array exists and contains our plugin
    const plugins = projectConfig.plugin || [];
    if (!Array.isArray(plugins)) {
      return 'global';
    }
    
    // Check if any plugin entry references opencode-personality
    const hasOurPlugin = plugins.some((p: unknown) => {
      if (typeof p !== 'string') return false;
      return p.includes('opencode-personality');
    });
    
    return hasOurPlugin ? 'project' : 'global';
  } catch {
    // If we can't read or parse the config, assume global
    return 'global';
  }
}

// Initialize plugin directories and migration
function initializePlugin(
  projectDir: string,
  globalConfigDir: string,
  loadScope: 'global' | 'project'
): void {
  // Ensure global config directory exists
  if (!existsSync(globalConfigDir)) {
    mkdirSync(globalConfigDir, { recursive: true });
  }

  // Ensure personalities directories exist
  const globalPersonalitiesDir = getPersonalitiesDir('global', projectDir, globalConfigDir);
  if (!existsSync(globalPersonalitiesDir)) {
    try {
      mkdirSync(globalPersonalitiesDir, { recursive: true });
    } catch (error) {
      throw new Error(
        `Failed to create global personalities directory ${globalPersonalitiesDir}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  const projectPersonalitiesDir = getPersonalitiesDir('project', projectDir, globalConfigDir);
  if (!existsSync(projectPersonalitiesDir)) {
    try {
      mkdirSync(projectPersonalitiesDir, { recursive: true });
    } catch (error) {
      throw new Error(
        `Failed to create project personalities directory ${projectPersonalitiesDir}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  // Ensure plugin config file exists at the detected scope
  ensurePluginConfig(loadScope, projectDir, globalConfigDir);

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

  // If no personality is selected and we have available ones, select one
  if (pluginConfig.selectedPersonality === null && available.length > 0) {
    // Use random selection if enabled (default: true)
    const useRandom = pluginConfig.randomPersonality ?? true;
    const selectedPersonality = useRandom
      ? available[Math.floor(Math.random() * available.length)]
      : available[0];
    
    if (selectedPersonality) {
      pluginConfig.selectedPersonality = selectedPersonality.name;
      savePluginConfig(pluginConfig, selectedPersonality.source, projectDir, globalConfigDir);
    }
  }

  return pluginConfig.selectedPersonality;
}

const personalityPlugin: Plugin = async (input: PluginInput) => {
  const { directory: projectDir, client } = input;
  const globalConfigDir = join(process.env.HOME || process.env.USERPROFILE || '', '.config/opencode');

  await client.app.log({ body: { service: 'personality-plugin', level: 'info', message: 'Plugin initializing...' } });
  await client.app.log({ body: { service: 'personality-plugin', level: 'info', message: `Project dir: ${projectDir}` } });
  await client.app.log({ body: { service: 'personality-plugin', level: 'info', message: `Global config dir: ${globalConfigDir}` } });

  // Detect whether plugin was loaded from project or global config
  const loadScope = await detectPluginLoadScope(projectDir, globalConfigDir);
  await client.app.log({ body: { service: 'personality-plugin', level: 'info', message: `Load scope detected: ${loadScope}` } });

  // Initialize directories and migrate old format
  initializePlugin(projectDir, globalConfigDir, loadScope);
  await client.app.log({ body: { service: 'personality-plugin', level: 'info', message: 'Plugin initialized' } });

  // Install default personalities if none exist (to the detected scope)
  const hasPersons = hasPersonalities(projectDir, globalConfigDir);
  await client.app.log({ body: { service: 'personality-plugin', level: 'info', message: `Has personalities: ${hasPersons}` } });
  if (!hasPersons) {
    await client.app.log({ body: { service: 'personality-plugin', level: 'info', message: `Installing default personalities to ${loadScope}...` } });
    const installResult = installDefaultPersonalities(loadScope, projectDir, globalConfigDir);
    if (installResult.success) {
      await client.app.log({ body: { service: 'personality-plugin', level: 'info', message: `Default personalities installed: ${installResult.installed} personalities` } });
      
      // Verify installation by checking if personalities are now available
      const verifyAvailable = listPersonalities(projectDir, globalConfigDir);
      await client.app.log({ body: { service: 'personality-plugin', level: 'info', message: `Verification: ${verifyAvailable.length} personalities available after installation` } });
      if (verifyAvailable.length !== installResult.installed) {
        await client.app.log({ body: { service: 'personality-plugin', level: 'warn', message: `Warning: Expected ${installResult.installed} but found ${verifyAvailable.length} personalities` } });
      }
    } else {
      await client.app.log({ body: { service: 'personality-plugin', level: 'error', message: `Failed to install some personalities: ${installResult.errors.map(e => `${e.name}: ${e.error}`).join(', ')}` } });
      if (installResult.installed > 0) {
        await client.app.log({ body: { service: 'personality-plugin', level: 'info', message: `Successfully installed: ${installResult.installed} personalities` } });
        
        // Verify partial installation
        const verifyAvailable = listPersonalities(projectDir, globalConfigDir);
        await client.app.log({ body: { service: 'personality-plugin', level: 'info', message: `Verification: ${verifyAvailable.length} personalities available after partial installation` } });
      }
    }
  }

  // Get list of available personalities
  const available = listPersonalities(projectDir, globalConfigDir);
  await client.app.log({ body: { service: 'personality-plugin', level: 'info', message: `Available personalities: ${available.map(p => p.name).join(', ')}` } });

  // Get currently selected personality
  const selectedName = getSelectedPersonality(projectDir, globalConfigDir, available);
  await client.app.log({ body: { service: 'personality-plugin', level: 'info', message: `Selected personality: ${selectedName ?? 'none'}` } });

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
