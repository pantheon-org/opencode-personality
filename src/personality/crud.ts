import type { PersonalityFile, MoodDefinition, MoodConfig } from '../types.js';
import type { PersonalityRepository } from './repository.js';

export interface CreatePersonalityInput {
  name: string;
  systemPrompt: string;
  description?: string;
  author?: string;
  emoji?: string;
  slangIntensity?: number;
  moods?: MoodDefinition[];
  mood?: MoodConfig;
}

export interface CreatePersonalityResult {
  success: boolean;
  personality?: PersonalityFile;
  error?: string;
}

export interface UpdatePersonalityInput {
  name: string;
  systemPrompt?: string;
  description?: string;
  author?: string;
  emoji?: string;
  slangIntensity?: number;
  moods?: MoodDefinition[];
  mood?: MoodConfig;
}

export interface UpdatePersonalityResult {
  success: boolean;
  personality?: PersonalityFile;
  error?: string;
}

export async function createPersonality(
  input: CreatePersonalityInput,
  repository: PersonalityRepository,
): Promise<CreatePersonalityResult> {
  if (!input.name || input.name.trim().length === 0) {
    return { success: false, error: "Name is required" };
  }

  if (!input.systemPrompt || input.systemPrompt.trim().length === 0) {
    return { success: false, error: "System prompt is required" };
  }

  const exists = await repository.exists(input.name);
  if (exists) {
    return { success: false, error: `Personality '${input.name}' already exists` };
  }

  const personality: PersonalityFile = {
    name: input.name,
    description: input.description || "",
    emoji: input.emoji || "🤖",
    slangIntensity: input.slangIntensity || 0,
    moods: input.moods,
    mood: input.mood ?? { enabled: false, default: 'happy', override: null, drift: 0.2, toast: true },
  } as PersonalityFile;

  await repository.save(input.name, personality);

  return { success: true, personality };
}

export async function updatePersonality(
  input: UpdatePersonalityInput,
  repository: PersonalityRepository,
): Promise<UpdatePersonalityResult> {
  if (!input.name || input.name.trim().length === 0) {
    return { success: false, error: "Name is required" };
  }

  const existing = await repository.findByName(input.name);
  if (!existing) {
    return { success: false, error: `Personality '${input.name}' not found` };
  }

  const personality: PersonalityFile = {
    ...existing.personality,
    description: input.description ?? existing.personality.description,
    emoji: input.emoji ?? existing.personality.emoji,
    slangIntensity: input.slangIntensity ?? existing.personality.slangIntensity,
    moods: input.moods ?? existing.personality.moods,
    mood: input.mood ?? existing.personality.mood,
  } as PersonalityFile;

  await repository.save(input.name, personality);

  return { success: true, personality };
}

export async function deletePersonality(
  name: string,
  repository: PersonalityRepository,
): Promise<{ success: boolean; error?: string }> {
  if (!name || name.trim().length === 0) {
    return { success: false, error: "Name is required" };
  }

  const exists = await repository.exists(name);
  if (!exists) {
    return { success: false, error: `Personality '${name}' not found` };
  }

  await repository.delete(name);

  return { success: true };
}

export async function getPersonality(
  name: string,
  repository: PersonalityRepository,
): Promise<{ success: boolean; personality?: PersonalityFile; error?: string }> {
  if (!name || name.trim().length === 0) {
    return { success: false, error: "Name is required" };
  }

  const result = await repository.findByName(name);
  if (!result) {
    return { success: false, error: `Personality '${name}' not found` };
  }

  return { success: true, personality: result.personality };
}
