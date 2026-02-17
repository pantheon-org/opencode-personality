import { savePersonalityFile } from '../../config.js';
import { resolveScope } from '../../config.js';
import type { PersonalityFile, PersonalityCommandContext } from './types.js';
import { parseCommandArgs, buildCreatePrompt } from './utils.js';

export async function handleCreate(ctx: PersonalityCommandContext): Promise<void> {
  const { args, configResult, output, projectDir, globalConfigDir } = ctx;
  const parsed = parseCommandArgs(args);
  const scope = resolveScope(parsed.flags, configResult);

  const tokens = args.trim().split(/\s+/);
  const nameArg = tokens.length > 1 ? tokens[1] : null;

  if (!nameArg) {
    output.parts.push({
      type: 'text',
      text: `Please specify a name for the new personality.\n\nExample: /personality create my-assistant`,
    });
    return;
  }

  const asPreset = typeof parsed.flags['as-preset'] === 'string' ? parsed.flags['as-preset'] : null;
  const presetName = asPreset || nameArg;

  if (parsed.flags['preset-only'] === true) {
    const template: PersonalityFile = {
      name: presetName,
      description: `Personality preset: ${presetName}`,
      emoji: '🤖',
      slangIntensity: 0.5,
      mood: { enabled: false, default: 'happy', drift: 0.2, override: null, toast: true },
    };

    savePersonalityFile(presetName, template, scope, projectDir, globalConfigDir);

    output.parts.push({
      type: 'text',
      text: `Created personality preset "${presetName}" (${scope}) without activating.\n\nUse '/personality switch ${presetName}' to activate it.`,
    });
    return;
  }

  if (asPreset) {
    if (parsed.flags.activate === true) {
      output.parts.push({
        type: 'text',
        text:
          buildCreatePrompt(nameArg, scope) +
          `\n\nNote: This will be saved as preset "${asPreset}" and activated automatically.`,
      });
    } else {
      const template: PersonalityFile = {
        name: asPreset,
        description: `Personality preset: ${asPreset}`,
        emoji: '🤖',
        slangIntensity: 0.5,
        mood: { enabled: false, default: 'happy', drift: 0.2, override: null, toast: true },
      };

      savePersonalityFile(asPreset, template, scope, projectDir, globalConfigDir);

      output.parts.push({
        type: 'text',
        text: `Created personality preset "${asPreset}" (${scope}) without activating.\n\nUse '/personality switch ${asPreset}' to activate it.`,
      });
    }
    return;
  }

  output.parts.push({
    type: 'text',
    text: buildCreatePrompt(nameArg, scope),
  });
}
