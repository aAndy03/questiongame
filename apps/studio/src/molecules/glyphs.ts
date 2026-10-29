import type { OverlayKind, StageScreen } from '@questiongame/contract'
import type { IconName } from '@/atoms'

/**
 * One glyph per screen and per overlay (beta.13), shared by Control's strips
 * and the Screens tab, so a screen looks the same wherever it is picked.
 */
export const SCREEN_ICON: Readonly<Record<StageScreen, IconName>> = {
  idle: 'circleDashed',
  teamOrder: 'listCheck',
  chooseDomain: 'domain',
  question: 'question',
  scoreboard: 'statistics',
  finalLeaderboard: 'flag',
  currentTeam: 'token',
}

/** Five pills under one icon read as one button five times. */
export const OVERLAY_ICON: Readonly<Record<OverlayKind, IconName>> = {
  'token-handoff': 'token',
  'round-advance': 'sync',
  'multiple-answers': 'listCheck',
  outcome: 'correct',
  'current-team': 'teams',
}
