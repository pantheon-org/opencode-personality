import { deletePersonality } from '../../config.js';
import { resolveScope } from '../../config.js';
import { loadPluginConfig, savePluginConfig } from '../../plugin-config.js';
import type { PersonalityCommandContext } from './types.js';
import { parseCommandArgs } from './utils.js';

export async function handleDelete(ctx: PersonalityCommandContext): Promise<void> {
  const { args, configResult, output, projectDir, globalConfigDir } = ctx;
  const parsed = parseCommandArgs(args);
  const scope = resolveScope(parsed.flags, configResult);

  const tokens = args.trim().split(/\s+/);
  const nameArg = tokens.length > 1 ? tokens[1] : null;

  if (!nameArg) {
    output.parts.push({
      type: 'text',
      text: `Please specify a personality name to delete.\n\nExample: /personality delete old-assistant`,
    });
    return;
  }

  const confirmed = parsed.flags.confirm === true;
  if (!confirmed) {
    output.parts.push({
      type: 'text',
      text: `To delete "${nameArg}" from ${scope}, run:\n  /personality delete ${nameArg} --scope ${scope} --confirm`,
    });
    return;
  }

  deletePersonality(nameArg, scope, projectDir, globalConfigDir);

  const pluginConfig = loadPluginConfig(projectDir, globalConfigDir);
  if (pluginConfig.selectedPersonality === nameArg) {
    savePluginConfig({ selectedPersonality: null }, scope, projectDir, globalConfigDir);
  }

  output.parts.push({
    type: 'text',
    text: `Deleted personality: ${nameArg}`,
  });
}
