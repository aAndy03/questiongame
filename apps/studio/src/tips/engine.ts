/**
 * **The tips engine** (beta.11, P25): which tip, if any, a moment earns. Pure —
 * no React, no store, no clock or dice of its own (`now` and `rand` are
 * passed in) — so every decision is reproducible in a test, simulated weeks
 * included. `docs/superpowers/specs/2026-10-28-p25-beta11-design.md` is the
 * design; every number below is named in [`TUNING`].
 *
 * The idea in one line: **a progressive tutorial over time**. One tip at a
 * time, when what the operator is doing makes it relevant; more often for
 * someone new, fewer as they show they know the app — and knowing is
 * **graded**: each use of a thing lowers the chance of its tip, use keeps it
 * known, and a skill left unused for long fades back into play. Nothing is
 * switched off by a count.
 */

/** What just happened in Studio, as a tip can answer it. */
export type Moment =
  | 'first-launch'
  | 'route:library'
  | 'route:teams'
  | 'route:games'
  | 'route:control'
  | 'route:screens'
  | 'route:statistics'
  | 'route:workspaces'
  | 'route:settings'
  | 'editor:new-question'
  | 'question:saved'
  | 'questions:selected-many'
  | 'game:opened'
  | 'game:board'
  | 'game:rules'
  | 'control:loaded'
  | 'control:rehearsal'
  | 'displays:opened'

export const MOMENTS: readonly Moment[] = [
  'first-launch',
  'route:library',
  'route:teams',
  'route:games',
  'route:control',
  'route:screens',
  'route:statistics',
  'route:workspaces',
  'route:settings',
  'editor:new-question',
  'question:saved',
  'questions:selected-many',
  'game:opened',
  'game:board',
  'game:rules',
  'control:loaded',
  'control:rehearsal',
  'displays:opened',
]

/** A tip as the engine needs it; the words are `copy/tips.ts`'. */
export interface TipRule {
  readonly id: string
  /** The moments it answers, each with how relevant it is there (0…1; 1 for its main moment). */
  readonly moments: Readonly<Partial<Record<Moment, number>>>
  /** What it teaches: a gesture id (`copy/gestures.ts`) or an action id. */
  readonly skill: string
  /** Shown only once this is somewhat known (knowledge over [`TUNING.prerequisite`]). */
  readonly requires?: string | undefined
}

/** What is remembered of one skill: evidence as of `at`. */
export interface SkillMemory {
  readonly evidence: number
  readonly at: number
}

/** What is remembered of one tip. */
export interface TipMemory {
  readonly shown: number
  readonly lastShown: number | null
  /** Its own weight after dismissals, as of `weightAt` (recovers towards 1). */
  readonly weight: number
  readonly weightAt: number
}

/** Everything the engine remembers for one operator. Plain JSON, persisted by the chrome store. */
export interface TipsState {
  readonly skills: Readonly<Record<string, SkillMemory>>
  readonly tips: Readonly<Record<string, TipMemory>>
  /** The days Studio was used on (`YYYY-MM-DD`, local), the newest last; its length is experience. */
  readonly activeDays: readonly string[]
  /** How many tips were shown on `day`. */
  readonly today: { readonly day: string; readonly shown: number }
  readonly lastShownAt: number | null
  readonly firstLaunchDone: boolean
}

export const EMPTY_TIPS_STATE: TipsState = {
  skills: {},
  tips: {},
  activeDays: [],
  today: { day: '', shown: 0 },
  lastShownAt: null,
  firstLaunchDone: false,
}

const DAY_MS = 86_400_000

