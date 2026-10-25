import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { EMPTY_PLAY_STATE } from '@questiongame/contract'
import { App } from '@/App'
import { HOME, useNavStore } from '@/chrome/nav'
import { useNoticeStore } from '@/chrome/notices'
import { createFakeHost, type FakeHost } from '@/host/fake'
import { demoLibrary, demoRecipe } from '@/host/devFake'
import { setHostTransport } from '@/host/host'
import { receivePlayState } from '@/host/playState'
import { resetUpdateCheck } from '@/host/updates'
import { resetWhatsNew } from '@/host/whatsNew'
import { SETTINGS } from '@/copy/settings'
import { WHATS_NEW, WHATS_NEW_COPY } from '@/copy/whatsNew'

/**
 * P12.10. The first launch after an update says what changed, in plain words,
 * once — never over a game that is loaded — and in either language.
 */
const notes = WHATS_NEW.find((r) => r.version === '1.0.2')!.notes

let fake: FakeHost

beforeEach(() => {
  useNavStore.setState({ route: HOME, back: [], forward: [], guard: null })
  useNoticeStore.setState({ notices: [], collectorOpen: false })
  receivePlayState(null)
  resetUpdateCheck()
  resetWhatsNew()
  fake = createFakeHost()
  fake.seed(demoLibrary(), [demoRecipe()])
  setHostTransport(fake)
})
afterEach(() => setHostTransport(null))

describe("What's new (P12.10)", () => {
  it('shows what changed since the last version seen, and not again once closed', async () => {
    fake.whatsNewSince = '1.0.1'
    render(<App />)
    const dialog = await screen.findByRole('dialog', { name: WHATS_NEW_COPY.en.title('1.0.2') })
    expect(within(dialog).getByText(notes.en[0]!.title)).toBeTruthy()

    fireEvent.click(within(dialog).getByRole('button', { name: WHATS_NEW_COPY.en.close }))
    await waitFor(() => expect(fake.calls.some((c) => c.name === 'whats_new_seen')).toBe(true))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(fake.whatsNewSince).toBe('1.0.2')
  })

  it('reads in Romanian too', async () => {
    fake.whatsNewSince = '1.0.1'
    render(<App />)
    const dialog = await screen.findByRole('dialog', { name: WHATS_NEW_COPY.en.title('1.0.2') })
    fireEvent.click(within(dialog).getByRole('radio', { name: 'Română' }))
    expect(await within(dialog).findByText(notes.ro[0]!.title)).toBeTruthy()
    expect(within(dialog).getByRole('button', { name: WHATS_NEW_COPY.ro.close })).toBeTruthy()
  })

  it('says nothing to a library with nothing new', async () => {
    fake.whatsNewSince = null
    render(<App />)
    await waitFor(() => expect(fake.calls.some((c) => c.name === 'whats_new_get')).toBe(true))
    await new Promise((r) => setTimeout(r, 50))
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('waits while a game is loaded', async () => {
    fake.whatsNewSince = '1.0.1'
    const loaded = {
      ...EMPTY_PLAY_STATE,
      playId: 'p1',
      status: 'playing',
      operator: {
        recipeId: 'recipe-demo',
        legalTokenTargets: [],
        defaultNextTeamId: null,
        consecutiveCorrect: 0,
        isRehearsal: false,
        canUndo: false,
        canRedo: false,
        eventCount: 1,
        showGiveToken: false,
        overrideAfterLock: 'refuse_until_reveal',
        disabled: [],
      },
    }
    // Studio asks the host for the Play when it mounts; the host has one.
    fake.playState = loaded as never
    receivePlayState(loaded as never)
    render(<App />)
    await waitFor(() => expect(fake.calls.some((c) => c.name === 'settings_get')).toBe(true))
    await new Promise((r) => setTimeout(r, 100))
    expect(screen.queryByRole('dialog', { name: WHATS_NEW_COPY.en.title('1.0.2') })).toBeNull()
    fake.playState = null
    act(() => receivePlayState(null))
    expect(await screen.findByRole('dialog', { name: WHATS_NEW_COPY.en.title('1.0.2') })).toBeTruthy()
  })

  it('opens from Settings ▸ About at any time', async () => {
    fake.whatsNewSince = null
    render(<App />)
    await act(async () => {
      await useNavStore.getState().go({ tab: 'settings', inner: 'about' })
    })
    fireEvent.click(await screen.findByRole('button', { name: SETTINGS.about.whatsNew }))
    expect(await screen.findByRole('dialog', { name: WHATS_NEW_COPY.en.title('1.0.2') })).toBeTruthy()
  })
})

describe("What's new holds every release (beta.9)", () => {
  it('lists every release up to this one, stable and beta, newest first and chosen; another is a click away', async () => {
    const { useWhatsNewStore } = await import('@/chrome/whatsNew')
    const { WhatsNewDialog } = await import('@/organisms')
    const beta8 = WHATS_NEW.find((r) => r.version === '2.0.0-beta.8')!
    const beta9 = WHATS_NEW.find((r) => r.version === '2.0.0-beta.9')!
    const { QueryClient, QueryClientProvider } = await import('@tanstack/react-query')
    render(
      <QueryClientProvider client={new QueryClient()}>
        <WhatsNewDialog />
      </QueryClientProvider>,
    )
    act(() => useWhatsNewStore.getState().show({ releases: [beta8], markSeen: true }))
    const dialog = await screen.findByRole('dialog', { name: WHATS_NEW_COPY.en.title('2.0.0-beta.8') })
    const list = within(dialog).getByRole('navigation', { name: 'Releases' })
    const versions = within(list).getAllByRole('button').map((o) => o.getAttribute('aria-label'))
    expect(versions[0]).toBe('2.0.0-beta.8, new')
    expect(within(list).getByRole('button', { name: '2.0.0-beta.8, new' }).getAttribute('aria-current')).toBe('true')
    expect(versions).toContain('1.1.1')
    expect(versions).not.toContain(beta9.version)
    // Never published: not a release to list.
    expect(versions).not.toContain('2.0.0-beta.7')
    expect(within(dialog).getByText(beta8.notes.en[0]!.title)).toBeTruthy()
    fireEvent.click(within(list).getByRole('button', { name: '1.1.1' }))
    const stable = WHATS_NEW.find((r) => r.version === '1.1.1')!
    expect(await within(dialog).findByText(stable.notes.en[0]!.title)).toBeTruthy()
    expect(within(dialog).getByRole('heading', { name: WHATS_NEW_COPY.en.title('1.1.1') })).toBeTruthy()
  })
})

describe("What's new on a stable build (beta.9)", () => {
  it('lists stable releases only: a stable user is never shown a beta', async () => {
    const { useWhatsNewStore } = await import('@/chrome/whatsNew')
    const { WhatsNewDialog } = await import('@/organisms')
    const { QueryClient, QueryClientProvider } = await import('@tanstack/react-query')
    render(
      <QueryClientProvider client={new QueryClient()}>
        <WhatsNewDialog />
      </QueryClientProvider>,
    )
    const stable = WHATS_NEW.find((r) => r.version === '1.1.1')!
    act(() => useWhatsNewStore.getState().show({ releases: [stable], markSeen: false }))
    const dialog = await screen.findByRole('dialog', { name: WHATS_NEW_COPY.en.title('1.1.1') })
    const versions = within(within(dialog).getByRole('navigation', { name: 'Releases' }))
      .getAllByRole('button')
      .map((o) => o.getAttribute('aria-label'))
    expect(versions.every((v) => !v?.includes('-'))).toBe(true)
    expect(versions[0]).toBe('1.1.1')
  })
})
