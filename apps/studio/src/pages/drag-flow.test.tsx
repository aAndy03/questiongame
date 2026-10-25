import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type { ReactNode } from 'react'

/**
 * beta.9: the drag itself, end to end through the page — what the provider
 * does with dnd-kit's start, move and end, and what the page writes and says.
 * jsdom cannot start dnd-kit's pointer sensor, so `@dnd-kit/react` is replaced
 * by a provider that hands its handlers to the test; everything after them is
 * the real code (the hit test, Ctrl, Escape, `dropOn`, the fake host).
 */
type Handlers = {
  onDragStart(e: unknown): void
  onDragMove(e: unknown): void
  onDragEnd(e: unknown): void
}
const dnd = vi.hoisted(() => ({ handlers: null as Handlers | null }))
vi.mock('@dnd-kit/react', () => ({
  PointerSensor: {},
  DragDropProvider: (props: Handlers & { children: ReactNode }) => {
    dnd.handlers = props
    return props.children
  },
  useDraggable: () => ({ ref: () => {} }),
}))
const said = vi.hoisted(() => ({ messages: [] as string[] }))
vi.mock('@/chrome/toast', () => ({
  toast: {
    info: (m: string) => said.messages.push(m),
    success: (m: string) => said.messages.push(m),
    warn: (m: string) => said.messages.push(m),
  },
}))

import { App } from '@/App'
import { useChromeStore } from '@/chrome/chrome'
import { HOME, useNavStore } from '@/chrome/nav'
import { useNoticeStore } from '@/chrome/notices'
import { createFakeHost, type FakeHost } from '@/host/fake'
import { demoLibrary, demoRecipe } from '@/host/devFake'
import { setHostTransport } from '@/host/host'
import { receivePlayState } from '@/host/playState'
import type { Domain } from '@/host/types'

let fake: FakeHost
const realFromPoint = document.elementFromPoint
beforeEach(() => {
  said.messages = []
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

const homesOf = (q: string) =>
  [...fake.library.values()]
    .filter((r) => r.kind === 'domain' && (r.item as Domain).questions.some((m) => m.questionId === q))
    .map((r) => r.item.id)
    .sort()

async function onLibrary() {
  render(<App />)
  await act(async () => {
    await useNavStore.getState().go({ tab: 'library' })
  })
  await screen.findAllByRole('checkbox', { name: /^Select (?!all)/ })
  await waitFor(() => expect(document.querySelectorAll('[data-domain-drop]').length).toBe(3))
}

/** The pointer is over this domain row (or over nothing that takes a drop). */
function pointAt(domainId: string | null) {
  const el = domainId ? document.querySelector(`[data-domain-drop="${domainId}"]`) : document.body
  document.elementFromPoint = () => el
}
const pointer = (ctrl = false) => ({ nativeEvent: new MouseEvent('pointermove', { clientX: 10, clientY: 10, ctrlKey: ctrl }) })

async function drag(id: string, over: string | null, opts: { ctrl?: boolean; escape?: boolean; canceled?: boolean } = {}) {
  const h = dnd.handlers!
  pointAt(over)
  act(() => h.onDragStart({ operation: { source: { id } }, ...pointer(false) }))
  act(() => h.onDragMove(pointer(opts.ctrl)))
  if (opts.escape) act(() => void window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })))
  await act(async () => {
    h.onDragEnd({ canceled: opts.canceled ?? false })
    await new Promise((r) => setTimeout(r, 0))
  })
}

describe('a drop on a domain (beta.9)', () => {
  it('adds: the question joins the domain and keeps its others; the note says so', async () => {
    await onLibrary()
    await drag('q-t1', 'dom-sport')
    await waitFor(() => expect(homesOf('q-t1')).toEqual(['dom-sport', 'dom-tech']))
    expect(said.messages).toContain('Added 1 question to Sport')
  })

  it('moves with Ctrl held: it ends in that domain alone', async () => {
    await onLibrary()
    await drag('q-t1', 'dom-history', { ctrl: true })
    await waitFor(() => expect(homesOf('q-t1')).toEqual(['dom-history']))
    expect(said.messages).toContain('Moved 1 question to History')
  })

  it('carries the ticked questions when the grabbed one is ticked; they stay ticked', async () => {
    await onLibrary()
    fireEvent.click(screen.getByRole('checkbox', { name: /^Select What does the L/ }))
    fireEvent.click(screen.getByRole('checkbox', { name: /^Select Which of these is not/ }))
    await drag('q-t2', 'dom-sport')
    await waitFor(() => expect(said.messages).toContain('Added 2 questions to Sport'))
    expect(homesOf('q-t1')).toContain('dom-sport')
    expect((screen.getByRole('checkbox', { name: /^Select What does the L/ }) as HTMLInputElement).checked).toBe(true)
  })

  it('says when they were all there already, and writes nothing new', async () => {
    await onLibrary()
    await drag('q-t1', 'dom-tech')
    await waitFor(() => expect(said.messages).toContain('That question is already in Technology'))
    expect(homesOf('q-t1')).toEqual(['dom-tech'])
  })
})

