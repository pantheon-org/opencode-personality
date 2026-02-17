import type { PersonalityCommandContext } from './types.js';
import { handleList } from './list.js';
import { handleUse } from './use.js';
import { handleCreate } from './create.js';
import { handleDelete } from './delete.js';
import { handleShow } from './show.js';
import { handleEdit } from './edit.js';
import { handleReset } from './reset.js';
import { handleRestore } from './restore.js';
import { buildPersonalityHelp } from './utils.js';

export function getPersonalityCommandMarkdown(): string {
  return `---
description: Manage personality config: create/edit/show/reset
---

Call the appropriate personality management tool based on the user's request to create, edit, show, or reset the personality configuration.`;
}

export async function handlePersonalityCommand(
  args: string,
  config: any,
  configResult: any,
  output: any,
  projectDir: string,
  globalConfigDir: string,
): Promise<void> {
  const ctx: PersonalityCommandContext = {
    args,
    config,
    configResult,
    output,
    projectDir,
    globalConfigDir,
  };

  const sub = ctx.args.trim().split(/\s+/)[0]?.toLowerCase() || null;

  if (!sub || sub === 'help') {
    output.parts.push({
      type: 'text',
      text: buildPersonalityHelp(),
    });
    return;
  }

  switch (sub) {
    case 'list':
      await handleList(ctx);
      break;
    case 'use':
    case 'switch':
      await handleUse(ctx);
      break;
    case 'create':
      await handleCreate(ctx);
      break;
    case 'delete':
      await handleDelete(ctx);
      break;
    case 'show':
      await handleShow(ctx);
      break;
    case 'edit':
      await handleEdit(ctx);
      break;
    case 'reset':
      await handleReset(ctx);
      break;
    case 'restore':
      await handleRestore(ctx);
      break;
    default:
      output.parts.push({
        type: 'text',
        text: `Unknown subcommand: ${sub}\n\n${buildPersonalityHelp()}`,
      });
  }
}

export { handleList } from './list.js';
export { handleUse } from './use.js';
export { handleCreate } from './create.js';
export { handleDelete } from './delete.js';
export { handleShow } from './show.js';
export { handleEdit } from './edit.js';
export { handleReset } from './reset.js';
export { handleRestore } from './restore.js';
