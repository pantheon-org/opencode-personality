# Testing Strategy for Multi-Personality System

## Executive Summary

This document outlines the comprehensive testing strategy for the multi-personality feature branch
(`feat/selectable-personalities`) compared to the upstream main branch. The feature introduces a major architectural
change from a single-personality system to a multi-personality preset system.

## Change Summary

**Branch:** `feat/selectable-personalities` vs `upstream/main`

- **Files Changed:** 42 files
- **Lines Added:** +3,464
- **Lines Removed:** -573
- **New Modules:** plugin-config, install-defaults, schema validation, test-utils
- **New Features:** 12 example personality presets, backup/restore system, JSON schema validation
- **Architecture Change:** Single-file personality.json → Multi-file personalities/ directory

## Current Test Coverage

**Status:** 44 passing tests across 4 test files

✅ **Well-tested areas:**

- Multi-personality config operations (`config-multi.test.ts`)
- Plugin config management (`plugin-config.test.ts`)
- Default personality installation (`install-defaults.test.ts`)
- Test utilities (`test-utils.test.ts`)

---

## 1. Unit Testing Gaps

### 1.1 Schema Validation Testing (HIGH PRIORITY)

**File:** `src/schema.ts` (80 lines) - **NO TESTS EXIST**

**Risk:** Runtime crashes from invalid personality files

**Required Test Coverage:**

```typescript
// src/schema.test.ts

describe("validatePersonalityFile", () => {
  test("accepts valid personality data");
  test("rejects missing required fields (description)");
  test("rejects invalid types (emoji as string)");
  test("rejects out-of-range slangIntensity (< 0 or > 1)");
  test("rejects out-of-range drift (< 0 or > 1)");
  test("rejects invalid mood definitions (missing name/hint)");
  test("accepts optional fields (name, moods array, state)");
  test("accepts empty moods array");
  test("validates nested mood config structure");
  test("validates nested mood state structure");
});

describe("formatValidationErrors", () => {
  test('returns "Validation passed" for valid data');
  test("formats multiple errors with bullet points");
  test("includes field path in error messages");
});

describe("moodDefinitionSchema", () => {
  test("requires name field");
  test("requires hint field");
  test("requires score field as number");
  test("accepts negative scores");
});

describe("moodConfigSchema", () => {
  test("requires enabled boolean");
  test("requires default mood name");
  test("allows null override");
  test("validates drift range 0-1");
  test("allows optional toast boolean");
  test("allows optional seed number");
});
```

**Estimated Effort:** 2-3 hours

---

### 1.2 Core Config Functions Testing

**File:** `src/config.ts` - **PARTIAL COVERAGE**

**Gap:** New backup/restore and normalization functions untested

**Required Test Coverage:**

```typescript
// src/config.test.ts (new file or extend existing)

describe("backupPersonality", () => {
  test("creates timestamped backup file");
  test("preserves all personality data in backup");
  test("creates backups directory if missing");
  test("handles backup for both global and project scope");
  test("handles missing personality gracefully");
});

describe("listBackups", () => {
  test("returns empty array when no backups exist");
  test("lists all backups for a personality");
  test("sorts backups by timestamp (newest first)");
  test("filters by personality name correctly");
  test("ignores non-backup files");
});

describe("restorePersonality", () => {
  test("restores personality from backup");
  test("overwrites existing personality data");
  test("preserves current state when restoring");
  test("handles missing backup gracefully");
  test("validates restored data before saving");
});

describe("normalizeState", () => {
  test("keeps valid state unchanged");
  test("resets to default when current mood no longer exists");
  test("clears override when override mood no longer exists");
  test("updates score to match new mood definition");
  test("handles missing moods array");
});

describe("deepMerge", () => {
  test("merges nested objects correctly");
  test("preserves arrays without merging");
  test("overwrites primitives with source values");
  test("handles null values correctly");
  test("handles undefined values correctly");
  test("does not mutate source objects");
});
```

**Estimated Effort:** 3-4 hours

---

### 1.3 Command Handler Testing (CRITICAL GAP)

**File:** `src/commands/personality.ts` (~400 lines) - **NO TESTS EXIST**

**Risk:** User-facing commands may fail silently or produce unexpected results

**Required Test Coverage:**

