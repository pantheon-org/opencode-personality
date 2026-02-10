#!/usr/bin/env node
/**
 * Switch opencode.json to production mode (use built dist files)
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const configPath = join(__dirname, '..', 'opencode.json');

try {
  const config = JSON.parse(readFileSync(configPath, 'utf-8'));
  
  if (config.plugin === 'file://dist/index.js') {
    console.log('✓ Already in prod mode');
  } else {
    config.plugin = 'file://dist/index.js';
    writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');
    console.log('✓ Switched to prod mode: file://dist/index.js');
  }
} catch (error) {
  console.error('✗ Failed to update config:', error.message);
  process.exit(1);
}
