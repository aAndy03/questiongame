import { createContext, useContext, type ReactNode } from 'react'
import { Kbd, Text, type StudioTextVariant } from '@/atoms'
import { HOTKEYS } from '@/copy'
import { GESTURES } from '@/copy/gestures'
import { GestureBadge } from './GestureBadge'

/**
 * `{{key:…}}`, `{{hotkey:…}}`, `{{gesture:…}}`, `{{ui:…}}` and `**…**` —
 * Help's inline tokens (`copy/help.ts`). `{{hotkey:give_token}}` is a Control
 * command: drawn with the operator's own chord (beta.12, B15), where
 * `{{key:t}}` would name the default after it was rebound.
 */
const TOKEN = /\{\{(key|hotkey|gesture|ui):([^}]+)\}\}|\*\*([^*]+)\*\*/g

/** The operator's chords, command → chord, over `HOTKEYS.defaults`. Help and the tips provide it from the settings. */
export const HotkeyChords = createContext<Readonly<Record<string, string>>>({})

/** A command's chord as the operator has it now. */
function chordOf(chords: Readonly<Record<string, string>>, command: string): string {
  return chords[command] ?? HOTKEYS.defaults[command] ?? ''
}

export interface HelpTextProps {
  text: string
  variant?: StudioTextVariant
  /** The Help search in force: its words are marked. */
  highlight?: string | null | undefined
}

/**
 * One line of Help (beta.10), its tokens drawn: a key chord as key caps, a
 * gesture as its badge, a button's name in weight, bold as bold. The plain
 * runs between them carry the search marks.
 */
export function HelpText({ text, variant = 'studio-body', highlight }: HelpTextProps) {
  const chords = useContext(HotkeyChords)
  const out: ReactNode[] = []
  let at = 0
  for (const m of text.matchAll(TOKEN)) {
    const start = m.index ?? 0
    if (start > at) out.push(run(text.slice(at, start), variant, highlight, at))
    const [, kind, value, bold] = m
    if (kind === 'key' && value) out.push(<Kbd key={start} chord={value} variant="light" />)
    else if (kind === 'hotkey' && value) {
      const chord = chordOf(chords, value)
      out.push(chord ? <Kbd key={start} chord={chord} variant="light" /> : run('—', variant, highlight, start))
    }
    else if (kind === 'gesture' && value) out.push(<GestureBadge key={start} id={value} />)
    else if (kind === 'ui' && value) out.push(run(value, variant, highlight, start, 'ui'))
    else if (bold) out.push(run(bold, variant, highlight, start, 'bold'))
    at = start + m[0].length
  }
  if (at < text.length) out.push(run(text.slice(at), variant, highlight, at))
  return <>{out}</>
}

function run(text: string, variant: StudioTextVariant, highlight: string | null | undefined, key: number, weight?: 'ui' | 'bold') {
  return (
    <Text key={key} variant={variant} highlight={highlight} style={weight ? { fontWeight: weight === 'ui' ? 500 : 600 } : undefined}>
      {text}
    </Text>
  )
}

/** A Help line as plain words, for search: the tokens spelled out. */
export function helpPlain(text: string): string {
  return text.replace(TOKEN, (_, kind: string | undefined, value: string | undefined, bold: string | undefined) => {
    if (kind === 'gesture') return GESTURES.find((g) => g.id === value)?.does ?? ''
    if (kind === 'key') return (value ?? '').replace(/\+/g, ' ')
    if (kind === 'hotkey') return (HOTKEYS.defaults[value ?? ''] ?? '').replace(/\+/g, ' ')
    return value ?? bold ?? ''
  })
}
