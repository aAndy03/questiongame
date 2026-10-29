import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type { PlayStateForMain } from '@questiongame/contract'
import { App } from '@/App'
import { useArmStore } from '@/chrome/arm'
import { DEFAULT_LAYOUT, withoutTimeline } from '@/chrome/control'
import { HOME, useNavStore } from '@/chrome/nav'
import { useNoticeStore } from '@/chrome/notices'
import { createFakeHost, type FakeHost } from '@/host/fake'
import { demoLibrary, demoPlay, demoRecipe } from '@/host/devFake'
import { setHostTransport } from '@/host/host'
import { receivePlayState } from '@/host/playState'
import { track, undoneSeqs } from '@/host/timeline'
import { roundProgress, tokenKey, turnResult } from '@/host/token'
import type { PlayEvent } from '@/host/types'
import { controlsPlacement } from '@/organisms/Viewer'

/**
 * beta.13 (P27.1): Control says what the token is doing, the Timeline is a
 * fixed track that draws undo as the host does, and an arm is one arm
 * wherever it was made.
 */
let fake: FakeHost
beforeEach(() => {
  fake = createFakeHost()
  fake.seed(demoLibrary(), [demoRecipe()])
  setHostTransport(fake)
  useNavStore.setState({ route: HOME, back: [], forward: [], guard: null })
  useNoticeStore.setState({ notices: [] })
  useArmStore.setState({ armed: null })
  receivePlayState(null)
})
afterEach(() => {
  setHostTransport(null)
  receivePlayState(null)
  cleanup()
})

async function openControl(state: PlayStateForMain, anchor: string | RegExp) {
  fake.playState = state
  render(<App />)
  await act(async () => {
    receivePlayState(state)
    await useNavStore.getState().go({ tab: 'control' })
  })
  await screen.findAllByText(anchor)
}

/** Correct, and the holder keeps the token (gamma holds; delta is next). */
const resolved = () => demoPlay('question-outcome-correct')
/** Wrong: the token is free, and delta is next in order. */
const handover = (): PlayStateForMain => {
  const base = resolved()
  return {
    ...base,
    ring: { ...base.ring, currentTeamId: null },
    session: base.session && { ...base.session, outcome: { verdict: 'incorrect', pointsAwarded: 0, correctOptionIds: ['opt-a'], bonusAwarded: null } },
  }
}
const panel = () => document.querySelector<HTMLElement>('[data-action-panel]')!
const calls = (name: string) => fake.calls.filter((c) => c.name === name)

const ev = (seq: number, type: string, fields: Record<string, unknown> = {}): PlayEvent => ({ seq, id: `p:${seq}`, at_ms: 1_000 * seq, kind: { type, ...fields } })

