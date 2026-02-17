import { describe, it, expect } from 'bun:test';
import { parseCommand, parseCommandArgs, type FlagDefinition, type ParserOptions } from './parser';

describe('tokenizeArgs', () => {
  it('should tokenize basic arguments', () => {
    const { parseCommand: tokenize } = require('./parser');
  });
});

describe('parseCommand', () => {
  const stringFlags: FlagDefinition[] = [
    { name: 'name', alias: 'n', type: 'string' },
    { name: 'prompt', alias: 'p', type: 'string' },
    { name: 'description', alias: 'd', type: 'string' },
    { name: 'author', alias: 'a', type: 'string' },
  ];

  const booleanFlags: FlagDefinition[] = [
    { name: 'verbose', alias: 'v', type: 'boolean' },
    { name: 'force', alias: 'f', type: 'boolean' },
  ];

  const mixedFlags: FlagDefinition[] = [
    { name: 'name', alias: 'n', type: 'string', required: true },
    { name: 'verbose', alias: 'v', type: 'boolean' },
    { name: 'count', alias: 'c', type: 'number' },
  ];

  it('parses basic flags', () => {
    const result = parseCommand('--name test --prompt "hello world"', { flags: stringFlags });
    expect(result.flags.name).toBe('test');
    expect(result.flags.prompt).toBe('hello world');
  });

  it('handles aliases', () => {
    const result = parseCommand('-n test -p "hello"', { flags: stringFlags });
    expect(result.flags.name).toBe('test');
    expect(result.flags.prompt).toBe('hello');
  });

  it('detects missing required flags', () => {
    const result = parseCommand('--verbose', { flags: mixedFlags });
    expect(result.errors).toContain('Missing required flag: --name');
  });

  it('handles subcommand', () => {
    const result = parseCommand('create --name test', { flags: stringFlags, subcommands: ['create', 'delete'] });
    expect(result.subcommand).toBe('create');
    expect(result.flags.name).toBe('test');
  });

  it('handles subcommand', () => {
    const result = parseCommand('create --name test', { flags: stringFlags, subcommands: ['create', 'delete'] });
    expect(result.subcommand).toBe('create');
    expect(result.flags.name).toBe('test');
  });

  it('handles quoted strings with spaces', () => {
    const result = parseCommand('--name "John Doe"', { flags: stringFlags });
    expect(result.flags.name).toBe('John Doe');
  });

  it('handles boolean flags', () => {
    const result = parseCommand('--name test --verbose', { flags: mixedFlags });
    expect(result.flags.name).toBe('test');
    expect(result.flags.verbose).toBe(true);
  });

  it('handles subcommand', () => {
    const result = parseCommand('create --name test', { flags: stringFlags, subcommands: ['create', 'delete'] });
    expect(result.subcommand).toBe('create');
    expect(result.flags.name).toBe('test');
  });

  it('handles positional arguments', () => {
    const result = parseCommand('arg1 arg2 --flag value', { flags: [], allowSubcommand: false });
    expect(result.positional).toEqual(['arg1', 'arg2']);
  });

  it('handles equals syntax', () => {
    const result = parseCommand('--name=test --prompt=hello', { flags: stringFlags });
    expect(result.flags.name).toBe('test');
    expect(result.flags.prompt).toBe('hello');
  });

  it('handles numeric flags', () => {
    const result = parseCommand('--count 42', { flags: mixedFlags });
    expect(result.flags.count).toBe(42);
  });

  it('handles empty input', () => {
    const result = parseCommand('', { flags: [] });
    expect(result.subcommand).toBeNull();
    expect(result.flags).toEqual({});
    expect(result.positional).toEqual([]);
  });

  it('handles double-dash separator', () => {
    const result = parseCommand('--name test -- --some-arg', { flags: stringFlags });
    expect(result.flags.name).toBe('test');
    expect(result.positional).toContain('--some-arg');
  });
});

describe('parseCommandArgs', () => {
  it('parses subcommand and flags', () => {
    const result = parseCommandArgs('create --name test --prompt "hello"');
    expect(result.subcommand).toBe('create');
    expect(result.flags.name).toBe('test');
    expect(result.flags.prompt).toBe('hello');
  });

  it('handles no subcommand', () => {
    const result = parseCommandArgs('--name test');
    expect(result.subcommand).toBeNull();
    expect(result.flags.name).toBe('test');
  });
});
