# AGENTS.md - OpenCode Personality Plugin

Guidelines for AI agents working on this codebase.

## Project Overview

An OpenCode plugin that adds configurable personality and mood systems to AI assistants. The plugin injects personality
traits into the system prompt and manages a mood state machine that drifts over time.

## Code Style & Architecture

This project follows strict organizational patterns. For detailed guidelines, see:

- **Coding Standards**: `docs/CODING_STYLE.md` (comprehensive style guide)
- **Biome Configuration**: `docs/BIOME_RATIONALE.md` (linting rules explanation)

## Architecture

```sh
src/
├── index.ts              # Plugin entry point, hooks registration
├── types.ts              # All type definitions
├── config.ts             # Config loading, merging, state management
├── plugin-config.ts      # Plugin-level config (selectedPersonality)
├── schema.ts             # Zod schema validation for personality files
├── mood.ts               # Mood drift, scoring functions
├── prompt.ts             # Personality prompt builder
├── install-defaults.ts   # Default personality installation logic
├── test-utils.ts         # Test helper functions
├── defaults/             # Built-in personality templates (TypeScript)
│   ├── index.ts          # Barrel export for all personalities
│   ├── rick.ts           # Rick Sanchez personality
│   ├── yoda.ts           # Yoda personality
│   ├── deadpool.ts       # Deadpool personality
│   ├── ...               # 9 more personalities
│   └── *.json            # Legacy JSON files (retained for compatibility)
├── tools/
│   ├── setMood.ts           # setMood tool definition
│   └── savePersonality.ts   # savePersonality tool definition
└── commands/
    ├── mood.ts           # /mood command handler
    ├── personality.ts    # /personality command handler
    └── install.ts        # /install command handler
```

## Key Files