describe('after a drop (beta.9)', () => {
  it('pulses the domain once its new count arrives, on the new number', async () => {
    await onLibrary()
    await drag('q-t1', 'dom-sport')
    await waitFor(() => {
      const count = document.querySelector('[data-domain-drop="dom-sport"] [data-domain-count]')!
      expect(count.textContent).toBe('2')
      expect(count.getAttribute('data-pulsed')).toBe('1')
    })
  })

  it('is judged where the pointer was let go, not at the last move', async () => {
    await onLibrary()
    const h = dnd.handlers!
    pointAt(null)
    act(() => h.onDragStart({ operation: { source: { id: 'q-t1' } }, ...pointer(false) }))
    act(() => h.onDragMove(pointer(false)))
    // Sport is under (20, 20) only; the last move was at (10, 10).
    const sport = document.querySelector('[data-domain-drop="dom-sport"]')
    document.elementFromPoint = (x) => (x === 20 ? sport : document.body)
    await act(async () => {
      h.onDragEnd({ canceled: false, nativeEvent: new MouseEvent('pointerup', { clientX: 20, clientY: 20 }) })
      await new Promise((r) => setTimeout(r, 0))
    })
    await waitFor(() => expect(homesOf('q-t1')).toEqual(['dom-sport', 'dom-tech']))
  })
})

describe('what does not drop (beta.9)', () => {
  it('a release over anything but a domain row writes nothing', async () => {
    await onLibrary()
    await drag('q-t1', null)
    expect(homesOf('q-t1')).toEqual(['dom-tech'])
    expect(said.messages).toEqual([])
  })

  it('Escape cancels, wherever it is released', async () => {
    await onLibrary()
    await drag('q-t1', 'dom-sport', { escape: true })
    expect(homesOf('q-t1')).toEqual(['dom-tech'])
    expect(said.messages).toEqual([])
  })

  it('a drag dnd-kit cancels writes nothing', async () => {
    await onLibrary()
    await drag('q-t1', 'dom-sport', { canceled: true })
    expect(homesOf('q-t1')).toEqual(['dom-tech'])
  })

  it('All questions and archived domains are not drop targets', async () => {
    await onLibrary()
    const all = screen.getByRole('option', { name: /All questions/ })
    expect(all.hasAttribute('data-domain-drop')).toBe(false)
    fireEvent.click(within(document.querySelector<HTMLElement>('[data-domain-pane-head]')!).getByRole('tab', { name: 'Archived' }))
    await waitFor(() => expect(screen.queryByRole('option', { name: /History/ })).toBeNull())
    expect(document.querySelectorAll('[data-domain-drop]').length).toBe(0)
  })
})

describe('the chip (beta.9)', () => {
  it('follows the drag and says Add, or Move once Ctrl is down', async () => {
    await onLibrary()
    const h = dnd.handlers!
    pointAt('dom-sport')
    act(() => h.onDragStart({ operation: { source: { id: 'q-t1' } }, ...pointer(false) }))
    act(() => h.onDragMove(pointer(false)))
    expect(document.querySelector('[data-drag-chip]')?.textContent).toBe('Add 1 to Sport')
    act(() => void window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Control', ctrlKey: true })))
    expect(document.querySelector('[data-drag-chip]')?.textContent).toBe('Move 1 to Sport')
    act(() => void window.dispatchEvent(new KeyboardEvent('keyup', { key: 'Control', ctrlKey: false })))
    expect(document.querySelector('[data-drag-chip]')?.textContent).toBe('Add 1 to Sport')
    await act(async () => {
      h.onDragEnd({ canceled: true })
    })
    expect(document.querySelector('[data-drag-chip]')).toBeNull()
  })

  it('swallows the click a drag ends with, so the opened question stays open', async () => {
    await onLibrary()
    const h = dnd.handlers!
    pointAt(null)
    act(() => h.onDragStart({ operation: { source: { id: 'q-t1' } }, ...pointer(false) }))
    const body = document.querySelector<HTMLElement>('[data-list-body]')!
    const before = useNavStore.getState().route
    act(() => h.onDragEnd({ canceled: false }))
    fireEvent.click(body)
    expect(useNavStore.getState().route).toBe(before)
  })
})
