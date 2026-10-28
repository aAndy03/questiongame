import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { App } from '@/App'
import { useChromeStore } from '@/chrome/chrome'
import { HOME, useNavStore } from '@/chrome/nav'
import { useNoticeStore } from '@/chrome/notices'
import { HOTKEYS, LIST, TABS } from '@/copy'
import { GESTURES } from '@/copy/gestures'
import { HELP, HELP_COPY } from '@/copy/help'
import { SETTINGS } from '@/copy/settings'
import { createFakeHost, type FakeHost } from '@/host/fake'
import { demoLibrary, demoRecipe } from '@/host/devFake'
import { setHostTransport } from '@/host/host'
import { receivePlayState } from '@/host/playState'

/**
 * beta.10: Help is a page of its own — from the sidebar or F1 — with every
 * section, a search over every line, and the keys and gestures drawn from
 * the registries the app answers to, so it cannot say a key the app ignores.
 */
let fake: FakeHost
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
  setHostTransport(null)
  cleanup()
})

const openHelp = async () => {
  render(<App />)
  await act(async () => {
    await useNavStore.getState().go({ tab: 'help' })
  })
  return screen.findByRole('heading', { level: 1, name: TABS.help.label })
}

describe('Help (beta.10)', () => {
  it('is in the sidebar, beside Settings, and F1 opens it', async () => {
    render(<App />)
    const nav = await screen.findByRole('navigation', { name: /./ })
    expect(within(nav).getByRole('button', { name: new RegExp(TABS.help.label) })).toBeTruthy()
    fireEvent.keyDown(document.body, { key: 'F1', code: 'F1' })
    await waitFor(() => expect(useNavStore.getState().route.tab).toBe('help'))
  })

  it('shows every section, each in On this page', async () => {
    await openHelp()
    for (const s of HELP) expect(screen.getByRole('heading', { level: 2, name: s.title })).toBeTruthy()
    const index = screen.getByRole('navigation', { name: /on this page/i })
    expect(within(index).getAllByRole('button')).toHaveLength(HELP.length)
  })

  it('lists Control’s chords as the operator set them, and every gesture', async () => {
    await fake.invoke('settings_set_shortcut', { command: 'give_token', chord: 'g' })
    await openHelp()
    const keys = document.querySelectorAll('[data-help-shortcuts]')
    expect(keys.length).toBeGreaterThan(0)
    const first = keys[0] as HTMLElement
    for (const label of Object.values(HOTKEYS.labels)) expect(first.textContent).toContain(label)
    // The overridden chord is the one shown, not the default.
    const give = [...first.querySelectorAll('dt')].find((dt) => dt.textContent === HOTKEYS.labels['give_token'])!
    expect(give.nextElementSibling?.textContent?.toLowerCase()).toBe('g')
    const gestures = document.querySelector<HTMLElement>('[data-help-gestures]')!
    for (const g of GESTURES) expect(gestures.querySelector(`[data-gesture="${g.id}"]`)).toBeTruthy()
  })

  it('draws its tokens: key caps, gesture badges, never the raw token', async () => {
    await openHelp()
    const main = document.querySelector<HTMLElement>('[data-layout="settings"]')!
    expect(main.textContent).not.toMatch(/\{\{|\*\*/)
    expect(main.querySelectorAll('kbd').length).toBeGreaterThan(5)
    expect(main.querySelector('[data-gesture="shift-click-run"]')).toBeTruthy()
    expect(main.querySelectorAll('[data-help-figure]')).toHaveLength(5)
  })

  it('finds a topic by its words, marks them, and says when nothing matches', async () => {
    await openHelp()
    const search = screen.getByRole('searchbox', { name: LIST.search })
    fireEvent.change(search, { target: { value: 'AirPlay' } })
    await waitFor(() => expect(document.querySelectorAll('[data-help-topic]')).toHaveLength(1))
    expect(document.querySelector('[data-help-topic="cannot-reach-macos"]')).toBeTruthy()
    expect(document.querySelector('mark[data-hit]')?.textContent).toBe('AirPlay')
    fireEvent.change(search, { target: { value: 'zzqx' } })
    expect(await screen.findByText(HELP_COPY.noResults('zzqx'))).toBeTruthy()
  })
})

describe('Settings ▸ Keyboard shortcuts lists the gestures (beta.10)', () => {
  it('shows every gesture, read-only, under the chords', async () => {
    render(<App />)
    await act(async () => {
      await useNavStore.getState().go({ tab: 'settings', inner: 'shortcuts' })
    })
    expect(await screen.findByText(SETTINGS.shortcuts.gesturesTitle)).toBeTruthy()
    const list = document.querySelector<HTMLElement>('[data-shortcuts-editor] [data-help-gestures]')!
    expect(list.querySelectorAll('[data-gesture]')).toHaveLength(GESTURES.length)
    expect(within(list).queryAllByRole('button')).toHaveLength(0)
  })
})
