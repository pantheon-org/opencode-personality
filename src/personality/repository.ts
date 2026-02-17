import { join } from 'node:path';
import type { PersonalityFile } from '../types.js';
import type { PersonalityMetadata, PersonalityLoadResult } from './types.js';
import { tryLoadJson, saveJson, ensureDir, defaultFileSystem } from '../infrastructure/file-system.js';
import type { FileSystem } from '../infrastructure/file-system.js';
import { getPersonalitiesDir, getBackupsDir } from '../infrastructure/directory.js';
import { validatePersonalityFile, formatValidationErrors } from '../schema.js';

export interface PersonalityRepository {
  findByName(name: string): Promise<PersonalityLoadResult | null>;
  findAll(): Promise<PersonalityMetadata[]>;
  save(name: string, personality: PersonalityFile): Promise<void>;
  delete(name: string): Promise<void>;
  exists(name: string): Promise<boolean>;
  backup(name: string): Promise<string | null>;
  listBackups(): Promise<Array<{ name: string; scope: 'global' | 'project'; createdAt: string }>>;
  restore(backupName: string): Promise<{ success: boolean; name?: string; error?: string }>;
}

export class FileSystemPersonalityRepository implements PersonalityRepository {
  constructor(
    private projectDir: string,
    private globalConfigDir: string,
    private scope: 'global' | 'project' = 'project',
    private fs: FileSystem = defaultFileSystem,
  ) {}

  private get directory(): string {
    return getPersonalitiesDir(this.scope, this.projectDir, this.globalConfigDir);
  }

  async findByName(name: string): Promise<PersonalityLoadResult | null> {
    const path = join(this.directory, `${name}.json`);

    if (!(await this.fs.exists(path))) {
      return null;
    }

    const content = await tryLoadJson<PersonalityFile>(path, this.fs);
    if (!content) {
      return null;
    }

    const validation = validatePersonalityFile(content);
    if (!validation.valid || !validation.data) {
      const errorDetails = formatValidationErrors(validation);
      throw new Error(
        `Invalid personality file at ${path}:\n${errorDetails}\n\n` +
          `Please fix the validation errors above or run '/personality select' to choose a different personality.`,
      );
    }

    const validatedData = validation.data as PersonalityFile;
    const stats = await this.fs.stat(path);

    return {
      personality: validatedData,
      metadata: {
        name,
        description: validatedData.description || '',
        source: this.scope,
        modifiedAt: stats.mtime.toISOString(),
      },
      path,
    };
  }

  async findAll(): Promise<PersonalityMetadata[]> {
    const personalities: Map<string, PersonalityMetadata> = new Map();

    const dirs = [
      getPersonalitiesDir('global', this.projectDir, this.globalConfigDir),
      getPersonalitiesDir('project', this.projectDir, this.globalConfigDir),
    ];

    for (const dir of dirs) {
      const scope = dir.includes('.opencode') ? 'project' : 'global';
      if (!(await this.fs.exists(dir))) continue;

      const files = await this.fs.readdir(dir);
      for (const file of files) {
        if (!file.endsWith('.json')) continue;

        const name = file.slice(0, -5);
        const filePath = join(dir, file);
        const content = await tryLoadJson<PersonalityFile>(filePath, this.fs);

        if (content) {
          const stats = await this.fs.stat(filePath);
          const existing = personalities.get(name);

          if (!existing || (scope === 'project' && existing.source === 'global')) {
            personalities.set(name, {
              name,
              description: content.description || '',
              source: scope,
              modifiedAt: stats.mtime.toISOString(),
            });
          }
        }
      }
    }

    return Array.from(personalities.values());
  }

  async save(name: string, personality: PersonalityFile): Promise<void> {
    const path = join(this.directory, `${name}.json`);

    const existing = await tryLoadJson<PersonalityFile>(path, this.fs);
    const fileContent: PersonalityFile = existing?.state ? { ...personality, state: existing.state } : personality;

    const validation = validatePersonalityFile(fileContent);
    if (!validation.valid) {
      const errorMessage = formatValidationErrors(validation);
      throw new Error(`Validation failed for personality "${name}":\n${errorMessage}`);
    }

    await ensureDir(path, this.fs);
    await saveJson(path, fileContent, this.fs);
  }

  async delete(name: string): Promise<void> {
    const path = join(this.directory, `${name}.json`);

    if (await this.fs.exists(path)) {
      await this.fs.unlink(path);
    }
  }

  async exists(name: string): Promise<boolean> {
    const path = join(this.directory, `${name}.json`);
    return this.fs.exists(path);
  }

  async backup(name: string): Promise<string | null> {
    const personality = await this.findByName(name);
    if (!personality) {
      return null;
    }

    const backupsDir = getBackupsDir(this.scope, this.projectDir, this.globalConfigDir);
    const timestamp = Date.now();
    const backupName = `${name}-backup-${timestamp}`;
    const backupPath = join(backupsDir, `${backupName}.json`);

    await ensureDir(backupPath, this.fs);
    await saveJson(backupPath, personality.personality, this.fs);

    return backupName;
  }

  async listBackups(): Promise<Array<{ name: string; scope: 'global' | 'project'; createdAt: string }>> {
    const backups: Array<{ name: string; scope: 'global' | 'project'; createdAt: string }> = [];

    const dirs = [
      { dir: getBackupsDir('global', this.projectDir, this.globalConfigDir), scope: 'global' as const },
      { dir: getBackupsDir('project', this.projectDir, this.globalConfigDir), scope: 'project' as const },
    ];

    for (const { dir, scope } of dirs) {
      if (!(await this.fs.exists(dir))) continue;

      const files = await this.fs.readdir(dir);
      for (const file of files) {
        if (!file.endsWith('.json')) continue;

        const name = file.slice(0, -5);
        const filePath = join(dir, file);
        const stats = await this.fs.stat(filePath);

        backups.push({
          name,
          scope,
          createdAt: stats.mtime.toISOString(),
        });
      }
    }

    return backups;
  }

  async restore(backupName: string): Promise<{ success: boolean; name?: string; error?: string }> {
    const backupsDir = getBackupsDir(this.scope, this.projectDir, this.globalConfigDir);
    const backupPath = join(backupsDir, `${backupName}.json`);

    if (!(await this.fs.exists(backupPath))) {
      return { success: false, error: `Backup "${backupName}" not found in ${this.scope} scope` };
    }

    const content = await tryLoadJson<PersonalityFile>(backupPath, this.fs);
    if (!content) {
      return { success: false, error: `Failed to read backup file "${backupName}"` };
    }

    const match = backupName.match(/^(.+)-backup-\d+$/);
    const personalityName = (match && match[1]) || backupName;

    await this.save(personalityName, content);

    return { success: true, name: personalityName };
  }
}

export function createPersonalityRepository(
  projectDir: string,
  globalConfigDir: string,
  scope: 'global' | 'project' = 'project',
): PersonalityRepository {
  return new FileSystemPersonalityRepository(projectDir, globalConfigDir, scope);
}
