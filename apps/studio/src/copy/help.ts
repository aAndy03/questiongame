/**
 * **Help's content** (beta.10): the sections and topics of Studio's Help page,
 * opened from the sidebar or with F1. English only, like the rest of Studio's
 * UI (What's new is the one place that also speaks Romanian).
 *
 * Text is plain prose with a few inline tokens the page renders:
 * - `{{key:mod+shift+z}}` — a key chord badge (`KeyBadge`); `mod` is Ctrl on
 *   Windows and ⌘ on a Mac.
 * - `{{gesture:<id>}}` — a gesture badge for an id in `gestures.ts`.
 * - `{{ui:Load into Control}}` — a button, tab or menu name, spelled as
 *   Studio shows it.
 * - `**bold**` — emphasis.
 *
 * Words follow `docs/v1/03_CONTEXT.md`, in the operator's spelling: a recipe
 * is a **game** here, one run of it a **Play**.
 */

export type HelpInline = string

export type HelpFigureId = 'select-lock-reveal' | 'easy-to-hard' | 'drag-to-domain' | 'token-ring' | 'stage-displays'

export type HelpBlock =
  | { readonly kind: 'p'; readonly text: HelpInline }
  /** An ordered how-to. */
  | { readonly kind: 'steps'; readonly items: readonly HelpInline[] }
  /** Unordered points. */
  | { readonly kind: 'list'; readonly items: readonly HelpInline[] }
  | { readonly kind: 'figure'; readonly figure: HelpFigureId; readonly caption: string }
  /** Control's chords, rendered from `HOTKEYS`. */
  | { readonly kind: 'shortcuts' }
  /** The gestures registry, rendered from `GESTURES`. */
  | { readonly kind: 'gestures' }
  /** A tip or caution callout. */
  | { readonly kind: 'note'; readonly text: HelpInline }

export interface HelpTopic {
  readonly id: string
  readonly title: string
  readonly blocks: readonly HelpBlock[]
}

export interface HelpSection {
  readonly id: string
  readonly title: string
  readonly summary: string
  readonly topics: readonly HelpTopic[]
}

