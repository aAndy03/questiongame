/**
 * **The tips** (beta.11, P25): what each says, when it is relevant, what it
 * teaches. Text uses Help's inline tokens (`copy/help.ts`): `{{key:…}}`,
 * `{{gesture:…}}`, `{{ui:…}}`, `**…**` — drawn by `HelpText`, held to real
 * labels by `copy/help.test.ts`'s check, which reads this file too.
 *
 * A tip's **skill** is what makes it less likely: a gesture id from
 * `copy/gestures.ts` (its handler reports it), or one of [`ACTION_SKILLS`]
 * (the call site that does it reports it). Knowing is graded — see
 * `tips/engine.ts`.
 */
import type { HelpFigureId } from './help'
import type { TipRule } from '@/tips/engine'

/** Skills that are actions, not gestures: reported where the action happens. */
export const ACTION_SKILLS = [
  'how-the-game-plays',
  'make-domain',
  'import',
  'share',
  'search',
  'tags-and-groups',
  'make-game',
  'board-difficulty',
  'load-into-control',
  'rehearsal',
  'displays',
  'close-stage',
  'control-keys',
  'undo-turn',
  'restart',
  'statistics-window',
  'workspaces',
  'copy-to-workspace',
  'help',
  'title-bar',
] as const

export interface Tip extends TipRule {
  readonly title: string
  readonly body: string
  readonly figure?: HelpFigureId | undefined
  /** Help's section and topic *More in Help* opens. */
  readonly help: { readonly section: string; readonly topic: string }
}