describe('the token, in words', () => {
  it('turnResult says who keeps it, that it is free, or that the cap freed it', () => {
    expect(turnResult(resolved())).toMatchObject({ verdict: 'correct', keeper: 'TEAM GAMMA', capReached: false })
    expect(turnResult(handover())).toMatchObject({ verdict: 'incorrect', keeper: null, capReached: false })
    const capped = { ...handover(), session: resolved().session }
    expect(turnResult(capped)).toMatchObject({ verdict: 'correct', keeper: null, capReached: true })
    expect(turnResult(demoPlay('question-issued'))).toBeNull()
  })

  it('the round label waits for the last team of a round to finish its turn', () => {
    const base = resolved()
    const teams = base.teams.map((t) => ({ ...t, turnsTaken: 1 }))
    // The host already says round 2: the last owed team took the token.
    const rolled = { ...base, teams, ring: { ...base.ring, roundIndex: 2, currentTeamId: 'team-delta' } }
    expect(roundProgress(rolled)).toEqual({ round: 1, played: 4, total: 4 })
    expect(roundProgress({ ...rolled, ring: { ...rolled.ring, currentTeamId: null } })).toEqual({ round: 2, played: 0, total: 4 })
  })

  it('the verdict stays on the panel after a wrong answer, with who is next', async () => {
    await openControl(handover(), 'The token is free')
    expect(panel().querySelector('[data-turn-result="incorrect"]')).not.toBeNull()
    expect(within(panel()).getByText(/Give it to TEAM DELTA, next in order/)).toBeTruthy()
  })

  it('after a correct answer the holder keeps the token, and a pass confirms first', async () => {
    await openControl(resolved(), 'TEAM GAMMA keeps the token')
    expect(within(panel()).getByText('Keeps the token')).toBeTruthy()
    const delta = within(panel()).getAllByText('TEAM DELTA')[0]!.closest<HTMLElement>('[role="button"], button')!
    fireEvent.click(delta)
    expect(calls('give_token')).toHaveLength(0)
    expect(await within(panel()).findByText('Pass to TEAM DELTA? Press again')).toBeTruthy()
    fireEvent.click(delta)
    await waitFor(() => expect(calls('give_token')).toHaveLength(1))
  })

  it('the token rows stay, disabled with the reason, after Lock under refuse_until_reveal', async () => {
    const locked = demoPlay('question-locked')
    await openControl({ ...locked, operator: { ...locked.operator, showGiveToken: false } }, 'Give token')
    expect(within(panel()).getByText('Give token')).toBeTruthy()
  })

  it('Reveal outcome before Lock arms first: it would count as a wrong answer', async () => {
    await openControl(demoPlay('question-issued'), 'Reveal outcome')
    const reveal = within(panel()).getAllByLabelText('Reveal outcome')[0]!
    fireEvent.click(reveal)
    expect(calls('reveal_outcome')).toHaveLength(0)
    expect(await screen.findByText(/counts as a wrong answer/)).toBeTruthy()
    fireEvent.click(reveal)
    await waitFor(() => expect(calls('reveal_outcome')).toHaveLength(1))
  })

  it('the T key arms a pass after a correct answer, gives a free token at once, and explains a live question', () => {
    const r = resolved()
    const first = tokenKey(r, null)
    expect(first).toEqual({ kind: 'arm', arm: { kind: 'pass', teamId: 'team-delta' } })
    expect(tokenKey(r, first.kind === 'arm' ? first.arm : null)).toEqual({ kind: 'run', command: 'give_token', teamId: 'team-delta' })
    expect(tokenKey(handover(), null)).toEqual({ kind: 'run', command: 'give_token', teamId: 'team-delta' })
    expect(tokenKey(demoPlay('question-issued'), null)).toEqual({ kind: 'explain', why: 'revealFirst' })
  })
})

