import type { PersonalityFile, MoodDefinition, ConfigResult, CommandOutput } from '../types.js';
import { loadMoodState, saveMoodState } from '../config.js';
import { isFailure } from '../errors/index.js';

/**
 * Generate markdown content for the /mood command
 * @returns Markdown content with frontmatter
 */
export function getMoodCommandMarkdown(): string {
  return `---
description: Set the assistant's mood [mood: bored, angry, lethargic] [duration: message, session, permanent]
---

Call the setMood tool to set the mood to the mood and duration requested by the user. If the duration is not mentioned assume session.`;
}

export function handleMoodCommand(
  args: string,
  statePath: string,
  config: PersonalityFile,
  moods: MoodDefinition[],
  configResult: ConfigResult,
  output: CommandOutput,
): void {
  const trimmed = args.trim().toLowerCase();
  const moodStateResult = loadMoodState(statePath, config);

  if (isFailure(moodStateResult)) {
    output.parts.push({
      type: 'text',
      text: `Error loading mood state: ${moodStateResult.error.message}`,
    });
    return;
  }

  const state = moodStateResult.data;

  if (!trimmed || trimmed === 'status') {
    output.parts.push({
      type: 'text',
      text: `Current mood: **${state.current}** (score: ${state.score.toFixed(2)})${state.override ? ` [override: ${state.override}]` : ''}\nConfig source: ${configResult.source}`,
    });
    return;
  }

  if (!moods.some((item) => item.name === trimmed)) {
    output.parts.push({
      type: 'text',
      text: `Invalid mood. Choose from: ${moods.map((item) => item.name).join(', ')}`,
    });
    return;
  }

  state.override = trimmed;
  state.current = trimmed;
  state.overrideExpiry = null;

  const saveResult = saveMoodState(statePath, state);
  if (isFailure(saveResult)) {
    output.parts.push({
      type: 'text',
      text: `Error saving mood state: ${saveResult.error.message}`,
    });
    return;
  }

  output.parts.push({
    type: 'text',
    text: `Mood set to **${trimmed}**`,
  });
}
