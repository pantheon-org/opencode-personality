import { parseCommandArgs as _parseCommandArgs, tokenizeArgs } from '../parser.js';
import type { PersonalityFile, PersonalityMetadata, ParsedCommand } from '../../types.js';
import { resolveScope, mergeWithDefaults } from '../../config.js';
import { parseBoolean, parseNumber } from '../../config.js';

function normalizeToken(token: string): string {
  if ((token.startsWith('"') && token.endsWith('"')) || (token.startsWith("'") && token.endsWith("'"))) {
    return token.slice(1, -1);
  }
  return token;
}

export { tokenizeArgs, normalizeToken };

export function parseCommandArgs(raw: string): ParsedCommand {
  const result = _parseCommandArgs(raw);
  return {
    subcommand: result.subcommand,
    flags: result.flags,
    values: {},
    positional: result.positional,
  };
}

export function buildPersonalityHelp(): string {
  return [
    'Usage:',
    '  /personality list [--backups]              - List all available personalities or backups',
    '  /personality use <name> [--backup]         - Select and activate a personality',
    '  /personality switch <name> [--backup] [--file <path>] - Switch personality (alias for use, supports external files)',
    '  /personality create <name> [--scope global|project] [--preset-only] [--as-preset <name>] - Create new personality',
    '  /personality delete <name> [--scope global|project] - Delete a personality',
    '  /personality edit <name> [--scope global|project] [--field <name> --value <value>] [--preset <name>]',
    '  /personality show [name] [--validate]      - Show personality details (optionally validate)',
    '  /personality restore <name> [--scope global|project] - Restore personality from backup',
    '  /personality reset --scope global|project --confirm',
    '',
    'Fields for --field:',
    '  name, description, emoji, slangIntensity, mood.enabled, mood.default, mood.drift',
  ].join('\n');
}

export function buildSelectionPrompt(available: PersonalityMetadata[], selectedName: string | null): string {
  if (available.length === 0) {
    return `No personalities available.

Create one with: /personality create <name>`;
  }

  const lines = [
    'Available personalities:',
    ...available.map((p) => {
      const indicator = p.name === selectedName ? ' [active]' : '';
      const scope = p.source === 'project' ? ' (project)' : ' (global)';
      return `  • ${p.name}${indicator}${scope} - ${p.description.slice(0, 60)}...`;
    }),
    '',
    selectedName
      ? `Currently using: ${selectedName}`
      : 'No personality selected. Use /personality use <name> to select one.',
  ];

  return lines.join('\n');
}

export function buildCreatePrompt(name: string, scope: string): string {
  return `Creating new personality "${name}" (scope: ${scope}).

Please help define this personality by collecting the following information:

1. **Description** (required): Describe the personality in detail. This shapes how the assistant behaves.
2. **Emoji usage**: Should the assistant use emojis? (yes/no)
3. **Slang intensity**: How much slang? (0=none, 0.5=moderate, 1=heavy)
4. **Mood system**: Should mood drift over time? (yes/no)
   - If yes, what is the default mood name?

Once you have gathered all information, use the \`savePersonality\` tool with:
- name: "${name}"
- scope: "${scope}"
- config: { personality configuration }

Start by asking the user to describe the personality.`;
}

export function buildEditPrompt(name: string, scope: string, currentConfig: PersonalityFile): string {
  return `Editing personality "${name}" (scope: ${scope}).

Current configuration:
\`\`\`json
${JSON.stringify(currentConfig, null, 2)}
\`\`\`

What would you like to change? Fields you can modify:
- description, emoji usage, slang intensity
- mood settings (enabled, default mood, drift amount)

Use the \`savePersonality\` tool to save changes with:
- name: "${name}"
- scope: "${scope}"
- config: { updated configuration }`;
}

export function applyFieldUpdate(config: PersonalityFile, field: string, value: string): PersonalityFile {
  const trimmed = value.trim();
  if (!trimmed) return config;

  switch (field) {
    case 'name':
      return { ...config, name: trimmed };
    case 'description':
      return { ...config, description: trimmed };
    case 'emoji': {
      if (!trimmed) return config;
      return { ...config, emoji: trimmed };
    }
    case 'slangIntensity': {
      const parsed = parseNumber(trimmed);
      if (parsed === null) return config;
      return { ...config, slangIntensity: parsed };
    }
    case 'mood.enabled': {
      const parsed = parseBoolean(trimmed);
      if (parsed === null) return config;
      return { ...config, mood: { ...config.mood, enabled: parsed } };
    }
    case 'mood.default':
      return { ...config, mood: { ...config.mood, default: trimmed } };
    case 'mood.drift': {
      const parsed = parseNumber(trimmed);
      if (parsed === null) return config;
      return { ...config, mood: { ...config.mood, drift: parsed } };
    }
    default:
      return config;
  }
}

function parseNumberLocal(value: string): number | null {
  const num = Number(value);
  return isNaN(num) ? null : num;
}

function parseBooleanLocal(value: string): boolean | null {
  const lower = value.toLowerCase();
  if (lower === 'true' || lower === 'yes' || lower === '1') return true;
  if (lower === 'false' || lower === 'no' || lower === '0') return false;
  return null;
}
