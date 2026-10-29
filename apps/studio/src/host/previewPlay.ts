/**
 * A stand-in Play for the Screens canvas (05_STUDIO_DESIGN.md §11.3): built
 * from the recipe and its catalog rows so every screen has something to
 * draw. It never touches the host and is never a `play-state`; it exists so
 * the canvas iframe can show the recipe's own teams and questions while the
 * operator restyles a node.
 */

import {
  DEFAULT_DECOR_SETTINGS,
  EMPTY_PLAY_STATE,
  type OverlayKind,
  type OverlayRequest,
  type PlayStateForStage,
  type StageDecorSettings,
  type StageLanguage,
  type StageMotion,
  type StageScreen,
  type StageTeam,
} from '@questiongame/contract'
import type { StageLayoutNodes } from '@questiongame/contract'
import type { Domain, Question, Recipe, Team } from './types'

export interface PreviewSources {
  readonly recipe: Recipe
  readonly teams: readonly Team[]
  readonly domains: readonly Domain[]
  readonly questions: readonly Question[]
}

/**
 * What the canvas draws the preview with besides the layout (beta.13): the
 * game's decor dials — the preview had the defaults, so no dial did anything
 * on the canvas — whether the shapes move, and which language's words show.
 */
export interface PreviewLook {
  readonly decor?: StageDecorSettings | undefined
  readonly motion?: StageMotion | undefined
  readonly language?: StageLanguage | undefined
}

/**
 * The same stand-in Play with one overlay on air over `screen`. The canvas
 * iframe runs in hold mode, so the overlay is drawn at rest rather than
 * played. `outcome` is half-screen and only means anything over a question,
 * so it takes the Question screen whatever was picked.
 */
export function previewOverlay(src: PreviewSources, kind: OverlayKind, screen: StageScreen, layout: StageLayoutNodes, look: PreviewLook = {}): PlayStateForStage {
  const base = previewPlay(src, kind === 'outcome' || kind === 'multiple-answers' ? 'question' : screen, layout, look)
  const first = base.teams[0]?.id ?? null
  const second = base.teams[1]?.id ?? first
  const options = base.session?.options.map((o) => o.id) ?? []
  const request: OverlayRequest | null =
    kind === 'token-handoff' && second ? { kind, fromTeamId: first, toTeamId: second }
    : kind === 'round-advance' ? { kind, roundIndex: base.ring.roundIndex }
    : kind === 'multiple-answers' ? { kind, optionIds: options.slice(0, 2) }
    : kind === 'outcome' ? { kind, verdict: 'correct' }
    : kind === 'current-team' ? { kind, teamId: first }
    : null
  if (!request) return base
  return { ...base, overlay: { busy: true, active: request, pending: null, enabled: true, runId: 1 } }
}

export function previewPlay(src: PreviewSources, screen: StageScreen, layout: StageLayoutNodes, look: PreviewLook = {}): PlayStateForStage {
  const byTeam = new Map(src.teams.map((t) => [t.id, t]))
  const teams: StageTeam[] = []
  src.recipe.teams.forEach((id, i) => {
      const t = byTeam.get(id)
      if (!t) return
      const o = src.recipe.overlays.teams[id]
      teams.push({
        id,
        name: o?.name ?? t.name,
        shortCode: o?.shortCode ?? t.shortCode,
        color: o?.color ?? t.color,
        logoUrl: null,
        // The team's notes, as the host's snapshot reads them — with `null`
        // here the Detail label could never be seen on the canvas (beta.13).
        detail: t.notes ?? null,
        score: Math.max(0, 500 - i * 120),
        rank: i + 1,
        turnsTaken: i === 0 ? 2 : 1,
        active: true,
      })
  })
  const byDomain = new Map(src.domains.map((d) => [d.id, d]))
  const byQuestion = new Map(src.questions.map((q) => [q.id, q]))
  const domains = src.recipe.board
    .map((b) => {
      const d = byDomain.get(b.domainId)
      if (!d) return null
      const o = src.recipe.overlays.domains[b.domainId]
      const first = b.questionIds.map((id) => byQuestion.get(id)).find(Boolean)
      return {
        id: d.id,
        name: o?.name ?? d.name,
        code: o?.code ?? d.code,
        remaining: b.questionIds.length,
        exhausted: b.questionIds.length === 0,
        nextDifficulty: first ? (src.recipe.overlays.questions[first.id]?.difficulty ?? first.difficulty ?? null) : null,
      }
    })
    .filter((d): d is NonNullable<typeof d> => d !== null)
  const firstBoard = src.recipe.board.find((b) => b.questionIds.length > 0)
  const q = firstBoard ? byQuestion.get(firstBoard.questionIds[0] ?? '') : undefined
  const qo = q ? src.recipe.overlays.questions[q.id] : undefined
  const options = (qo?.options ?? q?.options ?? []).map((o) => ({ id: o.id, text: o.text }))
  const session =
    screen === 'question' && q && firstBoard
      ? {
          questionId: q.id,
          domainId: firstBoard.domainId,
          stem: qo?.stem ?? q.stem,
          options,
          answerMode: (qo?.options ?? q.options).filter((o) => o.correct).length > 1 ? ('multiple' as const) : ('single' as const),
          // A preview draws; nothing is scored here, so an unset difficulty
          // (an incomplete question, §2.32) is drawn as 0.
          difficulty: qo?.difficulty ?? q.difficulty ?? 0,
          selectedOptionIds: [],
          lockedOptionIds: null,
          outcome: null,
          // The game's own clock: none at operator pace, as Stage hides it (beta.13).
          timer: timerOf(src.recipe),
          reveals: { stem: true, optionIds: options.map((o) => o.id), outcome: false },
        }
      : null
  return {
    ...EMPTY_PLAY_STATE,
    playId: `preview-${src.recipe.id}`,
    status: 'playing',
    teams,
    ring: { order: teams.map((t) => t.id), currentTeamId: teams[0]?.id ?? null, roundIndex: 2 },
    domains,
    session,
    clock: { elapsedMs: 740_000, running: false },
    leaderboardRevealedRanks: screen === 'finalLeaderboard' ? teams.map((t) => t.rank) : [],
    layout,
    questionsIssued: 5,
    currentScreen: screen,
    // The canvas draws the recipe's own language unless the operator is
    // editing another (beta.13); a row written before the key existed reads
    // as English, the way the host reads it.
    language: look.language ?? src.recipe.settings.language ?? 'en',
    decor: look.decor ?? DEFAULT_DECOR_SETTINGS,
    view: { ...EMPTY_PLAY_STATE.view, motion: look.motion ?? 'full' },
  }
}

function timerOf(recipe: Recipe): NonNullable<PlayStateForStage['session']>['timer'] {
  if (recipe.settings.timer.enabled === false) return null
  const ms = recipe.settings.timer.duration_ms ?? 30_000
  return { durationMs: ms, remainingMs: ms, running: false, remainingMsAtLock: null, expiredOpen: false }
}
