import type { ParsedCommand } from '../types.js';

export interface FlagDefinition {
  name: string;
  alias?: string;
  type: 'string' | 'boolean' | 'number';
  required?: boolean;
  description?: string;
}

export interface ParserOptions {
  flags?: FlagDefinition[];
  allowSubcommand?: boolean;
  subcommands?: string[];
}

export interface ParseResult {
  subcommand: string | null;
  flags: Record<string, string | boolean | number>;
  positional: string[];
  errors: string[];
}

function normalizeToken(token: string): string {
  if ((token.startsWith('"') && token.endsWith('"')) || (token.startsWith("'") && token.endsWith("'"))) {
    return token.slice(1, -1);
  }
  return token;
}

export function tokenizeArgs(raw: string): string[] {
  const tokens = raw.match(/"[^"]*"|'[^']*'|\S+/g);
  if (!tokens) return [];
  return tokens.map((token) => normalizeToken(token));
}

function parseValue(value: string, type: 'string' | 'number'): string | number | boolean {
  if (type === 'number') {
    const num = Number(value);
    return isNaN(num) ? value : num;
  }
  return value;
}

function isFlag(token: string): boolean {
  return token.startsWith('--') || token.startsWith('-');
}

function extractFlagName(token: string): { name: string; value: string | boolean } {
  let flagName = token.replace(/^-+/, '');
  let flagValue: string | boolean = true;

  if (flagName.includes('=')) {
    const eqIndex = flagName.indexOf('=');
    const namePart = flagName.slice(0, eqIndex);
    flagValue = flagName.slice(eqIndex + 1);
    flagName = namePart;
  }

  return { name: flagName, value: flagValue };
}

function isPositionalArg(token: string): boolean {
  return !token.startsWith('--') && !token.startsWith('-') && !token.includes('=');
}

function buildFlagMap(flagDefs: FlagDefinition[]): Map<string, FlagDefinition> {
  const map = new Map<string, FlagDefinition>();
  for (const flag of flagDefs) {
    map.set(flag.name, flag);
    if (flag.alias) {
      map.set(flag.alias, flag);
    }
  }
  return map;
}

function processFlagToken(
  token: string,
  tokens: string[],
  index: number,
  flagMap: Map<string, FlagDefinition>,
  flagDefs: FlagDefinition[],
  flags: Record<string, string | boolean | number>,
): number {
  const { name: flagName, value: flagValue } = extractFlagName(token);
  let finalValue = flagValue;

  const flagDef = flagDefs.find((f) => f.name === flagName || f.alias === flagName);

  if (flagValue === true && index + 1 < tokens.length) {
    const next = tokens[index + 1];
    const canBeValue = next && isPositionalArg(next);
    const wantsValue = !flagDef || flagDef.type !== 'boolean';

    if (canBeValue && wantsValue) {
      finalValue = next;
      index += 1;
    }
  }

  if (flagDef) {
    flags[flagDef.name] = flagDef.type === 'boolean' ? true : parseValue(String(finalValue), flagDef.type);
  } else {
    flags[flagName] = finalValue;
  }

  return index;
}

function processKeyValueToken(token: string, flags: Record<string, string | boolean | number>): void {
  const eqIndex = token.indexOf('=');
  if (eqIndex > 0) {
    const key = token.slice(0, eqIndex);
    const value = token.slice(eqIndex + 1);
    flags[key] = value;
  }
}

export function parseCommand(raw: string, options: ParserOptions = {}): ParseResult {
  const tokens = tokenizeArgs(raw.trim());
  const flags: Record<string, string | boolean | number> = {};
  const positional: string[] = [];
  const errors: string[] = [];
  let subcommand: string | null = null;
  let stopFlagParsing = false;

  const flagDefs = options.flags || [];
  const flagMap = buildFlagMap(flagDefs);
  const hasSubcommands = options.subcommands && options.subcommands.length > 0;

  let index = 0;
  while (index < tokens.length) {
    const token = tokens[index];

    if (token === undefined) {
      index += 1;
      continue;
    }

    if (token === '--') {
      stopFlagParsing = true;
      index += 1;
      continue;
    }

    if (!stopFlagParsing && isFlag(token)) {
      index = processFlagToken(token, tokens, index, flagMap, flagDefs, flags);
      index += 1;
      continue;
    }

    if (!stopFlagParsing && options.allowSubcommand !== false && !subcommand && !isFlag(token) && !token.includes('=')) {
      if (hasSubcommands && options.subcommands!.includes(token.toLowerCase())) {
        subcommand = token.toLowerCase();
      } else if (!hasSubcommands && !flagDefs.length && index === 0) {
        subcommand = token.toLowerCase();
      } else {
        positional.push(token);
      }
      index += 1;
      continue;
    }

    if (!stopFlagParsing && token.includes('=')) {
      processKeyValueToken(token, flags);
      index += 1;
      continue;
    }

    positional.push(token);
    index += 1;
  }

  for (const flagDef of flagDefs) {
    if (flagDef.required && !(flagDef.name in flags)) {
      errors.push(`Missing required flag: --${flagDef.name}`);
    }
  }

  return { subcommand, flags, positional, errors };
}

export function parseCommandArgs(raw: string): ParsedCommand {
  const result = parseCommand(raw, { allowSubcommand: true });
  return {
    subcommand: result.subcommand,
    flags: result.flags as Record<string, string | boolean>,
    values: {},
    positional: result.positional,
  };
}