```typescript
// src/commands/personality.test.ts

describe("parseCommandArgs", () => {
  test("parses subcommand without flags");
  test("parses subcommand with boolean flags");
  test("parses subcommand with value flags");
  test("parses key=value arguments");
  test("handles quoted strings with spaces");
  test("handles single and double quotes");
  test("handles multiple flags");
  test("returns empty for empty input");
});

describe("handlePersonalityCommand - list", () => {
  test("lists all available personalities");
  test("lists backups with --backups flag");
  test("shows empty message when no personalities exist");
  test("indicates source (global/project) for each personality");
});

describe("handlePersonalityCommand - use/switch", () => {
  test("switches to existing personality");
  test("restores from backup with --backup flag");
  test("imports from file with --file flag");
  test("validates imported file before installing");
  test("shows error for non-existent personality");
  test("updates plugin config with selected personality");
});

describe("handlePersonalityCommand - create", () => {
  test("creates new personality with default values");
  test("respects --scope flag (global/project)");
  test("creates preset-only with --preset-only flag");
  test("saves as different name with --as-preset flag");
  test("prevents overwriting existing personality");
  test("validates personality before saving");
});

describe("handlePersonalityCommand - delete", () => {
  test("deletes personality from specified scope");
  test("removes from both global and project with no --scope");
  test("shows warning when personality not found");
  test("switches to another personality if deleting active one");
});

describe("handlePersonalityCommand - edit", () => {
  test("updates simple field (description, emoji)");
  test("updates nested field (mood.enabled, mood.drift)");
  test("parses boolean values correctly");
  test("parses number values correctly");
  test("shows error for invalid field name");
  test("validates personality after editing");
  test("loads from preset with --preset flag");
});

describe("handlePersonalityCommand - show", () => {
  test("displays current personality details");
  test("displays specific personality by name");
  test("validates personality with --validate flag");
  test("shows validation errors when invalid");
  test("formats output correctly");
});

describe("handlePersonalityCommand - restore", () => {
  test("restores personality from backup");
  test("lists available backups if backup name missing");
  test("shows error for non-existent backup");
  test("validates restored personality");
});

describe("handlePersonalityCommand - reset", () => {
  test("requires --confirm flag");
  test("requires --scope flag");
  test("deletes personality from specified scope");
  test("shows error without confirmation");
});

describe("error handling", () => {
  test("shows help for unknown subcommand");
  test("shows error for missing required flags");
  test("shows error for invalid flag combinations");
  test("handles filesystem errors gracefully");
});
```

**Estimated Effort:** 4-6 hours

---

**File:** `src/commands/mood.ts` - **NO TESTS EXIST**

**Required Test Coverage:**

```typescript
// src/commands/mood.test.ts

describe("handleMoodCommand", () => {
  test("sets mood with valid name");
  test("sets mood with message duration");
  test("sets mood with session duration");
  test("sets mood with permanent duration");
  test("defaults to session duration when not specified");
  test("shows error for invalid mood name");
  test("shows error for invalid duration");
  test("calculates correct expiry for message duration");
  test("updates mood state correctly");
  test("respects mood.enabled config");
  test("shows available moods on error");
});
```

**Estimated Effort:** 2 hours

---

### 1.4 Tool Testing

**Files:** `src/tools/setMood.ts`, `src/tools/savePersonality.ts` - **NO TESTS EXIST**

**Required Test Coverage:**

```typescript
// src/tools/setMood.test.ts

describe("setMood tool", () => {
  test("tool schema is valid");
  test("invokes with valid parameters");
  test("validates mood name against available moods");
  test("handles duration parameter correctly");
  test("updates state file");
  test("shows error for invalid mood");
});

// src/tools/savePersonality.test.ts

describe("savePersonality tool", () => {
  test("tool schema is valid");
  test("invokes with complete personality data");
  test("validates personality before saving");
  test("resolves scope correctly");
  test("shows validation errors on invalid data");
  test("creates directories as needed");
});
```

**Estimated Effort:** 2 hours

---

## 2. Integration Testing

### 2.1 Plugin Lifecycle Testing (HIGH PRIORITY)

**File:** `src/index.ts` - **NO TESTS EXIST**

**Risk:** Plugin may fail to initialize or hook into OpenCode correctly

**Required Test Coverage:**

