import { describe, expect, it } from 'vitest'
import { momentOf, skillOf } from './skills'

/** beta.11 review: what a command teaches is what the operator did — not a preview, not a close. */
describe('what a command teaches (beta.11)', () => {
  it('counts an import only when it is committed', () => {
    expect(skillOf('catalog_import_questions', { commit: false })).toBeNull()
    expect(skillOf('catalog_import_questions', { commit: true })).toBe('import')
  })

  it('counts opening Statistics, not closing it', () => {
    expect(skillOf('stats_window', { open: true })).toBe('statistics-window')
    expect(skillOf('stats_window', { open: false })).toBeNull()
  })

  it('takes a domain saved as making one, a question saved as a moment', () => {
    expect(skillOf('catalog_upsert', { item: { kind: 'domain', item: {} } })).toBe('make-domain')
    expect(skillOf('catalog_upsert', { item: { kind: 'team', item: {} } })).toBeNull()
    expect(momentOf('catalog_upsert', { item: { kind: 'question', item: {} } })).toBe('question:saved')
  })
})