/** Every number the engine decides with, in one place. */
export const TUNING = {
  /** Evidence halves after this many days without the skill being used. */
  evidenceHalfLifeDays: 21,
  /** `knowledge = 1 − e^(−evidence / scale)`: one use ≈ 0.28, five ≈ 0.81. */
  knowledgeScale: 3,
  /** How much each signal adds to a skill's evidence. */
  signal: { did: 1, read: 0.4, gotIt: 0.6 },
  /** A dismissal halves a tip's own weight… */
  dismissFactor: 0.5,
  /** …which recovers half-way towards 1 every this many days. */
  weightHalfLifeDays: 14,
  /** Below this a tip is not drawn at all. */
  floor: 0.02,
  /** A prerequisite counts once its knowledge is over this: one use (≈ 0.28) is enough. */
  prerequisite: 0.25,
  /** `novelty = base + (1 − base) · e^(−activeDays / scale)`. */
  novelty: { base: 0.15, scaleDays: 12 },
  /** No tip within `minMs` of the last; the chance rises to whole at `fullMs`. */
  quiet: { minMs: 90_000, fullMs: 300_000 },
  /** The same tip not again within this — never twice in a row in a session (review). */
  tipCooldownMs: 4 * 60 * 60_000,
  /** `cap = max(1, round(firstDay · e^(−(activeDays − 1) / scaleDays)))`. */
  dailyCap: { firstDay: 6, scaleDays: 7 },
  /** Reading speed and time for visuals; the clamp (§6.4: 30 s at most). */
  duration: { baseMs: 5_000, wordsPerSecond: 3.3, visualMs: 2_000, minMs: 8_000, maxMs: 30_000 },
  /** How many active days are kept (experience saturates long before). */
  keepDays: 120,
} as const