```typescript
// src/index.integration.test.ts

describe("plugin initialization", () => {
  test("creates global config directory if missing");
  test("creates personalities directories if missing");
  test("installs default personalities on first run");
  test("does not overwrite existing personalities");
  test("migrates old single-file format to new format");
  test("auto-selects first personality when none selected");
  test("preserves selected personality across restarts");
});

describe("hook registration", () => {
  test("registers experimental.chat.system.transform hook");
  test("registers event hook for mood drift");
  test("registers command.execute.before hook");
  test("returns empty hooks when no config exists");
});

describe("prompt injection", () => {
  test("injects personality description into system prompt");
  test("injects current mood hint into system prompt");
  test("respects emoji config in prompt");
  test("respects slangIntensity in prompt");
  test("omits mood hint when moods disabled");
});

describe("mood drift", () => {
  test("drifts mood after assistant response");
  test("shows toast notification on mood change");
  test("does not show toast when disabled");
  test("updates state file with new mood");
  test("respects mood override (no drift)");
  test("clears message-level override after one response");
});

describe("command routing", () => {
  test("routes /mood command to handleMoodCommand");
  test("routes /personality command to handlePersonalityCommand");
  test("passes through unhandled commands");
});
```

**Estimated Effort:** 3-4 hours

---

### 2.2 End-to-End Personality Workflows

**Required Test Coverage:**

```typescript
// test/e2e/personality-workflow.test.ts

describe("complete personality workflows", () => {
  test("create → switch → verify active", async () => {
    // Create new personality
    // Switch to it
    // Verify it's active in prompt
  });

  test("switch personality → verify prompt changes", async () => {
    // Start with personality A
    // Switch to personality B
    // Verify system prompt reflects personality B
  });

  test("edit personality → verify changes applied", async () => {
    // Edit personality description
    // Verify changes in show command
    // Verify changes in prompt
  });

  test("delete personality → verify removal and auto-switch", async () => {
    // Create personality A and B
    // Switch to A
    // Delete A
    // Verify switched to B automatically
  });

  test("backup → restore → verify state preserved", async () => {
    // Create personality with mood state
    // Backup it
    // Edit personality
    // Restore from backup
    // Verify original state restored
  });

  test("import external file → verify installation", async () => {
    // Create external personality.json file
    // Import with --file flag
    // Verify installed correctly
    // Verify can switch to it
  });
});

describe("preset validation", () => {
  test("all 12 shipped presets pass schema validation", () => {
    const presets = [
      "bender",
      "data",
      "deadpool",
      "dumbledore",
      "gandalf",
      "glados",
      "q",
      "rick",
      "sherlock",
      "splinter",
      "spock",
      "yoda",
    ];

    for (const preset of presets) {
      // Load preset file
      // Validate against schema
      // Assert validation passes
    }
  });

  test("all shipped presets have required fields", () => {
    // Verify name, description, emoji, slangIntensity
    // Verify mood config structure
  });
});
```

**Estimated Effort:** 4-5 hours

---

## 3. Regression Testing

### 3.1 Backward Compatibility

**Required Test Coverage:**

```typescript
// test/regression/migration.test.ts

describe("old format migration", () => {
  test("detects old single-file personality.json");
  test("migrates to new format preserving all fields");
  test("creates backup of old format");
  test('uses "default" as personality name if name missing');
  test("plugin works with migrated config");
  test("migration is idempotent (no re-migration)");
});

describe("config merge behavior", () => {
  test("global + project config merge still works");
  test("project config overrides global config");
  test("partial config merges with defaults");
  test("mood state normalization with config changes");
  test("default moods fallback when custom moods missing");
});
```

**Estimated Effort:** 2-3 hours

---

### 3.2 State Management Regression

**Required Test Coverage:**

```typescript
// test/regression/state-management.test.ts

describe("mood state persistence", () => {
  test("state persists across plugin reloads");
  test("state file format unchanged");
  test("state migration handles missing fields");
  test("concurrent modifications handled correctly");
});

describe("config precedence", () => {
  test("project personalities override global with same name");
  test("plugin config respects scope precedence");
  test("personality selection respects scope");
});
```

**Estimated Effort:** 1-2 hours

---

## 4. Error Handling & Edge Cases

**Required Test Coverage:**

