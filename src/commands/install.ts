import type { CommandInstallResult, ConfigScope } from '../types.js';
import { getMoodCommandMarkdown } from './mood.js';
import { getPersonalityCommandMarkdown } from './personality/index.js';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Get the commands directory path for a given scope
 * @param scope - 'global' or 'project'
 * @param projectDir - Project directory path
 * @param globalConfigDir - Global config directory path
 * @returns Full path to commands directory
 */
function getCommandsDir(scope: ConfigScope, projectDir: string, globalConfigDir: string): string {
  if (scope === 'global') {
    return join(globalConfigDir, 'commands');
  }
  return join(projectDir, '.opencode', 'commands');
}

/**
 * Install command markdown files to the appropriate directory
 * @param scope - Target scope (global or project)
 * @param projectDir - Project directory path
 * @param globalConfigDir - Global config directory path
 * @returns Installation result with success status and details
 */
export function installCommands(
  scope: ConfigScope,
  projectDir: string,
  globalConfigDir: string,
): CommandInstallResult {
  const result: CommandInstallResult = {
    success: true,
    installed: 0,
    skipped: [],
    errors: [],
  };

  try {
    const commandsDir = getCommandsDir(scope, projectDir, globalConfigDir);

    // Create commands directory if it doesn't exist
    if (!existsSync(commandsDir)) {
      try {
        mkdirSync(commandsDir, { recursive: true });
      } catch (error) {
        result.success = false;
        result.errors.push({
          name: 'commands-directory',
          error: `Failed to create commands directory: ${error instanceof Error ? error.message : String(error)}`,
        });
        return result;
      }
    }

    // Define commands to install
    const commands = [
      { name: 'mood', filename: 'mood.md', content: getMoodCommandMarkdown() },
      { name: 'personality', filename: 'personality.md', content: getPersonalityCommandMarkdown() },
    ];

    // Install each command file
    for (const command of commands) {
      const filePath = join(commandsDir, command.filename);

      // Skip if file already exists (preserve user customizations)
      if (existsSync(filePath)) {
        result.skipped.push(command.name);
        continue;
      }

      // Write command file
      try {
        writeFileSync(filePath, command.content, 'utf-8');
        result.installed++;
      } catch (error) {
        result.success = false;
        result.errors.push({
          name: command.name,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  } catch (error) {
    result.success = false;
    result.errors.push({
      name: 'install-commands',
      error: `Unexpected error during command installation: ${error instanceof Error ? error.message : String(error)}`,
    });
  }

  return result;
}
