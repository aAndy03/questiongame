/**
 * What the token is doing, in words (beta.13) — derived from `play-state` and
 * nothing else, so the Action Panel, the Game panel, the Viewer and the T key
 * say the same thing. The rule itself is the host's (§5.4): a correct answer
 * keeps the token unless the cap is reached, a wrong one frees it, and passing
 * before that is an override.
 */

import type { OutcomeVerdict, PlayStateForMain } from '@questiongame/contract'
import type { Arm } from '@/chrome/arm'
import { controlPhase, isSessionLive } from './session'

export interface TurnResult {
  readonly verdict: OutcomeVerdict
  readonly points: number
  readonly bonus: number | null
  /** The team still holding the token, or null when it is free. */
  readonly keeper: string | null
  /** A correct answer that freed the token: the consecutive-correct cap. */
  readonly capReached: boolean
}

/**
 * The last reveal, while it still decides what happens next: `resolved` (the
 * holder keeps the token) and `handover` (it is free). The projection keeps
 * the resolved session until the next question replaces it.
 */
export function turnResult(play: PlayStateForMain | null): TurnResult | null {
  const phase = controlPhase(play)
  const outcome = play?.session?.outcome ?? null
  if (!play || !outcome || (phase !== 'resolved' && phase !== 'handover')) return null
  const keeper = play.ring.currentTeamId === null ? null : (play.teams.find((t) => t.id === play.ring.currentTeamId)?.name ?? null)
  return {
    verdict: outcome.verdict,
    points: outcome.pointsAwarded,
    bonus: outcome.bonusAwarded,
    keeper,
    capReached: outcome.verdict === 'correct' && play.ring.currentTeamId === null,
  }
}

export interface RoundProgress {
  readonly round: number
  readonly played: number
  readonly total: number
}

/**
 * The round **being played**, and how many active teams have had their turn
 * in it.
 *
 * The host moves `roundIndex` on the moment the last owed team *receives* the
 * token, so reading it straight says "Round 2" while that team is still
 * answering its round-1 question. The holder's own count is the round of the
 * turn on screen; with the token free, `roundIndex` is the round to come.
 */
export function roundProgress(play: PlayStateForMain): RoundProgress {
  const active = play.teams.filter((t) => t.active)
  const holder = play.teams.find((t) => t.id === play.ring.currentTeamId)
  // The rollover: the holder took the last token owed in round r, so every
  // active team stands at r and the host already says r + 1.
  const previous = play.ring.roundIndex - 1
  const rolled = holder !== undefined && previous >= 1 && active.every((t) => t.turnsTaken === previous)
  const round = rolled ? previous : play.ring.roundIndex
  return { round, played: active.filter((t) => t.turnsTaken >= round).length, total: active.length }
}

/** What the give-token key does now: arm, run, or say why it does nothing. */
export type TokenKeyAction =
  | { readonly kind: 'arm'; readonly arm: Arm }
  | { readonly kind: 'run'; readonly command: 'give_token' | 'reveal_and_pass'; readonly teamId: string }
  | { readonly kind: 'explain'; readonly why: 'revealFirst' | 'noTarget' | 'solo' }

/**
 * The T key (beta.13). It used to pass the token silently right after a
 * correct answer — an override on one keystroke — and did nothing, silently,
 * during a question. Now:
 *
 *   handover  gives the free token to the next team at once: it has to go somewhere
 *   resolved  arms a pass; the second press passes
 *   question  arms *Reveal & pass* under `allow`; under `refuse_until_reveal` says so
 */
export function tokenKey(play: PlayStateForMain, armed: Arm | null): TokenKeyAction {
  const target = play.operator.defaultNextTeamId
  const phase = controlPhase(play)
  if (isSessionLive(play)) {
    if (play.operator.overrideAfterLock === 'refuse_until_reveal') return { kind: 'explain', why: 'revealFirst' }
    if (!target) return { kind: 'explain', why: 'noTarget' }
    return armed?.kind === 'reveal-and-pass' && armed.teamId === target ? { kind: 'run', command: 'reveal_and_pass', teamId: target } : { kind: 'arm', arm: { kind: 'reveal-and-pass', teamId: target } }
  }
  if (!target) return { kind: 'explain', why: play.operator.isRehearsal && phase === 'resolved' ? 'solo' : 'noTarget' }
  if (phase === 'handover') return { kind: 'run', command: 'give_token', teamId: target }
  return armed?.kind === 'pass' && armed.teamId === target ? { kind: 'run', command: 'give_token', teamId: target } : { kind: 'arm', arm: { kind: 'pass', teamId: target } }
}
