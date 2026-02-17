import { listPersonalities, deletePersonality } from '../../config.js';
import { resolveScope } from '../../config.js';
import type { PersonalityCommandContext } from './types.js';
import { parseCommandArgs } from './utils.js';

export async function handleReset(ctx: PersonalityCommandContext): Promise<void> {
  const { args, configResult, output, projectDir, globalConfigDir } = ctx;
  const parsed = parseCommandArgs(args);
  const scope = resolveScope(parsed.flags, configResult);

  const confirmed = parsed.flags.confirm === true;

  if (!confirmed) {
    output.parts.push({
      type: 'text',
      text: `To reset all personality configs for ${scope}, run:\n  /personality reset --scope ${scope} --confirm`,
    });
    return;
  }

  const available = listPersonalities(projectDir, globalConfigDir);
  const scopePersonalities = available.filter((p) => p.source === scope);

  for (const p of scopePersonalities) {
    deletePersonality(p.name, scope, projectDir, globalConfigDir);
  }

  output.parts.push({
    type: 'text',
    text: `Reset ${scopePersonalities.length} personalities for ${scope}.`,
  });
}
