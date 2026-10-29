/**
 * The Viewer protocol (spec §5.7): Control embeds the real Stage in an
 * iframe and the two talk over `postMessage`. Studio sends the stripped
 * play-state; Stage sends back where its addressable nodes are, so Studio
 * can draw hit targets over them. Stage's tree gains nothing.
 *
 * Both sides check `source` so a stray message cannot drive the Viewer.
 */

import type { NodeId } from './nodes'
import type { PlayTick } from './commands'
import type { PlayStateForStage } from './play-state'

export const VIEWER_SOURCE = 'questiongame.viewer' as const

/** A node's box in Stage frame coordinates (1920×1080), before scaling. */
export interface ViewerNodeRect {
  readonly id: NodeId
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
  /**
   * What the node draws now, measured (beta.13): its words, trimmed, and its
   * computed font size in frame px. The Screens Inspector shows them instead
   * of "Built-in" — measured, so Studio never imports Stage's tables.
   */
  readonly text?: string | undefined
  readonly fontSize?: number | undefined
}

/**
 * The screen's decor box as Stage resolved it (beta.13): the boundary in
 * frame px, and the anchor as fractions of it — the built-in or the game's
 * override. The Screens canvas draws them and seeds an override from them.
 */
export interface ViewerDecorBox {
  readonly boundary: { readonly x: number; readonly y: number; readonly width: number; readonly height: number }
  readonly anchor: { readonly x: number; readonly y: number }
}

/** Studio → the Stage iframe. */
export type ViewerToStage =
  | { readonly source: typeof VIEWER_SOURCE; readonly type: 'play-state'; readonly state: PlayStateForStage }
  /**
   * The countdown alone (P11.9). Control posts the whole state only when it
   * changed; without this the Viewer's clock would sit still, because a
   * `postMessage` of the full Play ten times a second is a structured clone of
   * ~8 KB for two numbers — the same waste the host stopped putting on the
   * wire.
   */
  | { readonly source: typeof VIEWER_SOURCE; readonly type: 'tick'; readonly tick: PlayTick }
  /** Ask for the current node rects (after the box resized). */
  | { readonly source: typeof VIEWER_SOURCE; readonly type: 'measure' }

/** The Stage iframe → Studio. */
export type StageToViewer =
  | { readonly source: typeof VIEWER_SOURCE; readonly type: 'ready' }
  | { readonly source: typeof VIEWER_SOURCE; readonly type: 'nodes'; readonly nodes: readonly ViewerNodeRect[]; readonly decor?: ViewerDecorBox | null | undefined }

export function isViewerMessage(data: unknown): data is ViewerToStage | StageToViewer {
  return typeof data === 'object' && data !== null && (data as { source?: unknown }).source === VIEWER_SOURCE
}

/** The frame Stage lays out in; the Viewer scales it to its box. */
export const STAGE_FRAME = { width: 1920, height: 1080 } as const
