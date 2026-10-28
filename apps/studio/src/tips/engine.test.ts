import { describe, expect, it } from 'vitest'
import {
  EMPTY_TIPS_STATE,
  TUNING,
  chance,
  dailyCap,
  dismiss,
  duration,
  knowledge,
  learn,
  mayShow,
  novelty,
  pick,
  quiet,
  seeded,
  shown,
  touchDay,
  type Moment,
  type TipRule,
  type TipsState,
} from './engine'

/** beta.11: the engine, pure — graded knowledge, never a switch (the design's correction at approval). */
const DAY = 86_400_000
const T0 = new Date(2026, 9, 28, 10).getTime()
const drag: TipRule = { id: 'drag', moments: { 'route:library': 1, 'question:saved': 0.6 }, skill: 'drag-to-domain' }
const move: TipRule = { id: 'move', moments: { 'route:library': 0.8 }, skill: 'mod-drag-move', requires: 'drag-to-domain' }
const welcome: TipRule = { id: 'welcome', moments: { 'first-launch': 1 }, skill: 'how-the-game-plays' }
const fresh = (): TipsState => touchDay(EMPTY_TIPS_STATE, T0)

describe('knowing is graded (beta.11)', () => {
  it('one use lowers the chance by about a quarter, five by about 80 %, never to zero', () => {
    const p0 = chance(fresh(), drag, 'route:library', T0)
    let s = learn(fresh(), 'drag-to-domain', 'did', T0)
    const p1 = chance(s, drag, 'route:library', T0)
    expect(1 - p1 / p0).toBeGreaterThan(0.2)
    expect(1 - p1 / p0).toBeLessThan(0.35)
    for (let i = 0; i < 4; i++) s = learn(s, 'drag-to-domain', 'did', T0)
    expect(knowledge(s, 'drag-to-domain', T0)).toBeGreaterThan(0.78)
    expect(knowledge(s, 'drag-to-domain', T0)).toBeLessThan(1)
  })

  it('doing counts more than reading a tip, and Got it lies between', () => {
    const k = (signal: 'did' | 'read' | 'gotIt') => knowledge(learn(fresh(), 'x', signal, T0), 'x', T0)
    expect(k('did')).toBeGreaterThan(k('gotIt'))
    expect(k('gotIt')).toBeGreaterThan(k('read'))
  })

  it('fades when unused: half the evidence after three weeks, and the tip comes back', () => {
    let s = fresh()
    for (let i = 0; i < 12; i++) s = learn(s, 'drag-to-domain', 'did', T0)
    const now = knowledge(s, 'drag-to-domain', T0)
    const later = knowledge(s, 'drag-to-domain', T0 + 21 * DAY)
    const muchLater = knowledge(s, 'drag-to-domain', T0 + 120 * DAY)
    expect(later).toBeLessThan(now)
    expect(muchLater).toBeLessThan(0.2)
    expect(chance(s, drag, 'route:library', T0)).toBe(0) // under the floor while it is in use
    expect(chance(s, drag, 'route:library', T0 + 120 * DAY)).toBeGreaterThan(0)
  })

  it('is never retired by a count of uses or shows', () => {
    let s = fresh()
    for (let i = 0; i < 3; i++) s = shown(s, drag, T0 + i * DAY)
    expect(chance(s, drag, 'route:library', T0 + 10 * DAY)).toBeGreaterThan(0)
  })
})

describe('dismissing is "not now" (beta.11)', () => {
  it('halves that tip’s weight, which recovers over two weeks', () => {
    const p0 = chance(fresh(), drag, 'route:library', T0)
    const s = dismiss(fresh(), 'drag', T0)
    expect(chance(s, drag, 'route:library', T0)).toBeCloseTo(p0 * TUNING.dismissFactor, 5)
    expect(chance(s, drag, 'route:library', T0 + 14 * DAY)).toBeGreaterThan(p0 * 0.7)
  })

  it('again and again fades a tip out, and it can still come back much later', () => {
    let s = fresh()
    for (let i = 0; i < 6; i++) s = dismiss(s, 'drag', T0)
    expect(chance(s, drag, 'route:library', T0)).toBe(0)
    expect(chance(s, drag, 'route:library', T0 + 90 * DAY)).toBeGreaterThan(0)
  })

  it('does not touch the skill: the other tips about it are as likely as before', () => {
    const s = dismiss(fresh(), 'drag', T0)
    expect(knowledge(s, 'drag-to-domain', T0)).toBe(0)
  })
})

