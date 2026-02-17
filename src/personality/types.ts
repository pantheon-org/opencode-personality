import type { PersonalityFile } from '../types.js';

export interface PersonalityMetadata {
  name: string;
  description: string;
  source: 'global' | 'project';
  modifiedAt: string;
  author?: string;
}

export interface PersonalityLoadResult {
  personality: PersonalityFile;
  metadata: PersonalityMetadata;
  path: string;
}

export interface SaveResult {
  success: boolean;
  path?: string;
  error?: string;
}

export interface DeleteResult {
  success: boolean;
  error?: string;
}

export interface BackupMetadata {
  name: string;
  scope: 'global' | 'project';
  createdAt: string;
}

export type { PersonalityFile };
