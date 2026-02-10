# Build and Release Scripts

This directory contains helper scripts for managing the plugin configuration during development and release.

## Scripts

### `config-dev.js`

Switches `opencode.json` to development mode using the TypeScript source files.

```bash
npm run dev
```

Sets `plugin` to `"./src/index.ts"` for faster development without needing to rebuild.

### `config-prod.js`

Switches `opencode.json` to production mode using the built distribution files.

```bash
npm run prod
```

Sets `plugin` to `"file://dist/index.js"` for testing the production build locally.

## Release Workflow

### Development

1. Work in dev mode (default):
   ```bash
   npm run dev
   ```

2. Test changes directly without building
3. Run tests: `npm test`
4. Type check: `npm run typecheck`

### Pre-release Testing

1. Build the plugin:
   ```bash
   npm run build
   ```

2. Switch to prod mode:
   ```bash
   npm run prod
   ```

3. Test the built plugin to ensure it works correctly
4. Switch back to dev mode when done:
   ```bash
   npm run dev
   ```

### Release

The release process is automated via the `prepublishOnly` script:

```bash
npm version [patch|minor|major]
npm publish
```

The `prepublishOnly` hook automatically:
1. Cleans the dist directory
2. Builds the plugin
3. Generates type declarations

**Important**: Always keep the repository in dev mode (`./src/index.ts`). The production configuration is for local testing only and should not be committed.

## Configuration

- **Dev mode**: `"plugin": "./src/index.ts"` (for development)
- **Prod mode**: `"plugin": "file://dist/index.js"` (for testing builds)
- **NPM publish**: Uses `dist/index.js` as the main entry point (defined in `package.json`)