| File                      | Purpose                                                                                                                                              |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/types.ts`            | All exported types - modify here for schema changes                                                                                                  |
| `src/config.ts`           | Personality file I/O, merging, state management, migration                                                                                           |
| `src/plugin-config.ts`    | Plugin-level config (selectedPersonality persistence)                                                                                                |
| `src/schema.ts`           | Zod schema validation for personality files                                                                                                          |
| `src/mood.ts`             | Mood drift algorithm - uses seeded random for testing                                                                                                |
| `src/prompt.ts`           | Builds personality section for system prompt                                                                                                         |
| `src/install-defaults.ts` | Installs default personalities on first run from TypeScript modules                                                                                  |
| `src/defaults/`           | TypeScript definitions for 12 built-in personalities (rick, yoda, deadpool, data, sherlock, gandalf, glados, bender, q, dumbledore, splinter, spock) |
| `src/index.ts`            | Plugin hooks registration, main entry point                                                                                                          |

## Plugin Hooks Used

| Hook                                 | Purpose                                                 |
| ------------------------------------ | ------------------------------------------------------- |
| `experimental.chat.system.transform` | Inject personality into system prompt                   |
| `event`                              | Drift mood after assistant responses                    |
| `command.execute.before`             | Handle `/mood`, `/personality`, and `/install` commands |

## Testing Workflow

1. Run `bun test` or `bun test --watch` for unit tests
2. Run `npm run typecheck` to verify types
3. Run `npm run lint` to check code style
4. Run `npm run build` to verify build
5. Test in OpenCode by updating `opencode.json` to point to `src/index.ts`

## Making Changes

### Adding a New Mood Field

1. Add type to `MoodDefinition` or `MoodConfig` in `src/types.ts`
2. Add default value in `DEFAULT_MOODS` or `DEFAULT_MOOD_CONFIG` in `src/config.ts`
3. Use the field in `src/mood.ts` or `src/prompt.ts`
4. Update README config reference

### Adding a New Command

1. Create handler in `src/commands/`
2. Add command markdown generator function (returns frontmatter + description)
3. Register command in `src/commands/install.ts` `COMMANDS` array
4. Import and wire up handler in `src/index.ts` `command.execute.before` hook
5. Document in README

Commands are auto-installed via `installCommands()` - no manual `opencode.json` registration needed.

### Adding a New Default Personality

1. Create new TypeScript file in `src/defaults/` (e.g., `jarvis.ts`)
2. Import `PersonalityFile` type from `../types.js`
3. Export a const with personality configuration
4. Add export to `src/defaults/index.ts` barrel
5. Add to `DEFAULT_PERSONALITIES` array in `src/install-defaults.ts`
6. Rebuild with `npm run build` to bundle

### Adding a New Tool

1. Create tool in `src/tools/` using `tool()` from `@opencode-ai/plugin`
2. Import and add to `tool:` object in `src/index.ts`
3. Document in README Tools section

### Adding a New Hook

1. Add implementation in `src/index.ts` return object
2. Follow existing patterns for hook signatures
3. Document behavior in README if user-facing

## Release Process

1. Update version in `package.json`
2. Update `CHANGELOG.md`
3. Commit: `git commit -m "chore: release vX.Y.Z"`
4. Tag: `git tag vX.Y.Z`
5. Push: `git push && git push --tags`
6. GitHub Actions handles npm publish

## Common Patterns

### Config Loading

```typescript
const configResult = loadConfigWithPrecedence(directory);
if (configResult.config === null) {
  // No config - return minimal hooks or no-op
  return {};
}
```

### Type Guards for Output

```typescript
const output = cmdOutput as { parts: Array<{ type: string; text: string }> };
output.parts.push({ type: "text", text: "Message" });
```

### Mood State Normalization

Always normalize state after loading to handle config changes:

```typescript
const normalized = normalizeState(state, defaultMood, moods);
```

### Dependency Injection for File System Operations

The codebase uses Dependency Injection (DI) for file system operations to enable testability:

**File System Interface:**
```typescript
// src/infrastructure/file-system.ts
export interface FileSystem {
  readFile(path: string): Promise<string>;
  readFileSync(path: string, encoding?: string): string;
  writeFile(path: string, data: string, encoding?: string): Promise<void>;
  writeFileSync(path: string, data: string, encoding?: string): void;
  exists(path: string): Promise<boolean>;
  existsSync(path: string): boolean;
  mkdir(path: string, options?: { recursive?: boolean }): Promise<void>;
  mkdirSync(path: string, options?: { recursive?: boolean }): void;
  // ... other methods
}
```

**Testing with In-Memory File System:**
```typescript
// src/infrastructure/memory-file-system.ts
import { InMemoryFileSystem } from '../infrastructure/memory-file-system.js';

describe('ConfigLoader', () => {
  let fs: InMemoryFileSystem;

  beforeEach(() => {
    fs = new InMemoryFileSystem();
    fs.setFile('/project/.opencode/personality.json', JSON.stringify({ name: 'Test' }));
  });

  it('loads config', async () => {
    const loader = new FileSystemConfigLoader(fs);
    const result = await loader.load('/project');
    expect(result.config?.nameTest');
  });
).toBe('});
```

**Functions accepting optional FileSystem:**
Most functions in `config.ts` accept an optional `fs` parameter:
```typescript
export function loadPersonalityFile(
  name: string,
  directory: string,
  fs: FileSystem = defaultFileSystem,
): PersonalityFile | null {
  // Uses fs.readFileSync, fs.existsSync, etc.
}
```

**Repository Pattern:**
Use repositories for encapsulated data access:
```typescript
// src/personality/repository.ts
export class PersonalityRepository {
  constructor(
    private directory: string,
    private fs: FileSystem = defaultFileSystem,
  ) {}

  async findByName(name: string): Promise<PersonalityFile | null> {
    // Uses this.fs for all operations
  }
}
```

## Constraints

- **Backward Compatible**: Accept old config formats, auto-migrate on first run
- **No-op Safe**: Return limited hooks if no personality is selected
- **Deterministic**: Use `mood.seed` for reproducible tests
- **Minimal Dependencies**: Only `@opencode-ai/plugin` peer dependency and `zod` for validation
- **Auto-install**: Installs default personalities if none exist on first run
- **Logging**: Use OpenCode SDK logger via `client.app.log()`:
  [OpenCode logging docs](https://opencode.ai/docs/plugins/#logging)
