import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { App } from '@/App'
import { useChromeStore } from '@/chrome/chrome'
import { HOME, useNavStore } from '@/chrome/nav'
import { useNoticeStore } from '@/chrome/notices'
import { createFakeHost, type FakeHost } from '@/host/fake'
import { demoLibrary, demoRecipe } from '@/host/devFake'
import { setHostTransport } from '@/host/host'
import { receivePlayState } from '@/host/playState'
import type { BulkReport, Domain } from '@/host/types'
import { alreadyNote, chipNote, domainAt, dropSummary, grabbed, type QuestionDragState } from '@/organisms'

/**
 * beta.9: drag questions onto a domain. dnd-kit's pointer sensor does not
 * start under jsdom (no layout), so the drag itself is driven in the e2e suite
 * (`e2e/specs/drag-domains.e2e.ts`) and checked in the browser; here are its
 * parts — what a grab carries, the exact-over hit test, the write through the
 * host's mirror, the toast, and the row menu's keyboard way.
 */
let fake: FakeHost
const realFromPoint = document.elementFromPoint

beforeEach(() => {
  useNavStore.setState({ route: HOME, back: [], forward: [], guard: null })
  useNoticeStore.setState({ notices: [] })
  useChromeStore.setState({ listState: {}, prefs: {}, operatorId: '', archiveScope: {} })
  receivePlayState(null)
  fake = createFakeHost()
  fake.seed(demoLibrary(), [demoRecipe()])
  setHostTransport(fake)
})
afterEach(() => {
  document.elementFromPoint = realFromPoint
  setHostTransport(null)
  cleanup()
})

const homesOf = (q: string) => [...fake.library.values()].filter((r) => r.kind === 'domain' && (r.item as Domain).questions.some((m) => m.questionId === q)).map((r) => r.item.id)

describe('what a grab carries (beta.9)', () => {
  const order = (ids: readonly string[]) => [...ids].sort()
  it('carries the selection, in view order, when the grabbed row is in it', () => {
    expect(grabbed('b', new Set(['c', 'b', 'a']), order)).toEqual(['a', 'b', 'c'])
  })
  it('carries the grabbed row alone when it is not selected, whatever else is', () => {
    expect(grabbed('x', new Set(['a', 'b']), order)).toEqual(['x'])
  })
})

describe('only a release exactly over a domain counts (beta.9)', () => {
  it('finds the domain row under the point, from anything inside it', () => {
    const row = document.createElement('div')
    row.dataset['domainDrop'] = 'dom-sport'
    row.dataset['domainName'] = 'Sport'
    const inner = document.createElement('span')
    row.append(inner)
    document.body.append(row)
    document.elementFromPoint = () => inner
    expect(domainAt({ x: 1, y: 1 })).toEqual({ id: 'dom-sport', name: 'Sport' })
    row.remove()
  })
  it('finds nothing over anything else, or over nothing', () => {
    document.elementFromPoint = () => document.body
    expect(domainAt({ x: 1, y: 1 })).toBeNull()
    document.elementFromPoint = () => null
    expect(domainAt({ x: 1, y: 1 })).toBeNull()
  })
})

describe('what the toast says (beta.9)', () => {
  const r = (changed: number, unchanged: number): BulkReport => ({
    changed: Array.from({ length: changed }, (_, i) => `c${i}`),
    unchanged: Array.from({ length: unchanged }, (_, i) => `u${i}`),
  })
  it.each([
    [r(5, 3), 0, false, 'Added 5 questions to History · 3 were already there', true],
    [r(1, 0), 0, false, 'Added 1 question to History', true],
    [r(8, 0), 2, true, 'Moved 8 questions to History · 2 archived were left out', true],
    [r(0, 3), 0, false, 'All 3 are already in History', false],
    [r(0, 1), 0, false, 'That question is already in History', false],
    [r(0, 2), 0, true, 'All 2 are already only in History', false],
  ])('%#', (report, leftOut, move, text, changed) => {
    expect(dropSummary(report, leftOut, move, 'History')).toEqual({ text, changed })
  })
})