export const HELP: readonly HelpSection[] = [
  {
    id: 'how-the-game-plays',
    title: 'How the game plays',
    summary: 'Teams take turns with a token, choose a domain, and answer questions that get harder as they go.',
    topics: [
      {
        id: 'teams-and-the-token',
        title: 'Teams and the token',
        blocks: [
          { kind: 'p', text: 'Teams play in turn. The team whose turn it is holds the **token**, and the order they play in is the **ring**, set by the game’s Roster.' },
          { kind: 'p', text: 'A team keeps the token until it answers wrong. After a right answer it plays again: it can stay in the same domain or choose another one.' },
          { kind: 'figure', figure: 'token-ring', caption: 'The ring: one team holds the token, the next in order waits, and a team that has played this round is marked.' },
          { kind: 'p', text: 'When the token is free, give it to the next team with {{ui:Give token}} in the Action Panel, or press {{hotkey:give_token}}.' },
          { kind: 'note', text: 'A game can end a team’s token after a number of right answers in a row (**Cap after consecutive correct** in Rules), and pay a bonus for a run of them.' },
        ],
      },
      {
        id: 'choosing-a-domain',
        title: 'Choosing a domain',
        blocks: [
          { kind: 'p', text: 'The team with the token chooses a **domain**, such as History or Science. It never chooses a question or a difficulty: the game picks the next question in that domain.' },
          { kind: 'p', text: 'Choose it for them on the Viewer, in the Action Panel, or with the number keys {{key:1}} to {{key:9}}. A domain whose questions are all used is marked **Exhausted**.' },
        ],
      },
      {
        id: 'easy-to-hard',
        title: 'Easy to hard, inside a domain',
        blocks: [
          { kind: 'p', text: 'Every question has a difficulty from 1 (easy) to 100 (hard). Inside a domain, questions are asked from the easiest to the hardest, so each one is harder than the last.' },
          { kind: 'figure', figure: 'easy-to-hard', caption: 'One domain on the board: one question per difficulty, asked from easy to hard.' },
          { kind: 'p', text: 'A board holds one question per difficulty in each domain. With **Allow repeated difficulties** on the Board, a domain can hold several at one difficulty; they are asked one after the other and pay the same.' },
          { kind: 'p', text: 'Each domain walks on its own: History 10 and Science 10 are two different questions.' },
        ],
      },
      {
        id: 'select-lock-reveal',
        title: 'Select, Lock, Reveal',
        blocks: [
          { kind: 'p', text: 'A question goes through three steps. The team **selects** an answer, the answer is **locked**, then the outcome is **revealed**.' },
          { kind: 'figure', figure: 'select-lock-reveal', caption: 'Select keeps the clock running, Lock stops it, Reveal scores the answer and uses up the question.' },
          {
            kind: 'list',
            items: [
              '**Select** is a working choice. It can change, and a running timer keeps running.',
              '**Lock** freezes the choice and stops the timer ({{hotkey:lock_selection}}). Nothing is scored yet.',
              '**Reveal** shows whether it was right, scores it, and uses up the question for this Play ({{hotkey:reveal_outcome}}).',
            ],
          },
          { kind: 'p', text: 'Before that, you reveal the question with {{hotkey:reveal_stem}} and its answers one by one with {{hotkey:reveal_next_option}}, unless the game’s **Reveal** rule is set to Auto.' },
          { kind: 'note', text: 'Revealing with nothing selected counts as a wrong answer. A question that was used is never asked again in this Play; your library keeps it for the next one.' },
        ],
      },
      {
        id: 'scoring',
        title: 'Scoring',
        blocks: [
          {
            kind: 'list',
            items: [
              '**Flat**: every right answer is worth the same points.',
              '**By difficulty**: harder questions are worth more.',
              '**Lock speed**: a faster lock earns more. It can also be added on top of the other two with **Add lock-speed bonus**.',
            ],
          },
          { kind: 'p', text: 'With speed counting, an instant answer pays the most and a slow one pays less, down to the plain base at the end of the speed window.' },
          { kind: 'p', text: 'A wrong or empty answer scores 0. Points are written only at Reveal, never at Lock.' },
          { kind: 'p', text: 'On a **multiple-answer** question, a team must pick every right answer and only those. The order it picks them in does not matter, unless {{ui:Option order matters}} is on in Rules. **Partial credit** in Rules gives part of the points for a partial pick.' },
        ],
      },
      {
        id: 'round-rule-timer-and-end',
        title: 'Rounds, the timer, and the end',
        blocks: [
          { kind: 'p', text: '**The round rule:** no team gets a second token before every team has had its first, a third before every team has had its second, and so on. Studio only lets you give the token to teams not yet served this round.' },
          { kind: 'p', text: '**The timer** starts when you press {{hotkey:start_timer}} or its button, and counts down until you lock or pause it. If it reaches zero with an answer selected, the answer locks by itself; with nothing selected, the team can still answer, and you reveal when ready.' },
          { kind: 'p', text: 'With the timer off, the game runs at **operator pace**: no countdown, no lock at zero, no speed bonus, and no clock on Stage. A game can use the all-games timer (Inherit), set its own Duration, or turn it off.' },
          { kind: 'p', text: '**The end:** the Play ends when every question on the board has been used. Reveal the final places from the lowest up to first.' },
          { kind: 'p', text: 'Ties are allowed at every place. Two teams level share it, and the next place is skipped: 1, 1, 3.' },
        ],
      },
    ],
  },
  {
    id: 'prepare-a-show',
    title: 'Prepare a show',
    summary: 'Teams, domains and questions in your library, then a game that puts them together.',
    topics: [
      {
        id: 'teams-domains-questions',
        title: 'Teams, domains and questions',
        blocks: [
          { kind: 'p', text: 'Make your teams on {{ui:Teams}}, and your domains and questions on {{ui:Domains & Questions}}. A question can sit in several domains.' },
          { kind: 'p', text: 'A question has its text, at least two options with at least one ticked as correct, a difficulty from 1 to 100, and an optional explanation for you. Tick two or more correct options and it becomes a multiple-answer question.' },
        ],
      },
      {
        id: 'incomplete-questions',
        title: 'Incomplete questions',
        blocks: [
          { kind: 'p', text: 'You can save a question before it is finished. Until it has everything a game needs, it is marked **Incomplete**, and no board can use it.' },
          {
            kind: 'list',
            items: ['Question text', 'At least two options', 'At least one correct answer', 'A difficulty', 'At least one domain'],
          },
          { kind: 'p', text: 'Filter the list to the incomplete ones to finish them in one go.' },
        ],
      },
      {
        id: 'games',
        title: 'Games: roster, board, rules',
        blocks: [
          { kind: 'p', text: 'A **game** is the show you prepare once and can play many times. Make one on {{ui:Games}}; it has three parts.' },
          {
            kind: 'list',
            items: [
              '**Roster**: the teams, in the order they play. Drag a team by its handle to change the order. Use {{ui:Add teams…}} to add them.',
              '**Board**: the domains for this show, then the questions from each, with {{ui:Add domains…}} and {{ui:Choose questions…}}.',
              '**Rules**: how answers score, the timer, the cap and bonus, how reveals happen, and the language Stage speaks.',
            ],
          },
          { kind: 'p', text: 'The board holds one question per difficulty in each domain, so every domain gets strictly harder as it goes and teams always know what they are choosing. Turn on **Allow repeated difficulties** when you want more than one at a level.' },
          { kind: 'note', text: 'While a game is playing, its name, roster, board and the rules that decide the score (scoring, the timer, the cap and bonus, judging) are frozen: you can still see them, but not change them until the Play ends. Its folder, tags, how reveals happen and the language Stage speaks can still change.' },
        ],
      },
      {
        id: 'restart-and-replay',
        title: 'Restart and Replay',
        blocks: [
          { kind: 'p', text: '**Restart** closes the current Play and opens a new one right away, from the same game, with the scores at zero. Choose {{ui:Same questions}} or {{ui:Different questions}}.' },
          { kind: 'p', text: '**Replay** is simply playing the game again another day: load it into Control and start. Every Play is kept under the game’s Plays, numbered Play 1, Play 2 and so on.' },
        ],
      },
      {
        id: 'workspaces',
        title: 'Workspaces',
        blocks: [
          { kind: 'p', text: 'A **workspace** is one library: its own teams, domains, questions and games. Keep a club, a classroom and a TV show apart, each in its own workspace.' },
          { kind: 'p', text: 'Switch workspace at the top of the sidebar, and make or organise them with {{ui:New workspace…}} and {{ui:Manage workspaces…}}. Unload the game in Control before you switch.' },
          { kind: 'p', text: '{{ui:Copy to workspace…}} and {{ui:Move to workspace…}} take a row, or a whole game, to another workspace with what it needs. Copies know each other: when you save one, Studio offers to update the others.' },
        ],
      },
    ],
  },
  {
    id: 'your-library',
    title: 'Your library',
    summary: 'Find, sort and organise your questions, bring them in from a file, and share them.',
    topics: [
      {
        id: 'search',
        title: 'Search',
        blocks: [
          { kind: 'p', text: 'Type in {{ui:Search}} to find rows. The words you search for are marked in the list, in the pickers, and in the question opened beside the list.' },
          { kind: 'p', text: 'When a question is found by one of its answers or its explanation, its row shows them, marked, so you see why it matched.' },
        ],
      },
      {
        id: 'filters-sort-group',
        title: 'Filters, sort and group',
        blocks: [
          {
            kind: 'list',
            items: [
              '{{ui:Filters}} narrows the list, for example to hard questions, multiple answers or the incomplete ones. The filters in force sit beside the button as small chips.',
              '{{ui:Sort}} orders it. In table view, click a column’s title to sort by it, and again to turn the order around.',
              '{{ui:Group}} breaks it into sections, such as questions by domain, difficulty or completeness.',
              'Switch between {{ui:Grid}} and {{ui:Table}}, and show {{ui:Active}}, {{ui:Archived}} or {{ui:All}}.',
            ],
          },
        ],
      },
      {
        id: 'selecting-rows',
        title: 'Selecting rows',
        blocks: [
          { kind: 'p', text: 'Tick rows to act on several at once. What you tick stays ticked when you search, filter, change page or pick another domain.' },
          {
            kind: 'list',
            items: [
              '{{gesture:shift-click-run}} ticks every row from the last one you ticked to this one.',
              '{{gesture:mod-click-tick}} ticks a row without opening it.',
              'In the Domains pane, {{gesture:mod-click-domains}} and {{gesture:shift-click-domains}} pick several domains and list their questions together.',
            ],
          },
          { kind: 'p', text: 'The tick-box in a list’s header ticks every row that matches the search and filters, on every page; {{ui:Clear}} empties the selection.' },
        ],
      },
      {
        id: 'drag-to-a-domain',
        title: 'Drag questions onto a domain',
        blocks: [
          { kind: 'p', text: 'On {{ui:Domains & Questions}}, drag a question, or the questions you ticked, onto a domain in the Domains pane.' },
          { kind: 'figure', figure: 'drag-to-domain', caption: 'A question row dragged onto a domain in the Domains pane. The chip says how many are carried.' },
          {
            kind: 'list',
            items: [
              '{{gesture:drag-to-domain}} adds them to that domain. They stay in their other domains too.',
              '{{gesture:mod-drag-move}} moves them there instead: they leave every other domain.',
              '{{gesture:escape-cancel-drag}} cancels. Letting go anywhere but on a domain changes nothing too.',
            ],
          },
          { kind: 'p', text: 'From the keyboard, {{ui:Add to domain…}} and {{ui:Move to domain…}} in a question’s menu do the same.' },
        ],
      },
      {
        id: 'tags-and-groups',
        title: 'Question tags and domain groups',
        blocks: [
          { kind: 'p', text: '**Question tags** are topics, sources or eras you give a question, in any domain. Find them with the tag filter or by searching. They never show on Stage.' },
          { kind: 'p', text: '**Domain groups** sort the questions inside one domain, such as Romans or Medieval. Games and Plays ignore them; they only help you find things.' },
          { kind: 'p', text: 'Rename, merge or delete them everywhere from {{ui:Question tags…}} and {{ui:Domain groups…}}.' },
        ],
      },
      {
        id: 'import',
        title: 'Import questions',
        blocks: [
          { kind: 'p', text: 'Bring many questions in at once from a JSON file with {{ui:Import}}. Choose a file or paste its text, check the rows, then import.' },
          {
            kind: 'steps',
            items: [
              'Press {{ui:Copy template}} to copy an example file.',
              'Fill it in yourself, or paste it to an AI assistant and ask for questions. The template explains itself to whoever fills it in: how to spread difficulties, where the right answer can stand, and what makes a question incomplete.',
              'Paste the result into {{ui:Import}}. Duplicates and rejected rows are listed first; untick a row to leave it out, or open it to fix it.',
              'Import. Domains that do not exist yet are created.',
            ],
          },
          { kind: 'note', text: 'A row needs only a question or one option to come in. Anything missing comes in as incomplete, to finish in Studio.' },
        ],
      },
      {
        id: 'share',
        title: 'Share questions',
        blocks: [
          { kind: 'p', text: 'Tick questions and press {{ui:Share}} to copy them as text, complete: options, right answers, difficulty, domains, tags and explanation.' },
          { kind: 'p', text: 'Paste it into {{ui:Import}} in any library. A domain with the same name is joined, and a question already there is not added twice.' },
        ],
      },
      {
        id: 'archive-and-restore',
        title: 'Archive and restore',
        blocks: [
          { kind: 'p', text: '{{ui:Archive}} puts a row away without deleting it. Show {{ui:Archived}} to see it again, and {{ui:Restore}} to bring it back.' },
          { kind: 'p', text: 'A game that still uses an archived team, domain or question says so in its Rules, and cannot be loaded until it is fixed.' },
        ],
      },
    ],
  },
  {
    id: 'run-a-show',
    title: 'Run a show',
    summary: 'Load a game into Control and run the Play from the Viewer, the Action Panel and the keyboard.',
    topics: [
      {
        id: 'load-into-control',
        title: 'Load into Control',
        blocks: [
          {
            kind: 'steps',
            items: [
              'Open a game on {{ui:Games}} and press {{ui:Load into Control}}. Stage opens with it.',
              'Press {{ui:Start Play}}.',
              'Give the token, let the team choose a domain, start the timer, then Select, Lock and Reveal.',
              'When every question is used, show the final leaderboard and reveal the places.',
            ],
          },
          { kind: 'p', text: 'With nothing loaded, Control lists the games you played or edited last, each with {{ui:Load into Control}}.' },
          { kind: 'p', text: '{{ui:Pause}} stops the clock. {{ui:Unload game}}, the ✕ in the top bar, takes the game out of Control: a Play that was started ends there, and you choose whether to keep its record. A game loaded and never started leaves nothing behind.' },
        ],
      },
      {
        id: 'viewer-and-action-panel',
        title: 'The Viewer and the Action Panel',
        blocks: [
          { kind: 'p', text: 'The **Viewer** shows exactly what Stage shows. Click a domain or an answer on it to choose it for the team.' },
          { kind: 'p', text: 'The **Action Panel** shows only what you can do now: lock, reveal, give the token. Its ring says who has the token, who is next in order, and who has played this round. Drag the teams still to come to change their order.' },
          { kind: 'p', text: 'The **Strips** show a Stage screen or an overlay animation by hand, and the **Timeline** lists everything that happened in this Play.' },
          { kind: 'note', text: 'A click on the Viewer, a button in the Action Panel and a key all do the same thing. Use whichever is closest.' },
        ],
      },
      {
        id: 'keyboard',
        title: 'The keyboard',
        blocks: [
          { kind: 'p', text: 'Control answers to these keys while it is open:' },
          { kind: 'shortcuts' },
        ],
      },
      {
        id: 'undo-and-redo',
        title: 'Undo and redo',
        blocks: [
          { kind: 'p', text: '{{ui:Undo turn}} ({{hotkey:undo_turn}}) takes back the last answered question: its reveal and its points go, the question is back on the board, and the token goes back to the team that held it. {{ui:Redo turn}} ({{hotkey:redo_turn}}) puts it back.' },
          { kind: 'p', text: 'Nothing is erased: the Timeline keeps the undo as a step of its own. To go back to the start, Restart is cleaner than undoing everything.' },
        ],
      },
      {
        id: 'rehearsal',
        title: 'Rehearsal',
        blocks: [
          { kind: 'p', text: 'A game with a single team on its roster is a **rehearsal**: every round has one team, so you can walk through the questions and the screens on your own before the show.' },
        ],
      },
      {
        id: 'statistics-and-whats-new',
        title: 'Statistics and What’s new',
        blocks: [
          { kind: 'p', text: '{{ui:Statistics}} shows the Play under way (Live) and every Play that has been run (All data). {{ui:Show Statistics}}, in {{ui:Displays}} on the status bar or in Settings ▸ Monitors, opens it in a window of its own, on another display if you like.' },
          { kind: 'p', text: '{{ui:What\'s new}}, in Settings ▸ About, lists what every version added. It also opens by itself after an update.' },
        ],
      },
    ],
  },
  {
    id: 'stage-and-displays',
    title: 'Stage and displays',
    summary: 'Put Stage on the display your audience sees, on several at once, and fix it when it will not go there.',
    topics: [
      {
        id: 'open-and-close-stage',
        title: 'Opening and closing Stage',
        blocks: [
          { kind: 'p', text: 'Stage is the fullscreen window your audience sees. It opens when you load a game into Control, and {{ui:Open Stage}} brings it back.' },
          { kind: 'p', text: '{{ui:Close Stage}} closes it. The Play keeps going, the Viewer still shows it, and the next {{ui:Open Stage}} puts it back where it was.' },
          { kind: 'p', text: 'With one display, Stage takes the whole screen and Studio is an Alt-Tab away (⌘-Tab on a Mac).' },
        ],
      },
      {
        id: 'choose-displays',
        title: 'Choosing displays',
        blocks: [
          { kind: 'p', text: 'Press the displays in the status bar to open the {{ui:Displays}} popover. Tick a display to show Stage there, and tick its Statistics box to show Statistics. With Stage closed, a tick opens it on that display alone.' },
          { kind: 'figure', figure: 'stage-displays', caption: 'The displays popover: a tick for each display Stage shows on, and one for Statistics.' },
          {
            kind: 'list',
            items: [
              'Tick more than one display and Stage **mirrors**: the same picture on each.',
              'Use the move button beside a display without Stage to move the main Stage window there; mirrors stay where they are.',
              'Untick a display to take Stage off it. Untick the last one and Stage closes.',
            ],
          },
          { kind: 'p', text: '{{ui:Monitors settings}} opens Settings ▸ Monitors: the same choices, and with several displays a map of where they stand.' },
        ],
      },
      {
        id: 'move-by-hand',
        title: 'Moving Stage by hand',
        blocks: [
          { kind: 'p', text: 'You can also drag Stage to another display, or move it with the system’s own keys. Studio follows: the ticks show where it went, and that display is remembered.' },
          { kind: 'p', text: 'If the display Stage should be on is unplugged, Stage comes back to the main display and Studio tells you. The Play keeps playing.' },
        ],
      },
      {
        id: 'cannot-reach-windows',
        title: 'When Stage cannot reach a display: Windows',
        blocks: [
          { kind: 'p', text: 'A display set to **Duplicate** shows the same picture as another, so Stage cannot have it to itself. Studio marks it **duplicated by the system**.' },
          {
            kind: 'steps',
            items: [
              'Press the Windows key and P together, or open Windows Settings ▸ System ▸ Display.',
              'Choose **Extend**, not Duplicate.',
              'Tick the display in Studio’s {{ui:Displays}} popover.',
            ],
          },
        ],
      },
      {
        id: 'cannot-reach-macos',
        title: 'When Stage cannot reach a display: macOS',
        blocks: [
          {
            kind: 'list',
            items: [
              '**AirPlay** (an Apple TV): in Control Center ▸ Screen Mirroring, or System Settings ▸ Displays, choose **Use as Separate Display**, not Mirror. A mirrored display cannot hold a Stage of its own.',
              '**Sidecar** (an iPad): use it as a separate display, not a mirror, and it works like any other display.',
              '**Displays have separate Spaces**, in System Settings ▸ Desktop & Dock, must be on for Stage to go fullscreen on a second display.',
            ],
          },
        ],
      },
      {
        id: 'display-report',
        title: 'The display report',
        blocks: [
          { kind: 'p', text: 'Still stuck? Settings ▸ Monitors ▸ {{ui:Copy display report}} copies a plain text of what Studio sees: each display, its size and scaling, and where Stage and Statistics really are.' },
          { kind: 'p', text: 'Paste it into your bug report. Nobody can own every setup, so it is the best way for us to see yours.' },
        ],
      },
    ],
  },
  {
    id: 'shortcuts-and-gestures',
    title: 'Shortcuts and gestures',
    summary: 'Every key and mouse move Studio answers to, in one place.',
    topics: [
      {
        id: 'control-shortcuts',
        title: 'Control’s shortcuts',
        blocks: [
          { kind: 'p', text: 'These keys run a Play in Control. Where a chord says Ctrl, a Mac uses ⌘.' },
          { kind: 'shortcuts' },
          { kind: 'note', text: 'Change any of them in Settings ▸ Keyboard shortcuts: press {{ui:Record a chord}} and then the keys. {{ui:Reset to default}} puts one back.' },
        ],
      },
      {
        id: 'mouse-and-keyboard-gestures',
        title: 'Mouse and keyboard gestures',
        blocks: [
          { kind: 'p', text: 'These work everywhere they apply and cannot be changed. {{gesture:f1-help}} opens this page.' },
          { kind: 'gestures' },
        ],
      },
    ],
  },
]

export const HELP_COPY = {
  title: 'Help',
  search: 'Search help',
  noResults: (q: string) => `Nothing in Help mentions “${q}”.`,
  onThisPage: 'On this page',
} as const
