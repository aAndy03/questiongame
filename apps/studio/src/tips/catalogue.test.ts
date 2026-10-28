import { describe, expect, it } from 'vitest'
import { GESTURES } from '@/copy/gestures'
import { HELP } from '@/copy/help'
import { ACTION_SKILLS, TIPS } from '@/copy/tips'
import { MOMENTS } from './engine'

/**
 * beta.11: the tips hold together — every moment a tip answers is reported
 * somewhere, every skill is one Studio can learn, every *More in Help* opens
 * a topic that exists.
 */
const SOURCES = import.meta.glob(['../**/*.{ts,tsx}', '!../**/*.test.{ts,tsx}', '!../copy/tips.ts', '!./engine.ts'], {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>
const ALL = Object.values(SOURCES).join('\n')
const SKILLS = new Set<string>([...GESTURES.map((g) => g.id), ...ACTION_SKILLS])

describe('the tips catalogue (beta.11)', () => {
  it('has unique ids and a title and body each', () => {
    const ids = TIPS.map((t) => t.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const t of TIPS) expect(t.title.length * t.body.length).toBeGreaterThan(0)
  })

  it('answers only moments the engine knows, each tip at least one', () => {
    for (const t of TIPS) {
      const moments = Object.keys(t.moments)
      expect(moments.length, t.id).toBeGreaterThan(0)
      for (const m of moments) expect(MOMENTS, `${t.id}: ${m}`).toContain(m)
    }
  })

  it('teaches and requires only skills Studio can learn', () => {
    for (const t of TIPS) {
      expect(SKILLS.has(t.skill), `${t.id}: ${t.skill}`).toBe(true)
      if (t.requires) expect(SKILLS.has(t.requires), `${t.id} requires ${t.requires}`).toBe(true)
    }
  })

  it('opens a Help topic that exists', () => {
    for (const t of TIPS) {
      const section = HELP.find((s) => s.id === t.help.section)
      expect(section?.topics.some((topic) => topic.id === t.help.topic), `${t.id}: ${t.help.section}/${t.help.topic}`).toBe(true)
    }
  })

  it('names only gestures that exist', () => {
    const known = new Set(GESTURES.map((g) => g.id))
    for (const t of TIPS) for (const m of t.body.matchAll(/\{\{gesture:([^}]+)\}\}/g)) expect(known.has(m[1] ?? ''), `${t.id}: ${m[1]}`).toBe(true)
  })

  it('has every moment reported by some call site', () => {
    for (const m of MOMENTS) {
      const reported = m.startsWith('route:') ? true : ALL.includes(`'${m}'`)
      expect(reported, `nothing reports ${m}`).toBe(true)
    }
  })

  it('has every skill learned somewhere: a gesture handler or an action', () => {
    for (const skill of SKILLS) {
      const learned = ALL.includes(`tipLearned('${skill}')`) || ALL.includes(`'${skill}'`)
      expect(learned, `nothing teaches ${skill}`).toBe(true)
    }
  })
})