/** A local calendar day, `YYYY-MM-DD`. */
export function dayOf(now: number): string {
  const d = new Date(now)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** A skill's evidence as of `now`: what it was, faded by the days since. */
export function evidenceAt(memory: SkillMemory | undefined, now: number): number {
  if (!memory) return 0
  const days = Math.max(0, now - memory.at) / DAY_MS
  return memory.evidence * 2 ** (-days / TUNING.evidenceHalfLifeDays)
}

/** How well the operator knows a skill, 0…1 — never exactly 1. */
export function knowledge(state: TipsState, skill: string, now: number): number {
  return 1 - Math.exp(-evidenceAt(state.skills[skill], now) / TUNING.knowledgeScale)
}

/** A signal that the operator knows a skill: they did it (`did`), read a tip to the end, or pressed *Got it*. */
export function learn(state: TipsState, skill: string, signal: keyof typeof TUNING.signal, now: number): TipsState {
  const evidence = evidenceAt(state.skills[skill], now) + TUNING.signal[signal]
  return { ...state, skills: { ...state.skills, [skill]: { evidence, at: now } } }
}

/** A tip's own weight as of `now`: dismissals halve it, time brings it back. */
export function weightAt(memory: TipMemory | undefined, now: number): number {
  if (!memory) return 1
  const days = Math.max(0, now - memory.weightAt) / DAY_MS
  return 1 - (1 - memory.weight) * 2 ** (-days / TUNING.weightHalfLifeDays)
}

/** Closed early — *not now*, not *I know this*: that tip weighs less for a while. */
export function dismiss(state: TipsState, tipId: string, now: number): TipsState {
  const was = state.tips[tipId]
  const weight = weightAt(was, now) * TUNING.dismissFactor
  const memory: TipMemory = { shown: was?.shown ?? 0, lastShown: was?.lastShown ?? null, weight, weightAt: now }
  return { ...state, tips: { ...state.tips, [tipId]: memory } }
}

/** How new the operator is: 1 on the first day, falling towards [`TUNING.novelty.base`]. */
export function novelty(state: TipsState): number {
  const { base, scaleDays } = TUNING.novelty
  return base + (1 - base) * Math.exp(-Math.max(0, state.activeDays.length - 1) / scaleDays)
}

/** How long since the last tip, as a factor: 0 inside the quiet window, whole after it. */
export function quiet(state: TipsState, now: number): number {
  if (state.lastShownAt === null) return 1
  const { minMs, fullMs } = TUNING.quiet
  const since = now - state.lastShownAt
  // A clock set back (or a document from another machine) is not "just now":
  // tips would otherwise stay silent until the clock caught up (review).
  if (since < 0) return 1
  if (since < minMs) return 0
  return Math.min(1, (since - minMs) / (fullMs - minMs))
}

/** How many tips a day may hold, for this much experience. */
export function dailyCap(state: TipsState): number {
  const { firstDay, scaleDays } = TUNING.dailyCap
  return Math.max(1, Math.round(firstDay * Math.exp(-Math.max(0, state.activeDays.length - 1) / scaleDays)))
}

/** Studio was used today: the day counts towards experience, and today's count starts over. */
export function touchDay(state: TipsState, now: number): TipsState {
  const day = dayOf(now)
  const known = state.activeDays.includes(day)
  return {
    ...state,
    activeDays: known ? state.activeDays : [...state.activeDays, day].slice(-TUNING.keepDays),
    today: state.today.day === day ? state.today : { day, shown: 0 },
  }
}

/** The chance a tip is shown at a moment, before the dice. `0` when it cannot be. */
export function chance(state: TipsState, rule: TipRule, moment: Moment, now: number): number {
  const relevance = rule.moments[moment] ?? 0
  if (relevance <= 0) return 0
  if (rule.requires !== undefined && knowledge(state, rule.requires, now) <= TUNING.prerequisite) return 0
  const last = state.tips[rule.id]?.lastShown
  if (last !== null && last !== undefined && now >= last && now - last < TUNING.tipCooldownMs) return 0
  const p = novelty(state) * relevance * weightAt(state.tips[rule.id], now) * (1 - knowledge(state, rule.skill, now)) * quiet(state, now)
  return p < TUNING.floor ? 0 : p
}

/**
 * **The one tip a moment earns, or none.** The most likely candidate is
 * drawn, with its own chance; the first launch's *How the game plays* is the
 * one tip shown with certainty. The caller says whether a tip may show at
 * all ([`mayShow`]) before asking.
 */
export function pick(state: TipsState, rules: readonly TipRule[], moment: Moment, now: number, rand: () => number): TipRule | null {
  if (moment === 'first-launch') {
    if (state.firstLaunchDone) return null
    return rules.find((r) => (r.moments['first-launch'] ?? 0) > 0) ?? null
  }
  if (state.today.day === dayOf(now) && state.today.shown >= dailyCap(state)) return null
  let best: { rule: TipRule; p: number } | null = null
  for (const rule of rules) {
    const p = chance(state, rule, moment, now)
    if (p > 0 && (best === null || p > best.p)) best = { rule, p }
  }
  if (best === null) return null
  return rand() < best.p ? best.rule : null
}

/** The tip went up: counted for the day, the quiet window starts. */
export function shown(state: TipsState, rule: TipRule, now: number): TipsState {
  const touched = touchDay(state, now)
  const was = touched.tips[rule.id]
  const memory: TipMemory = { shown: (was?.shown ?? 0) + 1, lastShown: now, weight: was?.weight ?? 1, weightAt: was?.weightAt ?? now }
  return {
    ...touched,
    tips: { ...touched.tips, [rule.id]: memory },
    today: { day: touched.today.day, shown: touched.today.shown + 1 },
    lastShownAt: now,
    firstLaunchDone: touched.firstLaunchDone || (rule.moments['first-launch'] ?? 0) > 0,
  }
}

/** Whether any tip may show now (§6.6, §6.7): tips on, no show running unless a rehearsal, no dialog open. */
export function mayShow(context: { readonly tipsOn: boolean; readonly playOpen: boolean; readonly rehearsal: boolean; readonly dialogOpen: boolean }): boolean {
  return context.tipsOn && (!context.playOpen || context.rehearsal) && !context.dialogOpen
}

/** How long a tip stays: time to read it and to look at its visuals, 8–30 s. */
export function duration(words: number, visuals: number): number {
  const { baseMs, wordsPerSecond, visualMs, minMs, maxMs } = TUNING.duration
  const ms = baseMs + (words / wordsPerSecond) * 1000 + visuals * visualMs
  return Math.round(Math.min(maxMs, Math.max(minMs, ms)))
}

/** A seeded random source (mulberry32), for tests and for simulated weeks. */
export function seeded(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296
  }
}
