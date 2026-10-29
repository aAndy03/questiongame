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

/** beta.13: the tips know what Control and Screens teach now. */
describe('what beta.13 teaches', () => {
  it('moving the token teaches when it moves, and a reveal is the moment to say so', () => {
    expect(skillOf('give_token', { teamId: 't' })).toBe('token-rule')
    expect(skillOf('reveal_and_pass', { teamId: 't' })).toBe('token-rule')
    expect(momentOf('reveal_outcome', undefined)).toBe('control:revealed')
    expect(momentOf('reveal_and_pass', { teamId: 't' })).toBe('control:revealed')
  })

  it('a display aid set is the display-aids skill; another setting is not', () => {
    expect(skillOf('settings_set_global', { setting: { key: 'stage_view', value: {} } })).toBe('display-aids')
    expect(skillOf('settings_set_global', { setting: { key: 'window_native_title_bar', value: true } })).toBe('title-bar')
    expect(skillOf('settings_set_global', { setting: { key: 'timer_duration_ms', value: 1 } })).toBeNull()
  })
})
