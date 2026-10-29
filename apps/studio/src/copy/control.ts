/**
 * Control tab copy (P8). Vocabulary from docs/v1/03_CONTEXT.md: token, ring,
 * round, session, Select → Lock → Reveal, operator pace.
 */

import type { OverlayKind, StageScreen } from '@questiongame/contract'

export const CONTROL = {
  title: 'Control',
  noRecipe: 'Nothing in Control',
  noRecipeBody: 'Open a game and press Load into Control. The Stage window opens with it.',
  goToGames: 'Go to Games',
  /** beta.10: Control's empty state offers the games to pick up again. */
  recentTitle: 'Pick up where you left off',
  recentLoad: 'Load into Control',
  recentPlayed: (when: string) => `Played ${when}`,
  recentEdited: (when: string) => `Edited ${when}`,
  recentCounts: (teams: number, questions: number) =>
    `${teams} ${teams === 1 ? 'team' : 'teams'} · ${questions} ${questions === 1 ? 'question' : 'questions'}`,
  justNow: 'just now',
  panels: {
    viewer: 'Viewer',
    game: 'Game',
    action: 'Action Panel',
    strips: 'Strips',
    timeline: 'Timeline',
  },
  resetLayout: 'Reset layout',
  density: { comfortable: 'Comfortable', compact: 'Compact', dense: 'Dense' },
  stageDisplay: 'Stage display',
  /** Shown beside the picker when Stage is mirrored (§9, P11.11). */
  stageDisplayCount: (n: number) => `${n} displays`,
  statsDisplay: 'Statistics display',
  primaryDisplay: 'Primary display',
  openStage: 'Open Stage',
  /** beta.10: every Stage window goes; where it was is kept for the next Open Stage. */
  closeStage: 'Close Stage',
  /** The settings float's name — "Settings" alone is the sidebar's (P21.4: both in the shell). */
  settings: 'Control settings',
  settingsGlobal: 'Global',
  settingsCurrentGame: 'Current game',
  settingsNoGame: 'No game in Control.',
  hitTargets: 'Viewer hit targets',
  viewerLoading: 'Stage is loading…',
  viewerNoHost: 'The Viewer embeds the Stage window; it needs the desktop app.',
} as const

export const TRANSPORT = {
  start: 'Start Play',
  pause: 'Pause',
  resume: 'Resume',
  restart: 'Restart',
  restartSame: 'Same questions',
  restartDifferent: 'Different questions',
  restartTitle: 'Restart this Play?',
  restartBody: 'The current Play closes and a new one opens now, from the same game. Scores reset.',
  abandon: 'Abandon',
  abandonTitle: 'Abandon this Play?',
  abandonBody: 'The Play ends as abandoned. Its events stay on record. This cannot be undone from Control.',
  undo: 'Undo turn',
  redo: 'Redo turn',
  /** Why Undo / Redo are off when no overlay is in the way (beta.13). */
  nothingToUndo: 'Nothing to undo yet',
  redoAfterUndo: 'Redo is only available right after an undo',
  waitOverlay: 'Wait for the overlay to finish',
  ended: 'The Play has ended',
  notStarted: 'Press Start Play first',
} as const

/** Taking the game back out of Control (§5.1). */
export const UNLOAD = {
  action: 'Unload game',
  hint: 'Take this game out of Control. Stage goes back to Idle and stays where it is.',
  title: 'Unload the game?',
  /** An open Play is abandoned on the way out — say so before it happens. */
  bodyOpen: 'This Play is still open. Unloading abandons it.',
  bodyClosed: 'Stage returns to Idle. The game stays in the library.',
  /** The record question. Keeping is the answer that needs no thought. */
  keep: 'Keep the record',
  keepHint: 'The Play, its Timeline and its numbers stay under this game.',
  discard: 'Discard it',
  discardHint: 'Delete this Play and its Timeline. It leaves Statistics too. This cannot be undone.',
  confirm: 'Unload',
  confirmDiscard: 'Unload and discard',
  done: 'Game unloaded',
  doneDiscarded: 'Game unloaded, Play discarded',
  /** Nothing was played, so there is nothing to keep or discard. */
  neverStarted: 'Nothing was played, so no record is kept.',
} as const

export const TIMER = {
  start: 'Start timer',
  pause: 'Pause timer',
  operatorPace: 'Operator pace',
  /** Where the clock would be, when the game runs without one (beta.13). */
  operatorPaceHint: 'No countdown: you lock and reveal when the team is ready.',
  expired: 'Expired',
  locked: 'Locked',
} as const

