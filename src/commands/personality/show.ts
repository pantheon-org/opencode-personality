import { listPersonalities, loadPersonality, formatConfigOutput } from '../../config.js';
import { loadPluginConfig } from '../../plugin-config.js';
import { validatePersonalityFile, formatValidationErrors } from '../../schema.js';
import type { PersonalityCommandContext } from './types.js';
import { parseCommandArgs, buildSelectionPrompt } from './utils.js';
import { isFailure } from '../../errors/index.js';

export async function handleShow(ctx: PersonalityCommandContext): Promise<void> {
  const { args, output, projectDir, globalConfigDir } = ctx;
  const parsed = parseCommandArgs(args);

  const tokens = args.trim().split(/\s+/);
  const nameArg = tokens.length > 1 ? tokens[1] : null;

  const pluginConfig = loadPluginConfig(projectDir, globalConfigDir);
  const showName = nameArg || pluginConfig.selectedPersonality;

  if (!showName) {
    output.parts.push({
      type: 'text',
      text: `No personality selected.\n\n${buildSelectionPrompt([], null)}`,
    });
    return;
  }

  const result = loadPersonality(showName, projectDir, globalConfigDir);
  if (isFailure(result)) {
    output.parts.push({
      type: 'text',
      text: `Personality "${showName}" not found. It may have been deleted.\n\n${buildSelectionPrompt([], null)}`,
    });
    return;
  }

  const personality = result.data;
  const validate = parsed.flags.validate === true;
  const lines: string[] = [`Personality: ${showName} (${personality.metadata.source})`];

  if (validate) {
    const validation = validatePersonalityFile(personality.personality);
    lines.push('', 'Validation: ' + (validation.valid ? '✓ Valid' : '✗ Invalid'), formatValidationErrors(validation));
  }

  lines.push('', formatConfigOutput(personality.personality));

  output.parts.push({
    type: 'text',
    text: lines.join('\n'),
  });
}
