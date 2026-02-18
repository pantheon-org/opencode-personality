import { listPersonalities, loadPersonality, backupPersonality, savePersonalityFile } from '../../config.js';
import { loadPluginConfig, savePluginConfig } from '../../plugin-config.js';
import { validatePersonalityFile, formatValidationErrors } from '../../schema.js';
import { resolveScope } from '../../config.js';
import { existsSync, readFileSync } from 'node:fs';
import type { PersonalityCommandContext } from './types.js';
import { parseCommandArgs, buildSelectionPrompt } from './utils.js';
import { isFailure } from '../../errors/index.js';

export async function handleUse(ctx: PersonalityCommandContext): Promise<void> {
  const { args, configResult, output, projectDir, globalConfigDir } = ctx;
  const parsed = parseCommandArgs(args);
  const scope = resolveScope(parsed.flags, configResult);

  const tokens = args.trim().split(/\s+/);
  const nameArg = tokens.length > 1 ? tokens[1] : null;

  const pluginConfig = loadPluginConfig(projectDir, globalConfigDir);
  const available = listPersonalities(projectDir, globalConfigDir);

  const filePath = typeof parsed.flags.file === 'string' ? parsed.flags.file : null;
  const sub = parsed.subcommand;

  if (filePath && sub === 'switch') {
    if (!existsSync(filePath)) {
      output.parts.push({
        type: 'text',
        text: `File not found: ${filePath}`,
      });
      return;
    }

    try {
      const fileContent = JSON.parse(readFileSync(filePath, 'utf-8')) as any;
      const validation = validatePersonalityFile(fileContent);

      if (!validation.valid) {
        output.parts.push({
          type: 'text',
          text: `Invalid personality file:\n${formatValidationErrors(validation)}`,
        });
        return;
      }

      const importName = nameArg || fileContent.name || 'imported';

      if (parsed.flags.backup === true && pluginConfig.selectedPersonality) {
        const backupName = backupPersonality(pluginConfig.selectedPersonality, scope, projectDir, globalConfigDir);
        if (backupName) {
          output.parts.push({
            type: 'text',
            text: `Backed up current personality to: ${backupName}`,
          });
        }
      }

      const saveResult = savePersonalityFile(importName, fileContent, scope, projectDir, globalConfigDir);
      if (!saveResult.success) {
        output.parts.push({
          type: 'text',
          text: `Failed to save personality: ${saveResult.error.message}`,
        });
        return;
      }
      savePluginConfig({ selectedPersonality: importName }, scope, projectDir, globalConfigDir);

      output.parts.push({
        type: 'text',
        text: `Imported and activated personality: ${importName}\n\n${fileContent.description.slice(0, 100)}...`,
      });
    } catch (error) {
      output.parts.push({
        type: 'text',
        text: `Failed to import personality: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
    return;
  }

  if (!nameArg) {
    output.parts.push({
      type: 'text',
      text: `Please specify a personality name to use.\n\n${buildSelectionPrompt(available, pluginConfig.selectedPersonality)}`,
    });
    return;
  }

  const result = loadPersonality(nameArg, projectDir, globalConfigDir);
  if (isFailure(result)) {
    output.parts.push({
      type: 'text',
      text: `Personality "${nameArg}" not found.\n\n${buildSelectionPrompt(available, pluginConfig.selectedPersonality)}`,
    });
    return;
  }

  const personality = result.data;

  if (parsed.flags.backup === true && pluginConfig.selectedPersonality) {
    const backupName = backupPersonality(pluginConfig.selectedPersonality, scope, projectDir, globalConfigDir);
    if (backupName) {
      output.parts.push({
        type: 'text',
        text: `Backed up current personality to: ${backupName}`,
      });
    }
  }

  savePluginConfig({ selectedPersonality: nameArg }, scope, projectDir, globalConfigDir);

  output.parts.push({
    type: 'text',
    text: `Selected personality: ${nameArg}\n\n${personality.metadata.description.slice(0, 100)}...`,
  });
}