export const SESSION = {
  noSession: 'No question issued',
  chooseDomainHint: 'Pick a domain below, on the Viewer, or with 1-9.',
  nextQuestion: 'Next question',
  nextQuestionHint: 'The same team keeps the token until it answers wrong.',
  domainDifficulty: (n: number) => `D${n}`,
  revealFirstToContinue: 'Reveal the outcome first',
  revealStem: 'Reveal question',
  revealOption: 'Reveal next answer',
  revealOutcome: 'Reveal outcome',
  lock: 'Lock',
  lockHint: 'Freezes the choice and stops the timer. Nothing is scored until reveal.',
  selection: 'Selection',
  noSelection: 'Nothing selected',
  giveToken: 'Give token',
  giveTokenNow: 'Give the token',
  placesRevealed: (shown: number, total: number) => `${shown} of ${total} places revealed`,
  giveTokenTo: (name: string) => `Give token to ${name}`,
  revealAndPass: 'Reveal & pass',
  revealFirst: 'Reveal first',
  armed: 'Press again to confirm',
  /**
   * The turn's result, kept on screen after the reveal (beta.13): what was
   * scored, and what happened to the token because of it.
   */
  result: {
    keeps: (team: string) => `${team} keeps the token`,
    free: 'The token is free',
    /** The token was just given: the result on screen is the last team's. */
    given: (team: string) => `${team} has the token. Pick their domain.`,
    capReached: 'Cap reached: the token is free',
  },
  /** `resolved`: passing is an override, never the next step. */
  passOptional: 'Pass the token (optional)',
  handoverNext: (team: string) => `Give it to ${team}, next in order, or press another team.`,
  handoverNone: 'Give it to a team to continue.',
  passArmed: (team: string) => `Pass to ${team}? Press again`,
  revealAndPassArmed: (team: string) => `Reveal and pass to ${team}? Press again`,
  /** Reveal & pass before Lock is scored as an empty answer, as Reveal is (review). */
  revealAndPassUnlocked: (team: string) => `Not locked: counts as wrong. Reveal and pass to ${team}? Press again`,
  /** Reveal before Lock counts as an empty answer (`rules.rs`): arm first. */
  revealUnlocked: 'Not locked: this counts as a wrong answer. Press again to reveal.',
  pausedReason: 'Resume the Play first',
  autoReveal: 'Stage reveals this by itself',
  /** The T key, when there is nothing it can do. */
  tokenKeyNothing: {
    revealFirst: 'Reveal the outcome before passing the token',
    noTarget: 'No team can take the token now',
    solo: 'The only team keeps the token',
  },
  roundProgress: (round: number, played: number, total: number) => `Round ${round} · ${played} of ${total} played`,
  domainInPlay: 'In play',
  optionKey: (key: string, letter: string) => `${key} · ${letter}`,
  noTargets: 'No legal target',
  round: (n: number) => `Round ${n}`,
  question: (n: number) => `Question ${n}`,
  difficulty: (n: number) => `Difficulty ${n}`,
  answersMode: { single: 'Single answer', multiple: 'Multiple answers' },
  verdict: { correct: 'Correct', incorrect: 'Incorrect', partial: 'Partial' },
  points: (n: number) => `+${n}`,
  bonus: (n: number) => `bonus +${n}`,
  streak: (n: number) => (n === 1 ? '1 in a row' : `${n} in a row`),
  rehearsal: 'Rehearsal: one team',
  domainsLeft: (n: number) => (n === 1 ? '1 question left' : `${n} questions left`),
  exhausted: 'Exhausted',
  leaderboardNext: 'Reveal next place',
  leaderboardDone: 'All places revealed',
} as const

/**
 * The Action Panel's phase headings (`host/session.ts`'s `ControlPhase`). One
 * block is shown at a time: what the host would accept now, and nothing else.
 */
export const PHASE = {
  ready: { title: 'Not started', hint: 'Press Start Play to begin.' },
  resolved: { title: 'Question resolved', hint: null },
  handover: { title: 'The token is free', hint: 'Give it to a team to continue.' },
  standings: { title: 'Final standings', hint: 'Every question is used. Reveal the places, lowest first.' },
  /** Restart is disabled once a Play is abandoned (B1): another Play needs the game loaded again. */
  ended: { title: 'Play abandoned', hint: 'Unload the game, then load it into Control again to play it again.' },
  showLeaderboard: 'Show final leaderboard',
  onLeaderboard: 'Showing on Stage',
} as const

/**
 * One line per `RingRole` (`host/ring.ts`). The row says what it is, so the
 * operator never has to infer legality from a border colour.
 */
export const RING_ROLE = {
  holder: 'Has the token',
  next: 'Next in order',
  override: 'Out of order',
  'reveal-first': 'Reveal the outcome first',
  served: 'Played this round',
  inactive: 'Not in this Play',
  solo: 'The only team',
  /** beta.13: the holder after a correct answer — passing is optional. */
  keeps: 'Keeps the token',
  /** beta.13: the only team, with the token free — press to take it again. */
  again: 'Take the token again',
  closed: 'The Play has ended',
} as const

export const RING = {
  title: 'Ring',
  history: 'Played this round',
  current: 'Holding the token',
  future: 'Up next',
  dropIllegal: 'Only the future ring can be reordered',
  overlooked: 'Not yet served this round',
  overrideArmed: 'Armed: press again',
  overrideBlocked: 'Reveal first',
  rehearsalSolo: 'Rehearsal',
  score: 'Score',
  turns: 'Turns',
  reorder: 'Drag to reorder the future ring',
} as const

