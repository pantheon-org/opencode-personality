# Manual Testing Guide for OpenCode Personality Plugin

This guide walks you through testing all features of the opencode-personality plugin locally before release.

## Prerequisites

1. **Build the plugin:**

   ```bash
   npm install
   npm run build
   ```

2. **Link the plugin to OpenCode:**

   Edit your `~/.config/opencode/opencode.json` to use the local build:

   ```json
   {
     "plugin": ["file:///absolute/path/to/opencode-personality"],
     "command": {
       "mood": {
         "description": "Set the assistant's mood [mood: bored, angry, lethargic] [duration: message, session, permanent]",
         "template": "Call the setMood tool to set the mood to the mood and duration requested by the user. If the duration is not mentioned assume session."
       },
       "personality": {
         "description": "Manage personality config: create/edit/show/reset",
         "template": "Call the appropriate personality management tool based on the user's request to create, edit, show, or reset the personality configuration."
       }
     }
   }
   ```

   Replace `/absolute/path/to/opencode-personality` with the actual path to your local clone.

3. **Clean state (optional):**

   For a fresh test, backup and remove existing configs:

   ```bash
   # Backup existing configs
   mv ~/.config/opencode/personalities ~/.config/opencode/personalities.backup
   mv ~/.config/opencode/opencode-personality.json ~/.config/opencode/opencode-personality.json.backup
   ```

## Test Plan

### 1. First Run - Default Installation

**Objective:** Verify default personalities are installed automatically.

1. Start OpenCode:

   ```bash
   opencode
   ```

2. Send a test message:

   ```
   Hello!
   ```

3. **Verify:**
   - Check that personalities directory exists at the appropriate location:
     - If plugin configured in `~/.config/opencode/opencode.json`: Check `~/.config/opencode/personalities/`
     - If plugin configured in `.opencode/opencode.json`: Check `.opencode/personalities/`
   - Verify default personalities are present:
     ```bash
     ls -la ~/.config/opencode/personalities/
     # or
     ls -la .opencode/personalities/
     ```
   - Should see files like: `rick.json`, `sherlock.json`, `yoda.json`, `moriarty.json`
   
   **Note:** The plugin detects where it's configured (global vs project) and installs personalities to the matching scope automatically.

### 2. Personality Creation

**Objective:** Test interactive personality creation.

1. Run command:

   ```
   /personality create --scope global
   ```

2. Follow the prompts and provide:
   - Name: `TestBot`
   - Description: `A friendly test assistant`
   - Emoji: `🤖`
   - Slang intensity: `0.3`
   - Moods: Accept defaults

3. **Verify:**
   - Check file was created:
     ```bash
     cat ~/.config/opencode/personalities/testbot.json
     ```
   - Validate JSON structure includes `$schema` property
   - Check `~/.config/opencode/opencode-personality.json` shows `"selectedPersonality": "testbot"`

### 3. Personality Switching

**Objective:** Test switching between personalities.

1. List available personalities:

   ```
   /personality list
   ```

2. Switch to a preset:

   ```
   /personality switch rick
   ```

3. Send a message and observe Rick Sanchez personality traits in response

4. Switch to another personality:

   ```
   /personality switch sherlock
   ```

5. Send a message and observe Sherlock Holmes personality traits

6. **Verify:**
   - Check `opencode-personality.json` updates after each switch:
     ```bash
     cat ~/.config/opencode/opencode-personality.json
     ```
   - Responses should reflect the active personality's traits

### 4. Mood System - Basic Functionality

**Objective:** Test mood setting and display.

1. Check current mood status:

   ```
   /mood status
   ```

2. Set mood to "angry":

   ```
   /mood angry
   ```

3. Send a message and observe the response tone

4. Set mood to "ecstatic":

   ```
   /mood ecstatic
   ```

5. Send a message and observe the response tone

6. **Verify:**
   - Toast notifications appear when mood changes (if enabled)
   - Response tone matches the mood set
   - Check state file updates:
     ```bash
     cat ~/.config/opencode/personalities/[current-personality].json
     ```
   - Verify `state.currentMood` field updates

### 5. Mood Duration Types

**Objective:** Test different mood duration settings.

1. Set mood for one message only:

   ```
   Set my mood to bored for just this message
   ```

   _(Should invoke setMood with duration="message")_

