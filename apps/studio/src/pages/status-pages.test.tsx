import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react'
import { App } from '@/App'
import { useChromeStore } from '@/chrome/chrome'
import { HOME, useNavStore, type Route } from '@/chrome/nav'
import { useNoticeStore } from '@/chrome/notices'
import { createFakeHost } from '@/host/fake'
import { demoLibrary, demoRecipe } from '@/host/devFake'
import { setHostTransport } from '@/host/host'
import { receivePlayState } from '@/host/playState'
import { InStatusBar, StatusSlot, StatusSlotProvider } from '@/organisms'

/**
 * beta.9: a list page's pages ride in the status bar, so the list runs to the
 * bottom; each page fills the slot with its own list's, and a page without a
 * list leaves it empty. A list with no status bar keeps its footer.
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

const slot = () => document.querySelector<HTMLElement>('[data-status-slot]')!
const go = (route: Route) =>
  act(async () => {
    await useNavStore.getState().go(route)
  })

describe('pagination in the status bar (beta.9)', () => {
  it('shows the open page’s pages in the status bar, in the status variant, and none under the list', async () => {
    render(<App />)
    await go({ tab: 'library' })
    await waitFor(() => expect(within(slot()).getByText(/of 7 questions/)).toBeTruthy())
    expect(slot().closest('footer')).toBeTruthy()
    expect(slot().querySelector('[data-page-footer="status"]')).toBeTruthy()
    expect(document.querySelector('main [data-page-footer]')).toBeNull()
  })

  it('follows the tab, and is empty on a page without a list', async () => {
    render(<App />)
    await go({ tab: 'teams' })
    await waitFor(() => expect(within(slot()).getByText(/of 4 teams/)).toBeTruthy())
    await go({ tab: 'settings' } as Route)
    await waitFor(() => expect(slot().textContent).toBe(''))
    await go({ tab: 'library' })
    await waitFor(() => expect(within(slot()).getByText(/questions/)).toBeTruthy())
    expect(within(slot()).queryByText(/teams/)).toBeNull()
  })

  it('pages from the status bar', async () => {
    render(<App />)
    await go({ tab: 'library' })
    await waitFor(() => expect(within(slot()).getByRole('navigation', { name: /pages/i })).toBeTruthy())
    expect(screen.getAllByRole('navigation', { name: /pages/i })).toHaveLength(1)
  })
})

describe('a list with no status bar (beta.9)', () => {
  it('keeps its footer where it stands; with one, the footer goes to the bar', () => {
    render(<InStatusBar inline={<span>under the list</span>}>in the bar</InStatusBar>)
    expect(screen.getByText('under the list')).toBeTruthy()
    cleanup()
    render(
      <StatusSlotProvider>
        <main>
          <InStatusBar inline={<span>under the list</span>}>in the bar</InStatusBar>
        </main>
        <footer>
          <StatusSlot />
        </footer>
      </StatusSlotProvider>,
    )
    expect(screen.queryByText('under the list')).toBeNull()
    expect(slot().textContent).toBe('in the bar')
  })
})