describe('the chance (beta.11)', () => {
  it('is zero under the 2 % floor', () => {
    let s = fresh()
    for (let i = 0; i < 20; i++) s = learn(s, 'drag-to-domain', 'did', T0)
    expect(chance(s, drag, 'route:library', T0)).toBe(0)
  })

  it('waits for a prerequisite to be somewhat known', () => {
    expect(chance(fresh(), move, 'route:library', T0)).toBe(0)
    const s = learn(fresh(), 'drag-to-domain', 'did', T0)
    expect(chance(s, move, 'route:library', T0)).toBeGreaterThan(0)
  })

  it('is zero at a moment the tip does not answer, and smaller where it is less relevant', () => {
    expect(chance(fresh(), drag, 'route:games', T0)).toBe(0)
    expect(chance(fresh(), drag, 'question:saved', T0)).toBeLessThan(chance(fresh(), drag, 'route:library', T0))
  })

  it('keeps quiet for 90 s after a tip, and is whole again after 5 minutes', () => {
    const s = shown(fresh(), drag, T0)
    expect(quiet(s, T0 + 60_000)).toBe(0)
    expect(quiet(s, T0 + 200_000)).toBeGreaterThan(0)
    expect(quiet(s, T0 + 200_000)).toBeLessThan(1)
    expect(quiet(s, T0 + 300_000)).toBe(1)
  })

  it('falls with experience, and so does the daily cap', () => {
    let s = fresh()
    const first = novelty(s)
    expect(dailyCap(s)).toBe(TUNING.dailyCap.firstDay)
    for (let d = 1; d < 21; d++) s = touchDay(s, T0 + d * DAY)
    expect(novelty(s)).toBeLessThan(first / 2)
    expect(dailyCap(s)).toBe(1)
  })
})

describe('picking (beta.11)', () => {
  it('shows How the game plays on first launch with certainty, once', () => {
    const never = () => 0.999
    expect(pick(fresh(), [drag, welcome], 'first-launch', T0, never)?.id).toBe('welcome')
    const s = shown(fresh(), welcome, T0)
    expect(pick(s, [drag, welcome], 'first-launch', T0, never)).toBeNull()
  })

  it('draws the most likely candidate, by its own chance', () => {
    const s = learn(fresh(), 'drag-to-domain', 'did', T0) // move's prerequisite, drag a little known
    expect(pick(s, [drag, move], 'route:library', T0, () => 0)?.id).toBe('move')
    expect(pick(s, [drag, move], 'route:library', T0, () => 0.999)).toBeNull()
  })

  it('stops at the day’s cap', () => {
    let s = fresh()
    for (let i = 0; i < TUNING.dailyCap.firstDay; i++) s = shown(s, drag, T0 + i * 1000)
    expect(pick(s, [drag], 'route:library', T0 + DAY / 2, () => 0)).toBeNull()
    expect(pick(touchDay(s, T0 + DAY), [drag], 'route:library', T0 + DAY, () => 0)?.id).toBe('drag')
  })

  it('says no tip at all while a show runs, unless it is a rehearsal, or while a dialog is open', () => {
    const base = { tipsOn: true, playOpen: false, rehearsal: false, dialogOpen: false }
    expect(mayShow(base)).toBe(true)
    expect(mayShow({ ...base, playOpen: true })).toBe(false)
    expect(mayShow({ ...base, playOpen: true, rehearsal: true })).toBe(true)
    expect(mayShow({ ...base, dialogOpen: true })).toBe(false)
    expect(mayShow({ ...base, tipsOn: false })).toBe(false)
  })
})

describe('over simulated weeks (beta.11)', () => {
  /** An operator who opens the library a dozen times a day and drags now and then. */
  function simulate(days: number, seed: number) {
    const rand = seeded(seed)
    const rules = [drag, move, { id: 'import', moments: { 'route:library': 0.7 } as Partial<Record<Moment, number>>, skill: 'import' }]
    let s = EMPTY_TIPS_STATE
    const perDay: number[] = []
    const times: number[] = []
    for (let d = 0; d < days; d++) {
      let count = 0
      for (let visit = 0; visit < 12; visit++) {
        const now = T0 + d * DAY + visit * 20 * 60_000
        s = touchDay(s, now)
        const tip = pick(s, rules, 'route:library', now, rand)
        if (tip) {
          s = shown(s, tip, now)
          times.push(now)
          count++
        }
        if (rand() < 0.3) s = learn(s, 'drag-to-domain', 'did', now)
      }
      perDay.push(count)
    }
    return { perDay, times }
  }

  it('shows a new operator several tips and an experienced one almost none', () => {
    const { perDay } = simulate(28, 7)
    const firstWeek = perDay.slice(0, 7).reduce((a, b) => a + b, 0)
    const fourthWeek = perDay.slice(21).reduce((a, b) => a + b, 0)
    expect(firstWeek).toBeGreaterThan(fourthWeek)
    expect(Math.max(...perDay.slice(21))).toBeLessThanOrEqual(1)
  })

  it('never shows two tips inside the quiet window', () => {
    const { times } = simulate(28, 11)
    for (let i = 1; i < times.length; i++) expect((times[i] ?? 0) - (times[i - 1] ?? 0)).toBeGreaterThanOrEqual(TUNING.quiet.minMs)
  })
})

describe('how long a tip stays (beta.11)', () => {
  it('is time to read and to look, from 8 s to 30 s', () => {
    expect(duration(3, 0)).toBe(TUNING.duration.minMs)
    expect(duration(40, 1)).toBeGreaterThan(duration(40, 0))
    expect(duration(40, 0)).toBeGreaterThan(duration(20, 0))
    expect(duration(400, 4)).toBe(TUNING.duration.maxMs)
  })
})
