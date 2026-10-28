/**
 * **Every fixed gesture Studio answers to** (beta.10): the mouse and keyboard
 * moves that are not Control's editable chords (those are `HOTKEYS`). One
 * registry, read by Settings ▸ Keyboard shortcuts' *Mouse and keyboard
 * gestures*, by the Help page, and — beta.11 — by the tips. A gesture added
 * to the app without a line here is a gesture nobody can find; the test in
 * `gestures.test.ts` holds each handler to its line through a
 * `// gesture: <id>` marker in the code that answers it.
 *
 * `keys` are the parts of the chord as written on a Windows keyboard; `mod`
 * is Ctrl on Windows and ⌘ on a Mac (`KeyBadge` says which). `action` is the
 * pointer half: a click, a drag.
 */
export type GestureAction = 'click' | 'double-click' | 'drag' | 'release' | 'press'

export interface Gesture {
  readonly id: string
  /** The modifier keys, then the key, when there is one: `['shift']`, `['mod']`, `['escape']`. */
  readonly keys: readonly string[]
  /** The pointer half, when there is one. */
  readonly action?: GestureAction | undefined
  /** What it does, in one line. */
  readonly does: string
  /** Where it works, as the operator finds it. */
  readonly where: string
}

export const GESTURES: readonly Gesture[] = [
  {
    id: 'shift-click-run',
    keys: ['shift'],
    action: 'click',
    does: 'Selects every row from the last one you ticked to this one',
    where: 'Lists in table and grid view, and the pickers',
  },
  {
    id: 'mod-click-tick',
    keys: ['mod'],
    action: 'click',
    does: 'Ticks a row without opening it',
    where: 'Lists in table and grid view, and the pickers',
  },
  {
    id: 'mod-click-domains',
    keys: ['mod'],
    action: 'click',
    does: 'Picks several domains, and lists their questions together',
    where: 'The Domains pane',
  },
  {
    id: 'shift-click-domains',
    keys: ['shift'],
    action: 'click',
    does: 'Picks a run of domains',
    where: 'The Domains pane',
  },
  {
    id: 'drag-to-domain',
    keys: [],
    action: 'drag',
    does: 'Adds the question, or the ticked questions, to the domain you let go on',
    where: 'Domains & Questions: a row onto the Domains pane',
  },
  {
    id: 'mod-drag-move',
    keys: ['mod'],
    action: 'release',
    does: 'Moves them there instead: they leave every other domain',
    where: 'Domains & Questions, while dragging onto a domain',
  },
  {
    id: 'escape-cancel-drag',
    keys: ['escape'],
    action: 'press',
    does: 'Cancels the drag; nothing changes',
    where: 'While dragging questions',
  },
  {
    id: 'enter-open-row',
    keys: ['enter'],
    action: 'press',
    does: 'Opens the row that has the focus (Space too)',
    where: 'Lists and the Domains pane',
  },
  {
    id: 'shift-arrow-nudge',
    keys: ['shift', 'arrow'],
    action: 'press',
    does: 'Moves the selected element 10 pixels (an arrow alone moves it 1)',
    where: 'Screens, on the canvas',
  },
  {
    id: 'double-click-title-bar',
    keys: [],
    action: 'double-click',
    does: 'Maximizes or restores the window',
    where: 'The empty part of Studio’s title bar',
  },
  {
    id: 'f1-help',
    keys: ['f1'],
    action: 'press',
    does: 'Opens Help',
    where: 'Anywhere in Studio',
  },
]

/** How a key is written on the key itself. `mod` is the platform's. */
export function keyLabel(key: string, mac: boolean): string {
  const names: Readonly<Record<string, string>> = {
    mod: mac ? '⌘' : 'Ctrl',
    shift: mac ? '⇧' : 'Shift',
    alt: mac ? '⌥' : 'Alt',
    ctrl: mac ? '⌃' : 'Ctrl',
    enter: mac ? '↩' : 'Enter',
    escape: 'Esc',
    space: 'Space',
    arrow: '←↑→↓',
    f1: 'F1',
  }
  return names[key] ?? (key.length === 1 ? key.toUpperCase() : key)
}

/** A `HOTKEYS` chord (`mod+shift+z`) as its parts. */
export function chordKeys(chord: string): readonly string[] {
  return chord.split('+').filter(Boolean)
}

/** How a pointer half reads after its keys: `Shift` + *click*. */
export const ACTION_WORD: Readonly<Record<GestureAction, string>> = {
  click: 'click',
  'double-click': 'double-click',
  drag: 'drag',
  release: 'release',
  press: '',
}