export const TIPS: readonly Tip[] = [
  {
    id: 'how-the-game-plays',
    moments: { 'first-launch': 1 },
    skill: 'how-the-game-plays',
    title: 'New here? This is how the game plays',
    body: 'Teams take turns with a **token**. The team holding it chooses a **domain**, never a question: inside a domain the questions go from easy to hard. A team keeps the token until it answers wrong.',
    figure: 'token-ring',
    help: { section: 'how-the-game-plays', topic: 'teams-and-the-token' },
  },
  {
    id: 'domain-first',
    moments: { 'editor:new-question': 1 },
    skill: 'make-domain',
    title: 'Every question needs a domain',
    body: 'A question goes on a board through its domain, such as History or Science. Make your domains first, in the Domains pane, then pick one here.',
    help: { section: 'prepare-a-show', topic: 'teams-domains-questions' },
  },
  {
    id: 'import-many',
    moments: { 'question:saved': 1, 'route:library': 0.5 },
    skill: 'import',
    requires: 'make-domain',
    title: 'Many questions at once',
    body: '{{ui:Import}} takes a whole file of questions. Press {{ui:Copy template}}, give it to an AI assistant with your topic, and paste what it writes back.',
    help: { section: 'your-library', topic: 'import' },
  },
  {
    id: 'drag-to-domain',
    moments: { 'route:library': 0.8, 'question:saved': 0.6 },
    skill: 'drag-to-domain',
    title: 'Drag questions onto a domain',
    body: 'Drag a question, or the ones you ticked, onto a domain in the Domains pane to add them to it ({{gesture:drag-to-domain}}). They stay in their other domains too.',
    figure: 'drag-to-domain',
    help: { section: 'your-library', topic: 'drag-to-a-domain' },
  },
  {
    id: 'move-to-domain',
    moments: { 'route:library': 0.6 },
    skill: 'mod-drag-move',
    requires: 'drag-to-domain',
    title: 'Move instead of add',
    body: 'Hold {{key:mod}} as you let go on a domain ({{gesture:mod-drag-move}}) and the questions move there, out of every other domain. {{gesture:escape-cancel-drag}} cancels.',
    help: { section: 'your-library', topic: 'drag-to-a-domain' },
  },
  {
    id: 'select-run',
    moments: { 'list:selected-many': 1, 'route:library': 0.4, 'route:teams': 0.3 },
    skill: 'shift-click-run',
    title: 'Tick a run of rows',
    body: '{{gesture:shift-click-run}} ticks every row from the last one you ticked to this one; {{gesture:mod-click-tick}} ticks one without opening it.',
    help: { section: 'your-library', topic: 'selecting-rows' },
  },
  {
    id: 'many-domains',
    moments: { 'route:library': 0.4 },
    skill: 'mod-click-domains',
    requires: 'make-domain',
    title: 'Several domains at once',
    body: '{{gesture:mod-click-domains}} in the Domains pane picks several domains and lists their questions together; {{gesture:shift-click-domains}} picks a run.',
    help: { section: 'your-library', topic: 'selecting-rows' },
  },
  {
    id: 'search-hits',
    moments: { 'route:library': 0.3 },
    skill: 'search',
    title: 'Search finds answers too',
    body: 'Type in {{ui:Search}}: the words are marked where they match, and a question found by one of its answers shows that answer in its row.',
    help: { section: 'your-library', topic: 'search' },
  },
  {
    id: 'tags-groups',
    moments: { 'question:saved': 0.3, 'route:library': 0.2 },
    skill: 'tags-and-groups',
    requires: 'make-domain',
    title: 'Tags and groups',
    body: '**Question tags** are topics or sources across every domain; **domain groups** sort the questions inside one domain. Neither shows on Stage.',
    help: { section: 'your-library', topic: 'tags-and-groups' },
  },
  {
    id: 'share',
    moments: { 'list:selected-many': 0.6 },
    skill: 'share',
    title: 'Share them as text',
    body: 'Tick questions and press {{ui:Share}}: they are copied complete, ready to paste into {{ui:Import}} in any library.',
    help: { section: 'your-library', topic: 'share' },
  },
  {
    id: 'game-parts',
    moments: { 'route:games': 1, 'game:opened': 0.6 },
    skill: 'make-game',
    title: 'A game is the show you prepare',
    body: 'Its **Roster** is the teams in playing order, its **Board** the domains and questions, its **Rules** the scoring and the timer. Make it once, play it many times.',
    help: { section: 'prepare-a-show', topic: 'games' },
  },
  {
    id: 'one-per-difficulty',
    moments: { 'game:board': 1 },
    skill: 'board-difficulty',
    title: 'One question per difficulty',
    body: 'A board holds one question per difficulty in each domain, so a domain always gets harder. {{ui:Allow repeated difficulties}} lets it hold more.',
    figure: 'easy-to-hard',
    help: { section: 'how-the-game-plays', topic: 'easy-to-hard' },
  },
  {
    id: 'load-into-control',
    moments: { 'game:opened': 1, 'route:control': 0.6 },
    skill: 'load-into-control',
    requires: 'make-game',
    title: 'Ready to play?',
    body: '{{ui:Load into Control}} puts the game in Control, and Stage, the audience’s screen, opens with it. Then {{ui:Start Play}}.',
    help: { section: 'run-a-show', topic: 'load-into-control' },
  },
  {
    id: 'rehearse',
    moments: { 'game:opened': 0.4, 'control:loaded': 0.5 },
    skill: 'rehearsal',
    requires: 'load-into-control',
    title: 'Rehearse on your own',
    body: 'A game with one team on its roster is a **rehearsal**: walk through the questions and the screens before the show. Tips keep coming while you do.',
    help: { section: 'run-a-show', topic: 'rehearsal' },
  },
  {
    id: 'control-keys',
    moments: { 'control:loaded': 1, 'control:rehearsal': 1 },
    skill: 'control-keys',
    title: 'Run it from the keyboard',
    body: '{{key:t}} gives the token, {{key:space}} starts the timer, {{key:enter}} locks, {{key:r}} reveals, {{key:1}}–{{key:9}} choose a domain or an answer.',
    help: { section: 'run-a-show', topic: 'keyboard' },
  },
  {
    id: 'undo-turn',
    moments: { 'control:rehearsal': 0.6, 'control:loaded': 0.3 },
    skill: 'undo-turn',
    requires: 'control-keys',
    title: 'A wrong click is not the end',
    body: '{{ui:Undo turn}} ({{key:mod+z}}) takes back the last answered question, points and all; {{ui:Redo turn}} puts it back.',
    help: { section: 'run-a-show', topic: 'undo-and-redo' },
  },
  {
    id: 'restart-replay',
    moments: { 'control:rehearsal': 0.4, 'game:opened': 0.2 },
    skill: 'restart',
    requires: 'load-into-control',
    title: 'Restart or Replay',
    body: '**Restart** opens a new Play now, scores at zero, with {{ui:Same questions}} or {{ui:Different questions}}. **Replay** is just playing the game again another day.',
    help: { section: 'prepare-a-show', topic: 'restart-and-replay' },
  },
  {
    id: 'displays',
    moments: { 'control:loaded': 0.6, 'displays:opened': 1 },
    skill: 'displays',
    title: 'Stage on the right screen',
    body: 'Tick a display in {{ui:Displays}} to show Stage there; tick more for mirrors. Stage closed by mistake? {{ui:Open Stage}} puts it back.',
    figure: 'stage-displays',
    help: { section: 'stage-and-displays', topic: 'choose-displays' },
  },
  {
    id: 'close-stage',
    moments: { 'displays:opened': 0.5 },
    skill: 'close-stage',
    requires: 'displays',
    title: 'Close Stage, keep the Play',
    body: '{{ui:Close Stage}} takes the audience’s screen down; the Play keeps going and the Viewer still shows it.',
    help: { section: 'stage-and-displays', topic: 'open-and-close-stage' },
  },
  {
    id: 'statistics-window',
    moments: { 'route:statistics': 1 },
    skill: 'statistics-window',
    title: 'Statistics on another screen',
    body: '{{ui:Show Statistics}} opens it in a window of its own, on another display if you like, while Control stays here.',
    help: { section: 'run-a-show', topic: 'statistics-and-whats-new' },
  },
  {
    id: 'workspaces',
    moments: { 'route:workspaces': 1, 'route:teams': 0.2 },
    skill: 'workspaces',
    title: 'Keep libraries apart',
    body: 'A **workspace** is one library. A club, a classroom and a TV show can each have their own: {{ui:New workspace…}} at the top of the sidebar.',
    help: { section: 'prepare-a-show', topic: 'workspaces' },
  },
  {
    id: 'copy-to-workspace',
    moments: { 'route:workspaces': 0.6, 'list:selected-many': 0.3 },
    skill: 'copy-to-workspace',
    requires: 'workspaces',
    title: 'Take rows to another workspace',
    body: '{{ui:Copy to…}} and {{ui:Move to…}} take rows, or a whole game, to another workspace with what they need.',
    help: { section: 'prepare-a-show', topic: 'workspaces' },
  },
  {
    id: 'nudge',
    moments: { 'route:screens': 1 },
    skill: 'shift-arrow-nudge',
    title: 'Place things exactly',
    body: 'With an element selected, the arrow keys move it a pixel; {{gesture:shift-arrow-nudge}} moves it ten.',
    help: { section: 'shortcuts-and-gestures', topic: 'mouse-and-keyboard-gestures' },
  },
  {
    id: 'help',
    moments: { 'route:settings': 0.5, 'route:teams': 0.3, 'route:games': 0.3 },
    skill: 'help',
    title: 'Everything, in one place',
    body: '{{gesture:f1-help}} opens Help from anywhere: how the game plays, every screen, and every shortcut.',
    help: { section: 'shortcuts-and-gestures', topic: 'control-shortcuts' },
  },
  {
    id: 'title-bar',
    moments: { 'route:settings': 0.4 },
    skill: 'title-bar',
    title: 'Your title bar, or the system’s',
    body: 'Studio’s header is the window’s title bar: drag it, double-click it to maximize. Prefer the system’s? {{ui:Use the system title bar}}.',
    help: { section: 'shortcuts-and-gestures', topic: 'mouse-and-keyboard-gestures' },
  },
]

export const TIPS_COPY = {
  moreInHelp: 'More in Help',
  gotIt: 'Got it',
  dismiss: 'Dismiss tip',
  region: 'Tip',
  showTips: 'Show tips',
  showTipsHint: 'Short tips about what you are doing, at the bottom right.',
  startOver: 'Start tips over',
  startOverHint: 'Forget what Studio has learned you know, as if you were new.',
  startedOver: 'Tips start over',
} as const