describe('the write a drop makes, through the host (beta.9)', () => {
  it('adds: the question joins and keeps its other domains', async () => {
    const report = await fake.invoke<BulkReport>('catalog_bulk_edit', { ids: ['q-t1'], edit: { op: 'add_to_domain', domainId: 'dom-sport' }, preview: false })
    expect(report.changed).toEqual(['q-t1'])
    expect(homesOf('q-t1').sort()).toEqual(['dom-sport', 'dom-tech'])
  })
  it('moves: the question ends in the target alone; one already only there is unchanged', async () => {
    const report = await fake.invoke<BulkReport>('catalog_bulk_edit', { ids: ['q-t1'], edit: { op: 'move_to_domain', domainId: 'dom-history' }, preview: false })
    expect(report.changed).toEqual(['q-t1'])
    expect(homesOf('q-t1')).toEqual(['dom-history'])
    const again = await fake.invoke<BulkReport>('catalog_bulk_edit', { ids: ['q-t1'], edit: { op: 'move_to_domain', domainId: 'dom-history' }, preview: false })
    expect(again.unchanged).toEqual(['q-t1'])
  })
})

describe('the chip, before the drop (beta.12)', () => {
  const base: QuestionDragState = { ids: ['a', 'b', 'c'], over: { id: 'd1', name: 'Astronomie' }, move: false, homes: [] }

  it('counts each domain once, and archived ones only for a move', () => {
    // A question grouped under two domains is two rows; its archived copies are not where it is.
    const homes = [
      { id: 'd1', name: 'Astronomie' },
      { id: 'd2', name: 'Biblie' },
      { id: 'd1', name: 'Astronomie' },
      { id: 'old', name: 'Biblie (old)', archived: true },
    ]
    expect(chipNote({ ...base, over: null, homes }).text).toBe('in 2 domains')
    expect(chipNote({ ...base, move: true, homes }).replaces).toBe(2)
  })

  it('says some or all are already in the domain under the pointer', () => {
    expect(alreadyNote({ ...base, already: 3 })).toBe('all 3 already there')
    expect(alreadyNote({ ...base, already: 1 })).toBe('1 already there')
    expect(alreadyNote({ ...base, already: 0 })).toBeNull()
    expect(alreadyNote({ ...base, over: null, already: 3 })).toBeNull()
  })
})

describe('the keyboard way: a question row and the strip (beta.9)', () => {
  async function onLibrary() {
    render(<App />)
    await act(async () => {
      await useNavStore.getState().go({ tab: 'library' })
    })
    await screen.findAllByRole('checkbox', { name: /^Select (?!all)/ })
  }

  it('offers Add to domain… and Move to domain… on a question row', async () => {
    await onLibrary()
    const row = screen.getByRole('checkbox', { name: /^Select What does the L/ }).closest<HTMLElement>('[role="button"]')!
    fireEvent.click(within(row).getByRole('button', { name: 'Open' }))
    expect(await screen.findByRole('menuitem', { name: 'Add to domain…' })).toBeTruthy()
    fireEvent.click(screen.getByRole('menuitem', { name: 'Move to domain…' }))
    expect(await screen.findByText('Each question leaves every other domain it is in, so it ends in this one alone.')).toBeTruthy()
  })

  it('offers Add to and Move to domain… in the strip’s Copy or move…, as a row’s menu does (beta.12)', async () => {
    await onLibrary()
    fireEvent.click(screen.getByRole('checkbox', { name: /^Select What does the L/ }))
    const strip = document.querySelector<HTMLElement>('[data-bulk-strip]')!
    fireEvent.click(within(strip).getByRole('button', { name: 'Copy or move…' }))
    expect(await screen.findByRole('menuitem', { name: 'Add to domain…' })).toBeTruthy()
    expect(screen.getByRole('menuitem', { name: 'Copy to workspace…' })).toBeTruthy()
    fireEvent.click(screen.getByRole('menuitem', { name: 'Move to domain…' }))
    expect(await screen.findByText('Each question leaves every other domain it is in, so it ends in this one alone.')).toBeTruthy()
  })

  it('keeps Edit… for what edits the questions where they are', async () => {
    await onLibrary()
    fireEvent.click(screen.getByRole('checkbox', { name: /^Select What does the L/ }))
    const strip = document.querySelector<HTMLElement>('[data-bulk-strip]')!
    fireEvent.click(within(strip).getByRole('button', { name: 'Edit…' }))
    expect(await screen.findByRole('menuitem', { name: 'Add question tag…' })).toBeTruthy()
    expect(screen.queryByRole('menuitem', { name: 'Add to domain…' })).toBeNull()
  })

  it('makes question rows draggable without drawing any sign of it', async () => {
    await onLibrary()
    const row = screen.getByRole('checkbox', { name: /^Select What does the L/ }).closest<HTMLElement>('[role="button"]')!
    expect(row.querySelector('[data-drag-handle], [aria-roledescription="draggable"] svg')).toBeNull()
    expect(document.querySelectorAll('[data-domain-drop]').length).toBeGreaterThan(0)
  })
})
