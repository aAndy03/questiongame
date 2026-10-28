/**
 * **What a command teaches, and what it is a moment for** (beta.11). Most
 * of what a tip teaches is something the operator does through the host —
 * loading a game, undoing a turn, making a domain — so one table read after
 * every accepted command (`host.ts onCommandDone`) knows it, instead of a
 * call at each of the many places a command is run from. Gestures that never
 * reach the host report themselves (`tipLearned` beside their
 * `// gesture:` marker).
 */
import type { Command } from '@questiongame/contract'
import type { Moment } from './engine'

type Args = Record<string, unknown> | undefined

/** The catalog kind an upsert writes: `{ item: { kind, item } }`. */
function kindOf(args: Args): string | null {
  const item = args?.['item'] as { kind?: unknown } | undefined
  return typeof item?.kind === 'string' ? item.kind : null
}

/** The skill a command shows the operator knows, if any. */
export function skillOf(name: Command, args: Args): string | null {
  switch (name) {
    case 'catalog_upsert':
    case 'catalog_upsert_propagating':
      return kindOf(args) === 'domain' ? 'make-domain' : null
    case 'catalog_import_questions':
      // The dialog previews with `commit: false` on every edit (review).
      return args?.['commit'] === true ? 'import' : null
    case 'tag_rename':
    case 'tag_delete':
    case 'tags_unify':
    case 'domain_group_create':
    case 'domain_group_rename':
      return 'tags-and-groups'
    case 'recipe_new':
    case 'recipe_duplicate':
      return 'make-game'
    case 'play_load':
      return 'load-into-control'
    case 'stage_set_monitor':
    case 'stage_add_mirror':
    case 'stage_remove_display':
      return 'displays'
    case 'stage_close':
      return 'close-stage'
    case 'undo_turn':
    case 'redo_turn':
      return 'undo-turn'
    case 'restart':
      return 'restart'
    case 'stats_window':
      return args?.['open'] === false ? null : 'statistics-window'
    case 'workspace_create':
    case 'workspace_switch':
      return 'workspaces'
    case 'catalog_copy_to':
    case 'catalog_move_to':
      return 'copy-to-workspace'
    case 'settings_set_global':
      return (args?.['setting'] as { key?: unknown } | undefined)?.key === 'window_native_title_bar' ? 'title-bar' : null
    default:
      return null
  }
}

/** The moment a command is, if any. */
export function momentOf(name: Command, args: Args): Moment | null {
  if ((name === 'catalog_upsert' || name === 'catalog_upsert_propagating') && kindOf(args) === 'question') return 'question:saved'
  if (name === 'play_load') return 'control:loaded'
  return null
}
