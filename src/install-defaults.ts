import type { ConfigScope } from './types.js';
import { listPersonalities, savePersonalityFile } from './config.js';
import { DEFAULT_PERSONALITIES } from './defaults/index.js';

/**
 * Check if any personalities exist (in either project or global scope).
 */
export function hasPersonalities(projectDir: string, globalConfigDir: string): boolean {
  const personalities = listPersonalities(projectDir, globalConfigDir);
  return personalities.length > 0;
}

/**
 * Install default personalities from TypeScript definitions.
 * Only installs personalities that don't already exist.
 * @returns Object with success status, count of installed personalities, and any errors
 */
export function installDefaultPersonalities(
  scope: ConfigScope,
  projectDir: string,
  globalConfigDir: string,
): { success: boolean; installed: number; errors: Array<{ name: string; error: string }> } {
  const result = {
    success: true,
    installed: 0,
    errors: [] as Array<{ name: string; error: string }>,
  };

  try {
    const existing = listPersonalities(projectDir, globalConfigDir);
    const existingNames = new Set(existing.map((p) => p.name));

    for (const { filename, config } of DEFAULT_PERSONALITIES) {
      // Only install if personality with this name doesn't already exist
      if (!existingNames.has(filename)) {
        try {
          savePersonalityFile(filename, config, scope, projectDir, globalConfigDir);
          result.installed++;
        } catch (error) {
          result.success = false;
          result.errors.push({
            name: filename,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }
  } catch (error) {
    result.success = false;
    result.errors.push({
      name: 'installation',
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return result;
}
