import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { DEFAULT_DECOR_SETTINGS, VIEWER_SOURCE, applyToAllScreens, parseLayout, type ViewerNodeRect } from '@questiongame/contract'
import { App } from '@/App'
import { HOME, useNavStore } from '@/chrome/nav'
import { useNoticeStore } from '@/chrome/notices'
import { createFakeHost, type FakeHost } from '@/host/fake'
import { demoLibrary, demoRecipe } from '@/host/devFake'
import { setHostTransport } from '@/host/host'
import { nodeName } from '@/host/nodeName'
import { receivePlayState } from '@/host/playState'
import { previewPlay } from '@/host/previewPlay'
import type { Recipe } from '@/host/types'

/**
 * beta.13 (P27.3): the Screens tab, tweaked — the decor that never moved on
 * the canvas, the anchor nothing showed, "Built-in" where a value belonged,
 * raw ids, a save state that said Saved too soon, and no Undo.
 */
let fake: FakeHost
beforeEach(() => {
  fake = createFakeHost()
  fake.seed(demoLibrary(), [demoRecipe()])
  setHostTransport(fake)
  useNavStore.setState({ route: HOME, back: [], forward: [], guard: null })
  useNoticeStore.setState({ notices: [] })
  receivePlayState(null)
})
afterEach(() => {
  setHostTransport(null)
  cleanup()
})

async function openScreens() {
  render(<App />)
  await act(async () => {
    await useNavStore.getState().go({ tab: 'screens' })
  })
  const iframe = (await waitFor(() => {
    const el = document.querySelector<HTMLIFrameElement>('[data-screens-canvas] iframe')
    if (!el) throw new Error('no canvas')
    return el
  })) as HTMLIFrameElement
  const post = async (nodes: ViewerNodeRect[], decor: unknown = null) =>
    act(async () => {
      window.dispatchEvent(new MessageEvent('message', { data: { source: VIEWER_SOURCE, type: 'ready' }, source: iframe.contentWindow }))
      window.dispatchEvent(new MessageEvent('message', { data: { source: VIEWER_SOURCE, type: 'nodes', nodes, decor }, source: iframe.contentWindow }))
    })
  return { iframe, post }
}
const saves = () => fake.calls.filter((c) => c.name === 'recipe_set_layout')

describe('the canvas draws what Stage will', () => {
  it('the preview carries the game’s decor dials and its own clock', () => {
    const recipe = demoRecipe()
    const decor = { ...DEFAULT_DECOR_SETTINGS, drift: 77 }
    const play = previewPlay({ recipe, teams: [], domains: [], questions: [] }, 'idle', { nodes: {}, screens: {}, text: {} }, { decor })
    expect(play.decor.drift).toBe(77)
    const pace = { ...recipe, settings: { ...recipe.settings, timer: { enabled: false, duration_ms: null } } } as Recipe
    const question = previewPlay({ recipe: pace, teams: [], domains: [], questions: [] }, 'question', { nodes: {}, screens: {}, text: {} })
    expect(question.session === null || question.session.timer === null).toBe(true)
  })

  it('runs the decor: the canvas asks Stage to simulate', async () => {
    const { iframe } = await openScreens()
    expect(iframe.getAttribute('src')).toContain('simulate')
  })

  it('draws the boundary and a draggable anchor from what Stage resolved', async () => {
    const { post } = await openScreens()
    await post([{ id: 'idle.wordmark', x: 100, y: 100, width: 400, height: 120 }], { boundary: { x: -160, y: -160, width: 2240, height: 1400 }, anchor: { x: 0.72, y: 0.5 } })
    fireEvent.click(screen.getByRole('tab', { name: 'Decor' }))
    await waitFor(() => expect(document.querySelector('[data-decor-guide="anchor"]')).not.toBeNull())
    expect(document.querySelector('[data-decor-guide="boundary"]')).not.toBeNull()
  })

  it('an override starts from the box Stage drew, so turning it on moves nothing', async () => {
    const { post } = await openScreens()
    await post([], { boundary: { x: -160, y: -160, width: 2240, height: 1400 }, anchor: { x: 0.72, y: 0.5 } })
    fireEvent.click(screen.getByRole('tab', { name: 'Decor' }))
    fireEvent.click(screen.getByRole('switch', { name: 'Override anchor point' }))
    await waitFor(() => expect(saves().length).toBeGreaterThan(0), { timeout: 2000 })
    const layout = saves().at(-1)!.args?.['layout'] as { screens: Record<string, { anchor?: unknown }> }
    expect(layout.screens['idle']?.anchor).toEqual({ x: 0.72, y: 0.5 })
  })
})

