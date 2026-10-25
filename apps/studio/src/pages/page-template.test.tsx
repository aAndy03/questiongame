import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { act, cleanup, render, screen } from '@testing-library/react'
import { App } from '@/App'
import { useChromeStore } from '@/chrome/chrome'
import { HOME, useNavStore, type Route } from '@/chrome/nav'
import { useNoticeStore } from '@/chrome/notices'
import { TABS } from '@/copy'
import { createFakeHost } from '@/host/fake'
import { demoLibrary, demoRecipe } from '@/host/devFake'
import { setHostTransport } from '@/host/host'
import { receivePlayState } from '@/host/playState'

/**
 * beta.9: more room. No page carries a subtitle under its title (the sidebar
 * keeps that text as the tab's description), and the Domains pane's head stays
 * put while only its domains scroll.
 */
beforeEach(() => {
  useNavStore.setState({ route: HOME, back: [], forward: [], guard: null })
  useNoticeStore.setState({ notices: [] })
  useChromeStore.setState({ listState: {}, prefs: {}, operatorId: '', archiveScope: {} })
  receivePlayState(null)
  const fake = createFakeHost()
  fake.seed(demoLibrary(), [demoRecipe()])
  setHostTransport(fake)
})
afterEach(() => {
  setHostTransport(null)
  cleanup()
})

const go = (route: Route) =>
  act(async () => {
    await useNavStore.getState().go(route)
  })

describe('no page subtitles (beta.9)', () => {
  it.each(['teams', 'library', 'games', 'operators', 'settings'] as const)('%s has its title and no subtitle', async (tab) => {
    render(<App />)
    await go({ tab } as Route)
    expect(await screen.findByRole('heading', { level: 1, name: TABS[tab].label })).toBeTruthy()
    const main = document.querySelector('main')!
    expect(main.textContent).not.toContain(TABS[tab].hint)
  })
})

describe('the Domains pane (beta.9)', () => {
  it('keeps its head out of the scroller: only the domains scroll, never sideways', async () => {
    render(<App />)
    await go({ tab: 'library' })
    const list = await screen.findByRole('listbox', { name: 'domains' })
    const scroller = list.closest<HTMLElement>('[data-domain-pane-list]')!
    expect(scroller.className).toContain('overflow-y-auto')
    expect(scroller.className).toContain('overflow-x-hidden')
    const head = document.querySelector<HTMLElement>('[data-domain-pane-head]')!
    expect(scroller.contains(head)).toBe(false)
    expect(head.querySelector('[aria-label="Add domain"]')).toBeTruthy()
    expect(head.textContent).toContain('Active')
  })
})
