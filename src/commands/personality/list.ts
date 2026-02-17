import { listPersonalities, listBackups } from '../../config.js';
import { loadPluginConfig } from '../../plugin-config.js';
import type { PersonalityCommandContext } from './types.js';
import { parseCommandArgs, buildSelectionPrompt } from './utils.js';

export async function handleList(ctx: PersonalityCommandContext): Promise<void> {
  const { args, configResult, output, projectDir, globalConfigDir } = ctx;
  const parsed = parseCommandArgs(args);

  if (parsed.flags.backups === true) {
    const backups = listBackups(projectDir, globalConfigDir);
    if (backups.length === 0) {
      output.parts.push({
        type: 'text',
        text: 'No backups available.',
      });
    } else {
      const lines = ['Available backups:'];
      for (const backup of backups) {
        const scopeLabel = backup.scope === 'project' ? ' (project)' : ' (global)';
        lines.push(`  • ${backup.name}${scopeLabel} - ${backup.createdAt}`);
      }
      lines.push('', `Total: ${backups.length} backup(s)`);
      output.parts.push({
        type: 'text',
        text: lines.join('\n'),
      });
    }
    return;
  }

  const pluginConfig = loadPluginConfig(projectDir, globalConfigDir);
  const available = listPersonalities(projectDir, globalConfigDir);

  output.parts.push({
    type: 'text',
    text: buildSelectionPrompt(available, pluginConfig.selectedPersonality),
  });
}