describe('what can be clicked, and what it is', () => {
  it('names an element in words, with its id small, and shows what Stage draws now', async () => {
    const { post } = await openScreens()
    await post([{ id: 'idle.eyebrow', x: 100, y: 100, width: 400, height: 40, text: 'YOUR TEXT GOES HERE', fontSize: 28 }])
    const handle = await waitFor(() => {
      const el = document.querySelector<HTMLElement>('[data-node-id="idle.eyebrow"]')
      if (!el) throw new Error('no handle')
      return el
    })
    expect(handle.getAttribute('aria-label')).toBe('Idle ▸ Eyebrow')
    fireEvent.pointerDown(handle, { clientX: 0, clientY: 0, pointerId: 1 })
    fireEvent.pointerUp(handle, { clientX: 0, clientY: 0, pointerId: 1 })
    const inspector = document.querySelector<HTMLElement>('[data-inspector]')!
    expect(within(inspector).getByText('idle.eyebrow')).toBeTruthy()
    expect(within(inspector).getByText('Now: YOUR TEXT GOES HERE')).toBeTruthy()
    expect(within(inspector).getByText('Built-in: 28 px')).toBeTruthy()
    // No placeholder standing in for a value.
    expect(inspector.querySelector('input[placeholder="Built-in"]')).toBeNull()
  })

  it('lists the screen’s elements while nothing is selected, and Escape lets go', async () => {
    const { post } = await openScreens()
    await post([{ id: 'idle.wordmark', x: 100, y: 100, width: 400, height: 120 }])
    const list = await waitFor(() => {
      const el = document.querySelector<HTMLElement>('[data-element-list]')
      if (!el) throw new Error('no list')
      return el
    })
    fireEvent.click(within(list).getByText('Idle ▸ Wordmark'))
    await waitFor(() => expect(document.querySelector('[data-node-handle="selected"]')).not.toBeNull())
    fireEvent.keyDown(window, { key: 'Escape' })
    await waitFor(() => expect(document.querySelector('[data-node-handle="selected"]')).toBeNull())
  })

  it('a row’s name is the team it shows', () => {
    const recipe = demoRecipe()
    const teams = demoLibrary().flatMap((i) => (i.kind === 'team' ? [i.item] : []))
    const play = previewPlay({ recipe, teams, domains: [], questions: [] }, 'teamOrder', { nodes: {}, screens: {}, text: {} })
    const first = play.teams[0]!
    expect(nodeName(`teamOrder.row.${first.id}`, play)).toBe(`Team order ▸ Row · ${first.name}`)
    expect(nodeName('finalLeaderboard.row.2', play)).toBe('Final leaderboard ▸ Row · Place 2')
  })
})

describe('saving, undoing, applying', () => {
  it('says Saving from the first edit, never Saved before the save', async () => {
    const { post } = await openScreens()
    await post([{ id: 'idle.wordmark', x: 100, y: 100, width: 400, height: 120 }])
    const handle = (await waitFor(() => { const el = document.querySelector<HTMLElement>('[data-node-id="idle.wordmark"]'); if (!el) throw new Error('no handle'); return el }))
    fireEvent.focus(handle)
    fireEvent.keyDown(handle, { key: 'ArrowRight' })
    expect(document.querySelector('[data-save-state]')?.getAttribute('data-save-state')).toBe('saving')
    await waitFor(() => expect(document.querySelector('[data-save-state]')?.getAttribute('data-save-state')).toBe('saved'), { timeout: 2000 })
  })

  it('Ctrl+Z takes an edit back, and the undone layout is what saves', async () => {
    const { post } = await openScreens()
    await post([{ id: 'idle.wordmark', x: 100, y: 100, width: 400, height: 120 }])
    const handle = (await waitFor(() => { const el = document.querySelector<HTMLElement>('[data-node-id="idle.wordmark"]'); if (!el) throw new Error('no handle'); return el }))
    fireEvent.focus(handle)
    fireEvent.keyDown(handle, { key: 'ArrowRight' })
    fireEvent.keyDown(window, { key: 'z', ctrlKey: true })
    await waitFor(() => expect(saves().length).toBeGreaterThan(0), { timeout: 2000 })
    const layout = parseLayout(saves().at(-1)!.args?.['layout'])
    expect(layout.nodes['idle.wordmark']).toBeUndefined()
  })

  it('apply to all screens copies a team row only onto team rows, never onto places', () => {
    const base = parseLayout(undefined)
    const done = applyToAllScreens(base, 'teamOrder.row.team-1', { fontSize: 40 })
    expect(done.written.sort()).toEqual(['scoreboard.row.team-1', 'teamOrder.row.team-1'])
    expect(Object.keys(done.layout.nodes)).not.toContain('finalLeaderboard.row.team-1')
  })
})

describe('the review of P27.3', () => {
  it('a held arrow key is one Undo step, not one per press', async () => {
    const { post } = await openScreens()
    await post([{ id: 'idle.wordmark', x: 100, y: 100, width: 400, height: 120 }])
    const handle = await waitFor(() => {
      const el = document.querySelector<HTMLElement>('[data-node-id="idle.wordmark"]')
      if (!el) throw new Error('no handle')
      return el
    })
    fireEvent.focus(handle)
    for (let i = 0; i < 5; i++) fireEvent.keyDown(handle, { key: 'ArrowRight' })
    fireEvent.keyDown(window, { key: 'z', ctrlKey: true })
    await waitFor(() => expect(saves().length).toBeGreaterThan(0), { timeout: 2000 })
    expect(parseLayout(saves().at(-1)!.args?.['layout']).nodes['idle.wordmark']).toBeUndefined()
  })

  it('a click on the anchor without a move writes nothing', async () => {
    const { post } = await openScreens()
    await post([], { boundary: { x: -160, y: -160, width: 2240, height: 1400 }, anchor: { x: 0.72, y: 0.5 } })
    fireEvent.click(screen.getByRole('tab', { name: 'Decor' }))
    const anchor = await waitFor(() => {
      const el = document.querySelector<HTMLElement>('[data-decor-guide="anchor"]')
      if (!el) throw new Error('no anchor')
      return el
    })
    fireEvent.pointerDown(anchor, { clientX: 10, clientY: 10, pointerId: 1 })
    fireEvent.pointerUp(anchor, { clientX: 10, clientY: 10, pointerId: 1 })
    await new Promise((r) => setTimeout(r, 600))
    expect(saves()).toHaveLength(0)
  })

  it('an overlay leaves the screen box alone', async () => {
    const { post } = await openScreens()
    await post([])
    fireEvent.click(screen.getByRole('tab', { name: 'Outcome' }))
    fireEvent.click(screen.getByRole('tab', { name: 'Decor' }))
    expect(await screen.findByText(/an overlay has none of its own/)).toBeTruthy()
    expect(screen.queryByRole('switch', { name: 'Override anchor point' })).toBeNull()
  })
})
