import { describe, expect, it } from 'vitest'
import { HELP } from './help'
import { TIPS } from './tips'

/**
 * beta.10 review: Help named an *Import questions…* button where Studio
 * shows *Import*. Every `{{ui:…}}` in Help is a string some copy module
 * really carries (give or take a trailing ellipsis) — a label renamed or
 * removed fails here. Which control carries it is still the writer's to check.
 */
const MODULES = import.meta.glob(['./*.ts', '!./*.test.ts', '!./help.ts', '!./tips.ts'], { eager: true }) as Record<string, Record<string, unknown>>

function strings(value: unknown, out: Set<string>, seen = new Set<unknown>()): Set<string> {
  if (typeof value === 'string') out.add(value)
  else if (value && typeof value === 'object' && !seen.has(value)) {
    seen.add(value)
    for (const v of Object.values(value)) strings(v, out, seen)
  }
  return out
}

describe('Help names only what Studio shows (beta.10)', () => {
  it('every {{ui:…}} is a label in the copy', () => {
    const labels = strings(MODULES, new Set())
    const known = (label: string) => labels.has(label) || labels.has(`${label}…`) || labels.has(label.replace(/…$/, ''))
    // beta.11: the tips use the same tokens and are held to the same labels.
    const missing = [...JSON.stringify([HELP, TIPS]).matchAll(/\{\{ui:([^}]+)\}\}/g)].map((m) => m[1] ?? '').filter((l) => !known(l))
    expect([...new Set(missing)]).toEqual([])
  })
})