```typescript
// test/error-handling.test.ts

describe("file system errors", () => {
  test("handles missing personality file gracefully");
  test("handles corrupted JSON in personality file");
  test("handles permission denied errors");
  test("handles directory creation failures");
  test("handles concurrent file modifications");
});

describe("validation errors", () => {
  test("shows clear error for schema validation failures");
  test("prevents saving invalid personality");
  test("prevents importing invalid personality file");
  test("shows validation errors in user-friendly format");
});

describe("command edge cases", () => {
  test("switching to non-existent personality shows error");
  test("restoring non-existent backup shows error");
  test("deleting currently active personality auto-switches");
  test("editing non-existent personality shows error");
  test("invalid command arguments show helpful error");
});

describe("state edge cases", () => {
  test("handles missing mood state gracefully");
  test("handles mood no longer in config (normalization)");
  test("handles override expiry correctly");
  test("handles invalid state file (corrupted)");
});

describe("scope edge cases", () => {
  test("handles missing scope flag gracefully");
  test("handles invalid scope value");
  test("resolves scope ambiguity (exists in both global and project)");
});
```

**Estimated Effort:** 2-3 hours

---

## 5. Performance & Stress Testing

**Required Test Coverage:**

```typescript
// test/performance.test.ts

describe("performance benchmarks", () => {
  test("plugin initialization with 0 personalities < 50ms");
  test("plugin initialization with 100 personalities < 200ms");
  test("list personalities with 100 personalities < 100ms");
  test("switch personality < 50ms");
  test("mood drift calculation < 10ms");
});

describe("stress testing", () => {
  test("handles 500+ personalities without degradation");
  test("handles 100+ backups for single personality");
  test("handles rapid personality switching");
  test("handles large personality descriptions (10KB+)");
});

describe("file I/O optimization", () => {
  test("avoids redundant file reads");
  test("caches personality list appropriately");
  test("minimizes state file writes");
});
```

**Estimated Effort:** 2-3 hours

---

## 6. Manual Testing Checklist

### Plugin Installation & Setup

- [ ] Fresh install with no config (defaults install correctly)
- [ ] Install with existing old format config (migration works)
- [ ] Install with existing new format config (no changes)
- [ ] Verify `.config/opencode/personalities/` directory created
- [ ] Verify `.opencode/personalities/` directory created in project

### Command Testing - /personality

- [ ] `/personality list` shows all available personalities
- [ ] `/personality list --backups` shows backup list
- [ ] `/personality switch rick` activates Rick personality
- [ ] `/personality switch gandalf --backup <timestamp>` restores backup
- [ ] `/personality switch sherlock --file ./custom.json` imports file
- [ ] `/personality create mybot` guides through interactive setup
- [ ] `/personality create mybot --scope global` creates in global scope
- [ ] `/personality create mybot --preset-only` creates preset without activation
- [ ] `/personality delete mybot` removes personality
- [ ] `/personality delete mybot --scope global` removes from global only
- [ ] `/personality edit rick --field description --value "new desc"` updates
- [ ] `/personality edit rick --field emoji --value true` updates boolean
- [ ] `/personality edit rick --field slangIntensity --value 0.8` updates number
- [ ] `/personality show` shows current personality
- [ ] `/personality show rick` shows specific personality
- [ ] `/personality show rick --validate` shows validation status
- [ ] `/personality restore rick` lists available backups
- [ ] `/personality reset --scope global --confirm` deletes config

### Command Testing - /mood

- [ ] `/mood happy` sets mood to happy for session
- [ ] `/mood angry message` sets mood for one message
- [ ] `/mood ecstatic session` sets mood for session
- [ ] `/mood bored permanent` sets mood permanently
- [ ] `/mood invalidmood` shows error and available moods

### Toast Notifications

- [ ] Mood drift shows toast when mood changes
- [ ] Toast displays old mood → new mood
- [ ] Toast can be disabled via `mood.toast: false`

### Prompt Injection

- [ ] Personality description appears in system prompt
- [ ] Current mood hint appears in system prompt
- [ ] Emoji usage matches personality config
- [ ] Slang intensity affects response style
- [ ] Switching personalities changes prompt immediately

### Backup & Restore

- [ ] Editing personality creates automatic backup
- [ ] Backups are timestamped correctly
- [ ] Restoring backup preserves all fields
- [ ] Listing backups shows newest first

