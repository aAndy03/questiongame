/**
 * The Timeline as a track (beta.13): the event log folded into **turns** and
 * the moments between them, left to right. Pure, so the grouping and the undo
 * spans are testable without a host.
 *
 * Undo is drawn as the host does it. `turn_inverted` takes a *span* out of the
 * projection — from the `question_issued` that opened the turn to the end of
 * the log at the time — and `turn_reapplied` puts the span named by the same
 * resolve back (`event.rs`, `active_inversions`). The old list struck only the
 * one resolve row, so the question, the selection and the lock of an undone
 * turn all looked live.
 */

import type { PlayEvent } from './types'

/** The events a turn holds between its question and its outcome. */
const STEP_KINDS = new Set(['stem_revealed', 'option_revealed', 'selection_set', 'timer_started', 'timer_paused', 'timer_expired', 'selection_locked'])
/** Lifecycle events that, during an open question, belong to its card. */
const IN_TURN_KINDS = new Set(['paused', 'resumed', 'settings_live_changed', 'operator_switched'])

export interface TurnItem {
  readonly kind: 'turn'
  readonly key: string
  /** The question's place in this Play, counting the turns still in effect. */
  readonly number: number
  readonly domainId: string
  readonly teamId: string | null
  readonly issued: PlayEvent
  readonly steps: readonly PlayEvent[]
  /** The outcome, or null while the question is still being played. */
  readonly resolved: PlayEvent | null
  readonly undone: boolean
}

export interface MarkItem {
  readonly kind: 'mark'
  readonly key: string
  readonly event: PlayEvent
  readonly undone: boolean
}

export type TrackItem = TurnItem | MarkItem

/** Every seq an undo currently holds out, from the log alone. */
export function undoneSeqs(events: readonly PlayEvent[]): (seq: number) => boolean {
  const spans: { target: string; from: number; to: number }[] = []
  for (const e of events) {
    const target = e.kind['target_event_id']
    if (typeof target !== 'string') continue
    if (e.kind.type === 'turn_inverted') {
      const from = Number(e.kind['from_seq'])
      const to = Number(e.kind['to_seq'])
      if (Number.isFinite(from) && Number.isFinite(to)) spans.push({ target, from, to })
    } else if (e.kind.type === 'turn_reapplied') {
      const at = spans.findIndex((s) => s.target === target)
      if (at >= 0) spans.splice(at, 1)
    }
  }
  return (seq) => spans.some((s) => seq >= s.from && seq <= s.to)
}

/** The log as the strip draws it: turns, and the marks between them. */
export function track(events: readonly PlayEvent[]): TrackItem[] {
  const undone = undoneSeqs(events)
  const out: TrackItem[] = []
  let turn: { item: TurnItem; steps: PlayEvent[] } | null = null
  let number = 0
  const close = () => {
    if (turn) out.push({ ...turn.item, steps: turn.steps })
    turn = null
  }
  for (const e of events) {
    const type = e.kind.type
    if (type === 'question_issued') {
      close()
      const isUndone = undone(e.seq)
      if (!isUndone) number += 1
      turn = {
        item: {
          kind: 'turn',
          key: e.id,
          number: isUndone ? number + 1 : number,
          domainId: String(e.kind['domain'] ?? ''),
          teamId: typeof e.kind['team'] === 'string' ? e.kind['team'] : null,
          issued: e,
          steps: [],
          resolved: null,
          undone: isUndone,
        },
        steps: [],
      }
    } else if (turn && (STEP_KINDS.has(type) || IN_TURN_KINDS.has(type))) {
      // A pause or a setting change during a question is part of that turn.
      turn.steps.push(e)
    } else if (turn && type === 'turn_resolved') {
      turn.item = { ...turn.item, resolved: e }
      close()
    } else {
      close()
      out.push({ kind: 'mark', key: e.id, event: e, undone: undone(e.seq) })
    }
  }
  close()
  return out
}

/** The verdict and points of a resolve, from the wire's own field names. */
export function resolvedOf(e: PlayEvent): { verdict: string; points: number; bonus: number | null } {
  const points = e.kind['points_awarded']
  const bonus = e.kind['bonus_awarded']
  return {
    verdict: String(e.kind['verdict'] ?? ''),
    points: typeof points === 'number' ? points : 0,
    bonus: typeof bonus === 'number' ? bonus : null,
  }
}
