/**
 * **How Studio tells the tips what happened** (beta.11). Two one-line calls,
 * made where the thing happens:
 *
 * - `tipMoment('question:saved')` — a moment a tip may answer. Only
 *   `TipHost` listens; with none mounted (Statistics' window, a test) it is
 *   dropped, never queued: a tip about a moment that has passed is noise.
 * - `tipLearned('drag-to-domain')` — the operator **did** the thing. Written to
 *   the operator's memory at once, tips on or off, so turning tips back on
 *   does not start them from nothing.
 *
 * Every read of the time goes through [`tipsClock`], so a test owns it.
 */
import { useChromeStore } from '@/chrome/chrome'
import { learn, type Moment } from './engine'

type Listener = (moment: Moment) => void
const listeners = new Set<Listener>()

let clock: () => number = () => Date.now()

/** The time, as the tips see it. */
export function tipsClock(): number {
  return clock()
}

/** Tests only: a clock of their own; `null` puts the real one back. */
export function setTipsClock(next: (() => number) | null): void {
  clock = next ?? (() => Date.now())
}

/** A moment happened; a tip may answer it. */
export function tipMoment(moment: Moment): void {
  for (const listener of listeners) listener(moment)
}

/** `TipHost` listens; the returned function stops it. */
export function onTipMoment(listener: Listener): () => void {
  listeners.add(listener)
  return () => void listeners.delete(listener)
}

/** When each skill last counted, so a held key or a search typed in pauses is one use (review). */
const lastLearned = new Map<string, number>()
const ONE_USE_MS = 60_000

/** The operator did what a skill names: its tips grow less likely (graded, `tips/engine.ts`). */
export function tipLearned(skill: string): void {
  const now = clock()
  const last = lastLearned.get(skill)
  if (last !== undefined && now >= last && now - last < ONE_USE_MS) return
  lastLearned.set(skill, now)
  useChromeStore.getState().updateTips((state) => learn(state, skill, 'did', now))
}

/** Tests only: forget when skills last counted. */
export function resetTipsLearned(): void {
  lastLearned.clear()
}