2. Send a message, then check mood reverted:

   ```
   /mood status
   ```

3. Set mood for the session:

   ```
   Set my mood to happy for this session
   ```

4. **Verify:**
   - Message-level mood only affects one response
   - Session mood persists until OpenCode restarts
   - Check personality file to see if `state.override` is set

### 6. Mood Drift System

**Objective:** Test natural mood drift during conversation.

1. Ensure mood is enabled in personality config:

   ```
   /personality show
   ```

   _(Check `mood.enabled: true` and `mood.drift > 0`)_

2. Have a longer conversation (10+ exchanges)

3. Periodically check mood status:

   ```
   /mood status
   ```

4. **Verify:**
   - Mood gradually drifts over time
   - Drift amount respects `mood.drift` config value
   - State file shows updated `currentMood` and `driftScore`

### 7. Custom Moods

**Objective:** Test defining custom moods.

1. Create a personality with custom moods:

   ```
   /personality create --scope project
   ```

   Or manually create `.opencode/personalities/custom.json`:

   ```json
   {
     "$schema": "https://raw.githubusercontent.com/pantheon-org/opencode-personality/main/schema/personality.schema.json",
     "name": "Custom Bot",
     "description": "A bot with custom moods",
     "emoji": "🎭",
     "slangIntensity": 0.5,
     "moods": [
       { "name": "zen", "hint": "Calm, meditative, philosophical responses", "score": 0 },
       { "name": "chaotic", "hint": "Unpredictable, wild, creative responses", "score": 2 }
     ],
     "mood": {
       "enabled": true,
       "default": "zen",
       "drift": 0.4
     }
   }
   ```

2. Switch to the custom personality:

   ```
   /personality switch custom
   ```

3. Test the custom moods:

   ```
   /mood zen
   ```

   _(Send message and observe)_

   ```
   /mood chaotic
   ```

   _(Send message and observe)_

4. **Verify:**
   - Custom moods work correctly
   - Mood hints affect response style
   - Drift respects custom mood scores

### 8. Personality Editing

**Objective:** Test editing personality configurations.

1. Edit a field directly:

   ```
   /personality edit --field slangIntensity --value 0.8
   ```

2. Edit interactively:

   ```
   /personality edit
   ```

   _(Follow prompts to change fields)_

3. **Verify:**
   - Changes persist to the personality file
   - Subsequent responses reflect the changes
   - Backup is created if `--backup` flag used

### 9. Scope Precedence (Global vs Project)

**Objective:** Test that project config overrides global config.

1. Create a global personality:

   ```
   /personality create --scope global
   ```

   _(Name it "GlobalBot")_

2. Switch to it:

   ```
   /personality switch globalbot
   ```

3. Navigate to a project directory:

   ```bash
   cd /path/to/test/project
   ```

4. Create a project-local personality:

   ```
   /personality create --scope project
   ```

   _(Name it "ProjectBot")_

5. **Verify:**
   - Project personality takes precedence when in project directory
   - Global personality used when outside project directory
   - Check both config locations:
     ```bash
     cat ~/.config/opencode/opencode-personality.json
     cat .opencode/opencode-personality.json
     ```

### 10. Personality Show

**Objective:** Test displaying merged configuration.

1. Run:

   ```
   /personality show
   ```

2. **Verify:**
   - Displays complete merged config (global + project)
   - Shows all fields: name, description, emoji, slangIntensity, moods, mood config
   - State information (current mood, overrides) is displayed

### 11. Personality Reset

**Objective:** Test deleting personality configuration.

1. Create a test personality:

   ```
   /personality create --scope project
   ```

2. Reset it:

   ```
   /personality reset --scope project --confirm
   ```

3. **Verify:**
   - Personality file is deleted
   - Plugin continues to work with global config
   - No errors occur

### 12. Backup and Restore

**Objective:** Test personality backup and restore functionality.

1. Switch with backup:

   ```
   /personality switch --backup rick
   ```

2. List backups:

   ```
   /personality list --backups
   ```

3. Restore from backup:

   ```
   /personality restore rick
   ```

4. **Verify:**
   - Backup files created in `personalities/backups/` directory
   - Restore recovers previous personality state
   - Timestamps in backup filenames

### 13. JSON Schema Validation

**Objective:** Test that invalid configs are rejected.