### Preset Personalities

- [ ] All 12 presets install correctly
- [ ] All presets pass schema validation
- [ ] Can switch between presets
- [ ] Presets have distinct personalities

### Error Handling

- [ ] Invalid JSON shows clear error message
- [ ] Schema validation errors are user-friendly
- [ ] Missing personality shows helpful error
- [ ] Permission errors handled gracefully

---

## 7. CI/CD Pipeline Enhancements

### GitHub Actions Workflow Updates

**Add to `.github/workflows/pr.yml`:**

```yaml
name: PR Checks

on: [pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun run typecheck
      - run: bun run lint
      - run: bun run test
      - run: bun run build

  validate-presets:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - name: Validate all preset personalities
        run: bun run validate-presets

  integration-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun run test:integration

  coverage:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun run test --coverage
      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
```

**Add npm scripts to `package.json`:**

```json
{
  "scripts": {
    "test": "bun test",
    "test:watch": "bun test --watch",
    "test:integration": "bun test test/integration test/e2e",
    "test:coverage": "bun test --coverage",
    "validate-presets": "bun run bin/validate-presets.ts"
  }
}
```

**Create validation script:** `bin/validate-presets.ts`

```typescript
// Validates all personalities/*.json files against schema
// Exit code 1 if any validation fails
```

**Estimated Effort:** 2 hours

---

## 8. Priority Matrix

| Priority | Area              | Files/Tests                 | Reason                   | Effort | Impact   |
| -------- | ----------------- | --------------------------- | ------------------------ | ------ | -------- |
| **P0**   | Schema validation | `schema.test.ts`            | Prevents runtime crashes | 2-3h   | Critical |
| **P0**   | Command handlers  | `commands/*.test.ts`        | User-facing features     | 6-8h   | Critical |
| **P0**   | Preset validation | `validate-presets.ts`       | Shipped with package     | 1h     | Critical |
| **P1**   | Plugin lifecycle  | `index.integration.test.ts` | Core functionality       | 3-4h   | High     |
| **P1**   | Tool tests        | `tools/*.test.ts`           | User-facing features     | 2h     | High     |
| **P1**   | E2E workflows     | `e2e/*.test.ts`             | Integration verification | 4-5h   | High     |
| **P2**   | Config functions  | `config.test.ts` (extend)   | New backup/restore       | 3-4h   | Medium   |
| **P2**   | Regression tests  | `regression/*.test.ts`      | Backward compatibility   | 2-3h   | Medium   |
| **P2**   | Error handling    | `error-handling.test.ts`    | Edge cases               | 2-3h   | Medium   |
| **P3**   | Performance       | `performance.test.ts`       | Scalability              | 2-3h   | Low      |

**Total Estimated Effort:** 27-36 hours (3.5-4.5 weeks @ 8 hours/week)

---

## 9. Test Execution Plan

### Phase 1: Critical Coverage (Week 1-2)

**Goal:** Eliminate P0 risks

**Tasks:**

1. ✅ Create `src/schema.test.ts` (2-3h)
2. ✅ Create `src/commands/personality.test.ts` (4-6h)
3. ✅ Create `src/commands/mood.test.ts` (2h)
4. ✅ Create `bin/validate-presets.ts` script (1h)
5. ✅ Run validation on all 12 presets
6. ✅ Fix any validation failures
7. ✅ Achieve 100% pass rate on new tests

**Deliverable:** P0 tests passing, all presets validated

---

### Phase 2: Integration & Regression (Week 3-4)

**Goal:** Verify feature integration and backward compatibility

**Tasks:**

1. ✅ Create `src/index.integration.test.ts` (3-4h)
2. ✅ Create `src/tools/setMood.test.ts` (1h)
3. ✅ Create `src/tools/savePersonality.test.ts` (1h)
4. ✅ Create `test/e2e/personality-workflow.test.ts` (4-5h)
5. ✅ Create `test/regression/migration.test.ts` (2-3h)
6. ✅ Extend `src/config.test.ts` with backup/restore tests (3-4h)
7. ✅ Execute manual testing checklist
8. ✅ Document any issues found

**Deliverable:** P1 tests passing, manual checklist completed

---

### Phase 3: Polish & Performance (Week 5)

