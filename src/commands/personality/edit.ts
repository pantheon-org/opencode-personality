import { listPersonalities, loadPersonality, savePersonalityFile, mergeWithDefaults } from '../../config.js';
import { loadPluginConfig } from '../../plugin-config.js';
import { resolveScope } from '../../config.js';
import type { PersonalityCommandContext } from './types.js';
import { parseCommandArgs, buildSelectionPrompt, buildEditPrompt, applyFieldUpdate } from './utils.js';

export async function handleEdit(ctx: PersonalityCommandContext): Promise<void> {
  const { args, configResult, output, projectDir, globalConfigDir } = ctx;
  const parsed = parseCommandArgs(args);
  const scope = resolveScope(parsed.flags, configResult);

  const tokens = args.trim().split(/\s+/);
  const nameArg = tokens.length > 1 ? tokens[1] : null;

  const pluginConfig = loadPluginConfig(projectDir, globalConfigDir);
  const available = listPersonalities(projectDir, globalConfigDir);

  const presetName = typeof parsed.flags.preset === 'string' ? parsed.flags.preset : null;
  const editName = nameArg || presetName || pluginConfig.selectedPersonality;

  if (!editName) {
    output.parts.push({
      type: 'text',
      text: `Please specify a personality name to edit.\n\nExamples:\n  /personality edit my-assistant\n  /personality edit --preset my-preset`,
    });
    return;
  }

  const personality = loadPersonality(editName, projectDir, globalConfigDir);
  if (!personality) {
    output.parts.push({
      type: 'text',
      text: `Personality "${editName}" not found.\n\n${buildSelectionPrompt(available, pluginConfig.selectedPersonality)}`,
    });
    return;
  }

  const field = typeof parsed.flags.field === 'string' ? parsed.flags.field : null;
  const value = typeof parsed.flags.value === 'string' ? parsed.flags.value : null;

  if (field && value) {
    const currentConfig = mergeWithDefaults(personality.personality);
    const nextConfig = applyFieldUpdate(currentConfig, field, value);
    savePersonalityFile(editName, nextConfig, scope, projectDir, globalConfigDir);
    output.parts.push({
      type: 'text',
      text: `Updated ${field} in ${editName} (${scope}).`,
    });
    return;
  }

  output.parts.push({
    type: 'text',
    text: buildEditPrompt(editName, scope, personality.personality),
  });
}