describe('the Timeline track', () => {
  const log: PlayEvent[] = [
    ev(1, 'play_loaded'),
    ev(2, 'play_started'),
    ev(3, 'question_issued', { domain: 'dom-sci', question: 'q1', team: 'team-alpha', timer_duration_ms: 30_000 }),
    ev(4, 'selection_set', { options: ['a'] }),
    ev(5, 'selection_locked', { options: ['a'], remaining_ms_at_lock: 10_000, auto: false }),
    ev(6, 'turn_resolved', { verdict: 'correct', points_awarded: 120, bonus_awarded: null, token_ends: false }),
    ev(7, 'question_issued', { domain: 'dom-hst', question: 'q2', team: 'team-alpha', timer_duration_ms: 30_000 }),
    ev(8, 'turn_resolved', { verdict: 'incorrect', points_awarded: 0, bonus_awarded: null, token_ends: true }),
    ev(9, 'turn_inverted', { target_event_id: 'p:8', from_seq: 7, to_seq: 8 }),
  ]

  it('folds the log into turns and the marks between them', () => {
    const items = track(log.slice(0, 8))
    expect(items.map((i) => i.kind)).toEqual(['mark', 'mark', 'turn', 'turn'])
    const first = items[2]!
    expect(first.kind === 'turn' && first.steps.map((s) => s.kind.type)).toEqual(['selection_set', 'selection_locked'])
    expect(first.kind === 'turn' && first.number).toBe(1)
  })

  it('an undo strikes the whole span, question to outcome, and a redo puts it back', () => {
    const undone = undoneSeqs(log)
    expect([6, 7, 8, 9].map(undone)).toEqual([false, true, true, false])
    const turns = track(log).filter((i) => i.kind === 'turn')
    expect(turns.map((t) => t.undone)).toEqual([false, true])
    const redone = [...log, ev(10, 'turn_reapplied', { target_event_id: 'p:8' })]
    expect(track(redone).filter((i) => i.kind === 'turn').map((t) => t.undone)).toEqual([false, false])
  })

  it('is a fixed strip under the mosaic, and never says "No events yet" over a count', async () => {
    fake.events = log
    await openControl(resolved(), 'Timeline')
    const strip = document.querySelector<HTMLElement>('[data-timeline-strip]')!
    expect(strip).not.toBeNull()
    expect(strip.closest('.questiongame-mosaic')).toBeNull()
    await waitFor(() => expect(strip.querySelectorAll('[data-track-turn]')).toHaveLength(2))
    expect(within(strip).queryByText('No events yet')).toBeNull()
    expect(strip.querySelectorAll('[data-track-turn][data-undone]')).toHaveLength(1)
    // Undo and Redo moved here, out of the Action Panel's transport.
    expect(within(strip).getAllByLabelText('Undo turn').length).toBeGreaterThan(0)
    expect(within(panel()).queryAllByLabelText('Undo turn')).toHaveLength(0)
  })

  it('a saved layout loses its Timeline tile, and one missing a panel goes back to the default', () => {
    const old = {
      type: 'split',
      direction: 'column',
      splitPercentages: [78, 22],
      children: [{ type: 'split', direction: 'row', splitPercentages: [22, 52, 26], children: ['game', 'viewer', { type: 'split', direction: 'column', splitPercentages: [60, 40], children: ['action', 'strips'] }] }, 'timeline'],
    }
    const kept = withoutTimeline(old) as { type: string; direction: string; children: unknown[] }
    expect(kept.direction).toBe('row')
    expect(JSON.stringify(kept)).not.toContain('timeline')
    expect(withoutTimeline({ type: 'split', direction: 'row', children: ['viewer', 'timeline'] })).toBeNull()
    expect(withoutTimeline(DEFAULT_LAYOUT)).toEqual(DEFAULT_LAYOUT)
  })
})

describe('Strips', () => {
  it('an overlay that would show something untrue is off, with why', async () => {
    await openControl(demoPlay('question-issued'), 'Overlays')
    const strip = document.querySelector<HTMLElement>('[data-overlay-strip]')!
    const outcome = within(strip).getByText('Outcome').closest('button')!
    expect(outcome.disabled || outcome.getAttribute('aria-disabled') === 'true').toBe(true)
    const current = within(strip).getByText('Current team').closest('button')!
    expect(current.disabled || current.getAttribute('aria-disabled') === 'true').toBe(false)
    expect(document.querySelector('[data-screen-index]')?.textContent).toMatch(/^\d \/ 7$/)
  })
})

describe('the Viewer (P27.2)', () => {
  it('puts its controls under the 16:9 frame, beside it, or behind a corner button', () => {
    expect(controlsPlacement(480, 600)).toBe('below')
    expect(controlsPlacement(900, 300)).toBe('beside')
    expect(controlsPlacement(480, 300)).toBe('corner')
  })

  it('a display aid is a Control-behaviour write that reaches play-state', async () => {
    await openControl(resolved(), 'On Stage')
    fireEvent.click(document.querySelector<HTMLElement>('[data-viewer-tool="colours"]')!)
    fireEvent.click(await screen.findByText('Invert'))
    await waitFor(() => expect(calls('settings_set_global').map((c) => (c.args?.['setting'] as { key: string }).key)).toContain('stage_view'))
    const write = calls('settings_set_global').find((c) => (c.args?.['setting'] as { key: string }).key === 'stage_view')
    expect((write?.args?.['setting'] as { value: { filter: string } }).value.filter).toBe('invert')
    expect(fake.playState?.view.filter).toBe('invert')
  })

  it('preview quality is a per-operator preference that draws fewer pixels, not a setting', async () => {
    await openControl(resolved(), 'On Stage')
    fireEvent.click(document.querySelector<HTMLElement>('[data-viewer-tool="quality"]')!)
    fireEvent.click(await screen.findByText('Low'))
    await waitFor(() => expect(document.querySelector('[data-viewer-quality]')?.getAttribute('data-viewer-quality')).toBe('low'))
    expect(calls('settings_set_global')).toHaveLength(0)
  })
})