**Goal:** Edge cases and performance validation

**Tasks:**

1. ✅ Create `test/error-handling.test.ts` (2-3h)
2. ✅ Create `test/performance.test.ts` (2-3h)
3. ✅ Update GitHub Actions workflow (2h)
4. ✅ Add coverage reporting
5. ✅ Update AGENTS.md with testing guidelines
6. ✅ Final manual testing pass

**Deliverable:** 80%+ code coverage, CI/CD pipeline enhanced

---

## 10. Success Criteria

### Test Coverage Metrics

- [ ] Overall test coverage ≥80% (currently ~60% estimated)
- [ ] All new modules have ≥90% coverage
- [ ] All command handlers have ≥90% coverage
- [ ] All tools have ≥90% coverage

### Functional Validation

- [ ] All 12 preset personalities pass schema validation
- [ ] All command handlers have test coverage
- [ ] Schema validation has comprehensive test coverage
- [ ] Migration from old format tested and verified
- [ ] No regressions in existing functionality

### Quality Gates

- [ ] CI/CD pipeline validates all changes automatically
- [ ] All manual testing checklist items pass
- [ ] No P0 or P1 bugs remain open
- [ ] Performance benchmarks met

### Documentation

- [ ] AGENTS.md updated with testing guidelines
- [ ] README.md reflects new testing commands
- [ ] All test files have clear descriptions
- [ ] Preset validation script documented

---

## 11. Known Limitations & Future Work

### Current Limitations

1. No visual regression testing for toast notifications
2. No load testing with production-scale data
3. No cross-platform testing (macOS/Linux/Windows)
4. No testing of OpenCode plugin API integration

### Future Enhancements

1. Add visual regression tests for UI components
2. Add snapshot testing for prompt generation
3. Add contract tests for plugin API
4. Add mutation testing for test quality
5. Add property-based testing for config merging

---

## 12. Resources & References

### Documentation

- [OpenCode Plugin API](https://opencode.ai/docs)
- [Bun Test Runner](https://bun.sh/docs/cli/test)
- [JSON Schema Validation](https://json-schema.org/)

### Test Utilities

- Test utilities: `src/test-utils.ts`
- Personality fixtures: `src/defaults/`
- Example presets: `personalities/`

### Related Documents

- `AGENTS.md` - Development guidelines
- `README.md` - User-facing documentation
- `personalities/PERSONALITY_SWITCHER.md` - Feature design doc

---

## Appendix A: Test File Structure

```
opencode-personality/
├── src/
│   ├── schema.test.ts              ← NEW (P0)
│   ├── config.test.ts              ← EXTEND (P2)
│   ├── index.integration.test.ts   ← NEW (P1)
│   ├── commands/
│   │   ├── personality.test.ts     ← NEW (P0)
│   │   └── mood.test.ts            ← NEW (P0)
│   └── tools/
│       ├── setMood.test.ts         ← NEW (P1)
│       └── savePersonality.test.ts ← NEW (P1)
├── test/
│   ├── e2e/
│   │   └── personality-workflow.test.ts  ← NEW (P1)
│   ├── regression/
│   │   ├── migration.test.ts             ← NEW (P2)
│   │   └── state-management.test.ts      ← NEW (P2)
│   ├── error-handling.test.ts            ← NEW (P2)
│   └── performance.test.ts               ← NEW (P3)
└── bin/
    └── validate-presets.ts                ← NEW (P0)
```

---

## Appendix B: Sample Test Templates

### Unit Test Template

```typescript
import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { createTempDir, cleanupTempDir } from "../test-utils.js";

describe("ModuleName", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir();
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  test("does something correctly", () => {
    // Arrange
    const input = "test";

    // Act
    const result = functionUnderTest(input);

    // Assert
    expect(result).toBe("expected");
  });
});
```

### Integration Test Template

```typescript
import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import type { Plugin } from "@opencode-ai/plugin";

describe("Plugin Integration", () => {
  let plugin: Plugin;

  beforeAll(async () => {
    // Setup test environment
  });

  afterAll(async () => {
    // Cleanup test environment
  });

  test("complete workflow", async () => {
    // Test full user workflow
  });
});
```

---

**Document Version:** 1.0  
**Last Updated:** 2026-02-09  
**Owner:** Development Team  
**Status:** Approved
