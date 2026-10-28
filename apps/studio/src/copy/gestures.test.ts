import { describe, expect, it } from 'vitest'
import { GESTURES, chordKeys, keyLabel } from './gestures'
import { HELP } from './help'

/**
 * beta.10: one registry of the fixed gestures, and each one held to the code
 * that answers it — a `gesture: <id>` marker beside the handler. A gesture
 * dropped from the code fails here; so does a handler nobody listed.
 */
const SOURCES = import.meta.glob(['../**/*.{ts,tsx}', '!../**/*.test.{ts,tsx}', '!./gestures.ts', '!./help.ts'], { query: '?raw', import: 'default', eager: true }) as Record<string, string>

const marked = (): Map<string, string[]> => {
  const at = new Map<string, string[]>()
  for (const [file, text] of Object.entries(SOURCES)) {
    for (const m of text.matchAll(/(?:\/\/|\/\*) gesture: ([a-z0-9-]+(?:, [a-z0-9-]+)*)/g)) {
      for (const id of (m[1] ?? '').split(', ')) at.set(id, [...(at.get(id) ?? []), file])
    }
  }
  return at
}

describe('the gestures registry (beta.10)', () => {
  it('has one line per gesture, each with what it does and where', () => {
    const ids = GESTURES.map((g) => g.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const g of GESTURES) {
      expect(g.does.length).toBeGreaterThan(0)
      expect(g.where.length).toBeGreaterThan(0)
      expect(g.keys.length > 0 || g.action !== undefined).toBe(true)
    }
  })

  it('holds every gesture to a handler marked with its id', () => {
    const at = marked()
    for (const g of GESTURES) expect(at.get(g.id), `no "gesture: ${g.id}" marker in the code`).toBeTruthy()
  })

  it('lists every gesture the code marks', () => {
    const known = new Set(GESTURES.map((g) => g.id))
    for (const id of marked().keys()) expect(known.has(id), `"gesture: ${id}" is not in GESTURES`).toBe(true)
  })

  it('writes keys the platform’s way', () => {
    expect(keyLabel('mod', false)).toBe('Ctrl')
    expect(keyLabel('mod', true)).toBe('⌘')
    expect(keyLabel('f1', false)).toBe('F1')
    expect(keyLabel('z', true)).toBe('Z')
    expect(chordKeys('mod+shift+z')).toEqual(['mod', 'shift', 'z'])
  })

  it('names in Help only gestures that exist', () => {
    const known = new Set(GESTURES.map((g) => g.id))
    const text = JSON.stringify(HELP)
    for (const m of text.matchAll(/\{\{gesture:([^}]+)\}\}/g)) expect(known.has(m[1] ?? ''), m[1]).toBe(true)
  })
})
