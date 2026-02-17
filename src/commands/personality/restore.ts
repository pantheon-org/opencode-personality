import { restorePersonality } from '../../config.js';
import { resolveScope } from '../../config.js';
import type { PersonalityCommandContext } from './types.js';
import { parseCommandArgs } from './utils.js';

export async function handleRestore(ctx: PersonalityCommandContext): Promise<void> {
  const { args, configResult, output, projectDir, globalConfigDir } = ctx;
  const parsed = parseCommandArgs(args);
  const scope = resolveScope(parsed.flags, configResult);

  const tokens = args.trim().split(/\s+/);
  const nameArg = tokens.length > 1 ? tokens[1] : null;

  if (!nameArg) {
    output.parts.push({
      type: 'text',
      text: `Please specify a backup name to restore.\n\nExample: /personality restore my-assistant-backup-1234567890`,
    });
    return;
  }

  const result = restorePersonality(nameArg, scope, projectDir, globalConfigDir);
  if (result.success) {
    output.parts.push({
      type: 'text',
      text: `Restored personality "${result.name}" from backup "${nameArg}" (${scope}).`,
    });
  } else {
    output.parts.push({
      type: 'text',
      text: `Failed to restore: ${result.error}`,
    });
  }
}