1. Manually create an invalid personality file:

   ```bash
   cat > ~/.config/opencode/personalities/invalid.json << 'EOF'
   {
     "$schema": "https://raw.githubusercontent.com/pantheon-org/opencode-personality/main/schema/personality.schema.json",
     "name": 123,
     "slangIntensity": 5.0
   }
   EOF
   ```

2. Try to switch to it:

   ```
   /personality switch invalid
   ```

3. **Verify:**
   - Clear validation error message appears
   - Plugin doesn't crash
   - Points out specific validation issues

4. Clean up:
   ```bash
   rm ~/.config/opencode/personalities/invalid.json
   ```

### 14. Legacy Migration

**Objective:** Test automatic migration from old format.

1. Create a legacy config:

   ```bash
   cat > ~/.config/opencode/personality.json << 'EOF'
   {
     "name": "Legacy Bot",
     "description": "Old format personality",
     "emoji": "📟",
     "slangIntensity": 0.5,
     "mood": {
       "enabled": true,
       "default": "happy"
     }
   }
   EOF
   ```

2. Run any personality command:

   ```
   /personality show
   ```

3. **Verify:**
   - Plugin detects and uses legacy config
   - Migration message appears
   - Legacy file still exists (backup)
   - New format files created in `personalities/` directory

### 15. Toast Notifications

**Objective:** Test toast notifications for mood changes.

1. Ensure toasts are enabled in personality:

   ```json
   "mood": {
     "enabled": true,
     "toast": true
   }
   ```

2. Change mood:

   ```
   /mood angry
   ```

3. **Verify:**
   - Toast notification appears in OpenCode UI
   - Shows mood change information

4. Disable toasts:

   ```
   /personality edit --field mood.toast --value false
   ```

5. Change mood again and verify no toast appears

### 16. Error Handling

**Objective:** Test graceful error handling.

1. Try to switch to non-existent personality:

   ```
   /personality switch nonexistent
   ```

2. Try to set invalid mood:

   ```
   /mood invalidmood
   ```

3. Try to reset without confirm flag:

   ```
   /personality reset --scope global
   ```

4. **Verify:**
   - Clear, actionable error messages
   - No crashes or undefined behavior
   - Plugin continues to function after errors

### 17. Performance Test

**Objective:** Ensure plugin doesn't slow down OpenCode.

1. Time a conversation without personality plugin:
   - Comment out plugin from `opencode.json`
   - Send 10 messages and note response times

2. Time with personality plugin:
   - Re-enable plugin
   - Send 10 messages and note response times

3. **Verify:**
   - No significant performance degradation
   - Prompt injection is fast (<100ms)
   - Mood drift calculation is efficient

## Cleanup

After testing, restore your original configuration:

```bash
# Remove test configs
rm -rf ~/.config/opencode/personalities
rm ~/.config/opencode/opencode-personality.json

# Restore backups (if created)
mv ~/.config/opencode/personalities.backup ~/.config/opencode/personalities
mv ~/.config/opencode/opencode-personality.json.backup ~/.config/opencode/opencode-personality.json
```

## Troubleshooting

### Plugin Not Loading

- Check OpenCode logs: `opencode --verbose`
- Verify plugin path in `opencode.json` is absolute
- Ensure build succeeded: check `dist/` directory exists

### Personality Not Applying

- Run `/personality show` to see merged config
- Check `selectedPersonality` matches an existing file
- Verify personality file has valid JSON and `$schema`

### Mood Not Changing

- Ensure `mood.enabled` is `true`
- Check `mood.drift` is greater than 0
- Verify conversation has enough exchanges for drift

### Commands Not Working

- Verify commands are registered in `opencode.json`
- Check command syntax matches template
- Look for tool call errors in OpenCode output

## Success Criteria

All tests should pass with:

- No crashes or unhandled errors
- Clear, helpful error messages
- Configs persist correctly across sessions
- Personality traits visible in responses
- Mood system affects response tone
- Precedence rules (project > global) work correctly
- Schema validation catches invalid configs
- Performance remains acceptable

## Reporting Issues

If you find bugs during testing:

1. Note the steps to reproduce
2. Check OpenCode logs for errors
3. Verify your test environment matches prerequisites
4. Report at: https://github.com/pantheon-org/opencode-personality/issues