export const SCREENS: Readonly<Record<StageScreen, string>> = {
  idle: 'Idle',
  teamOrder: 'Team order',
  chooseDomain: 'Choose domain',
  question: 'Question',
  scoreboard: 'Scoreboard',
  finalLeaderboard: 'Final leaderboard',
  currentTeam: 'Current team',
}

export const OVERLAYS: Readonly<Record<OverlayKind, string>> = {
  'token-handoff': 'Token handoff',
  'round-advance': 'Round advance',
  'multiple-answers': 'Multiple answers',
  outcome: 'Outcome',
  'current-team': 'Current team',
}

/**
 * The Viewer's own controls (beta.13): how finely the preview is drawn, and
 * the display aids — which are Stage's, live, for the people watching it.
 */
export const VIEWER = {
  options: 'Viewer and display aids',
  quality: 'Preview quality',
  qualityHint: 'Draws this preview with fewer pixels to spare the computer. Stage is not affected.',
  qualities: { native: 'Native', high: 'High', medium: 'Medium', low: 'Low' },
  aids: 'Display aids on Stage',
  aidsHint: 'Changes what the audience sees, live. For pupils who see poorly.',
  colours: 'Colours',
  filters: { none: 'Normal', invert: 'Invert', greyscale: 'Greyscale', 'greyscale-invert': 'Grey inverted' },
  brightness: 'Brightness',
  motion: 'Reduce motion',
  motionHint: 'Reveals and transitions jump to their end, and the shapes stay still.',
  scale: (percent: number) => `${percent}%`,
  aidsOn: 'Display aids are on',
} as const

export const STRIPS = {
  screens: 'Screens',
  overlays: 'Overlays',
  overlayBusy: 'Overlay playing',
  overlayPending: 'Queued',
  overlaysOff: 'Overlay animations are off',
  /** beta.13: an overlay whose payload would be made up is off, with why. */
  noHolder: 'Nobody holds the token',
  noOutcome: 'No outcome yet',
  noSelection: 'No answer selected',
  screenIndex: (at: number, of: number) => `${at} / ${of}`,
  stepKeys: 'Previous and next screen',
} as const

export const TIMELINE = {
  title: 'Timeline',
  events: (n: number) => (n === 1 ? '1 event' : `${n} events`),
  expand: 'Expand timeline',
  collapse: 'Collapse timeline',
  empty: 'No events yet',
  unanswered: 'Not answered',
  /** beta.13: the track never says "No events" over a count. */
  loading: 'Reading the timeline…',
  failed: 'The timeline could not be read. It will try again on the next event.',
  turn: (n: number, domain: string) => (domain ? `Q${n} · ${domain}` : `Q${n}`),
  undone: 'Undone',
  inPlay: 'In play',
  tokenTo: (team: string) => `→ ${team}`,
  at: (time: string) => `at ${time}`,
  /** A `selection_set` row's detail: how many answers the selection holds. */
  selected: (n: number) => (n === 1 ? '1 answer selected' : `${n} answers selected`),
  /** A kind this build has no name for (a newer host) — never the raw type. */
  unknownKind: 'Other event',
  kinds: {
    play_loaded: 'Play loaded',
    play_started: 'Play started',
    paused: 'Paused',
    resumed: 'Resumed',
    token_given: 'Token given',
    question_issued: 'Question issued',
    stem_revealed: 'Question revealed',
    option_revealed: 'Answer revealed',
    selection_set: 'Selection',
    timer_started: 'Timer started',
    timer_paused: 'Timer paused',
    timer_expired: 'Timer expired',
    selection_locked: 'Locked',
    turn_resolved: 'Outcome revealed',
    ring_reordered: 'Ring reordered',
    leaderboard_rank_revealed: 'Place revealed',
    turn_inverted: 'Undo',
    turn_reapplied: 'Redo',
    play_completed: 'Play completed',
    play_abandoned: 'Play abandoned',
    play_restarted: 'Play restarted',
    settings_live_changed: 'Setting changed',
  } as Readonly<Record<string, string>>,
} as const

export const HOTKEYS = {
  title: 'Keyboard',
  /** Default chords (spec §2.20). P10's Shortcuts tab edits them on the host. */
  defaults: {
    start_timer: 'space',
    lock_selection: 'enter',
    reveal_outcome: 'r',
    reveal_stem: 's',
    reveal_next_option: 'a',
    give_token: 't',
    undo_turn: 'mod+z',
    redo_turn: 'mod+shift+z',
    screen_prev: '[',
    screen_next: ']',
  } as Readonly<Record<string, string>>,
  labels: {
    start_timer: 'Start / pause timer',
    lock_selection: 'Lock',
    reveal_outcome: 'Reveal outcome',
    reveal_stem: 'Reveal question',
    reveal_next_option: 'Reveal next answer',
    give_token: 'Give token to the default target',
    undo_turn: 'Undo',
    redo_turn: 'Redo',
    screen_prev: 'Previous screen',
    screen_next: 'Next screen',
    pick: 'Pick domain / answer by position',
  } as Readonly<Record<string, string>>,
} as const