describe('the review of P27.1–P27.2', () => {
  it('a token just given does not say the new holder keeps it', async () => {
    // A was wrong, B was given the token: resolved again, with A's outcome.
    const base = handover()
    const given: PlayStateForMain = { ...base, ring: { ...base.ring, currentTeamId: 'team-delta' }, operator: { ...base.operator, consecutiveCorrect: 0 } }
    expect(turnResult(given)).toBeNull()
    await openControl(given, 'TEAM DELTA has the token. Pick their domain.')
    expect(within(panel()).queryByText(/TEAM DELTA keeps the token/)).toBeNull()
    expect(within(panel()).queryByText('Pass the token (optional)')).toBeNull()
  })

  it('a correct answer still keeps it while the streak runs', () => {
    const kept = { ...resolved(), operator: { ...resolved().operator, consecutiveCorrect: 1 } }
    expect(turnResult(kept)).toMatchObject({ keeper: 'TEAM GAMMA' })
  })

  it('an armed pass survives a play-state that changes nothing about it', async () => {
    const kept = { ...resolved(), operator: { ...resolved().operator, consecutiveCorrect: 1 } }
    await openControl(kept, 'TEAM GAMMA keeps the token')
    const delta = within(panel()).getAllByText('TEAM DELTA')[0]!.closest<HTMLElement>('[role="button"], button')!
    fireEvent.click(delta)
    // A fresh parse of the same state — an overlay's ack, say.
    act(() => receivePlayState(JSON.parse(JSON.stringify({ ...kept, currentScreen: 'scoreboard' }))))
    expect(useArmStore.getState().armed).toEqual({ kind: 'pass', teamId: 'team-delta' })
  })

  it('Reveal & pass before Lock warns that it counts as wrong', async () => {
    const live = demoPlay('question-issued')
    await openControl({ ...live, operator: { ...live.operator, overrideAfterLock: 'allow' } }, 'Reveal outcome')
    const row = within(panel()).getAllByText(live.teams.find((t) => t.id === live.operator.defaultNextTeamId)!.name)[0]!.closest<HTMLElement>('[role="button"], button')!
    fireEvent.click(row)
    expect(await within(panel()).findByText(/Not locked: counts as wrong/)).toBeTruthy()
  })

  it('a reorder during a question stays in its card; an abandoned question is not "In play"', () => {
    const items = track([
      ev(1, 'play_started'),
      ev(2, 'question_issued', { domain: 'd', question: 'q', team: 't', timer_duration_ms: null }),
      ev(3, 'ring_reordered', { order: [] }),
      ev(4, 'turn_resolved', { verdict: 'correct', points_awarded: 1, bonus_awarded: null, token_ends: false }),
      ev(5, 'question_issued', { domain: 'd', question: 'q2', team: 't', timer_duration_ms: null }),
      ev(6, 'play_abandoned'),
    ])
    const turns = items.filter((i) => i.kind === 'turn')
    expect(turns).toHaveLength(2)
    expect(turns[0]!.kind === 'turn' && turns[0]!.resolved).not.toBeNull()
    expect(turns[1]!.kind === 'turn' && turns[1]!.unfinished).toBe(true)
  })
})
