import type { PersonalityFile, ParsedCommand, ConfigResult, CommandOutput, PersonalityMetadata } from '../../types.js';

export type {
  PersonalityFile,
  ParsedCommand,
  ConfigResult,
  CommandOutput,
  PersonalityMetadata,
};

export interface PersonalityCommandContext {
  args: string;
  config: PersonalityFile;
  configResult: ConfigResult;
  output: CommandOutput;
  projectDir: string;
  globalConfigDir: string;
}

export interface PersonalityCommandHandler {
  (ctx: PersonalityCommandContext): Promise<void>;
}
