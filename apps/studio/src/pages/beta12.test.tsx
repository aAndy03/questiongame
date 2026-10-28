import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { EMPTY_PLAY_STATE } from '@questiongame/contract'
import { App } from '@/App'
import { useChromeStore } from '@/chrome/chrome'
import { HOME, useNavStore } from '@/chrome/nav'
import { useNoticeStore } from '@/chrome/notices'
import { GROUPS_TAGS } from '@/copy/groupsTags'
import { createFakeHost, type FakeHost } from '@/host/fake'
import { demoLibrary, demoRecipe } from '@/host/devFake'
import { setHostTransport } from '@/host/host'
import { receivePlayState } from '@/host/playState'
import type { Domain, Recipe } from '@/host/types'
import { HelpText, HotkeyChords } from '@/molecules'
import { loadBlocked } from '@/organisms'

/**
 * beta.12, the audit's second half (P26.3): each test is one finding of
 * `docs/superpowers/specs/2026-10-28-p26-beta12-audit.md`, by its number.
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

const at = async (route: Parameters<ReturnType<typeof useNavStore.getState>['go']>[0]) => {
  render(<App />)
  await act(async () => {
    await useNavStore.getState().go(route)
  })
}
const domain = (id: string) => fake.library.get(`domain:${id}`)?.item as Domain | undefined

describe('B12 — one answer to "can this game be loaded?"', () => {
  it('names why, for an archived game, an empty roster and an empty board', () => {
    const base = demoRecipe()
    expect(loadBlocked(base)).toBeNull()
    expect(loadBlocked({ ...base, archivedAt: 1 } as Recipe)).not.toBeNull()
    expect(loadBlocked({ ...base, teams: [] } as Recipe)).not.toBeNull()
    expect(loadBlocked({ ...base, board: [] } as Recipe)).not.toBeNull()
  })
})

describe('B15 — Help and tips draw the operator’s chords', () => {
  it('a {{hotkey:…}} token is the chord set, not the default', () => {
    const { container, rerender } = render(<HelpText text="press {{hotkey:give_token}}" />)
    expect(container.textContent?.toLowerCase()).toContain('t')
    rerender(
      <HotkeyChords.Provider value={{ give_token: 'g' }}>
        <HelpText text="press {{hotkey:give_token}}" />
      </HotkeyChords.Provider>,
    )
    expect(container.querySelector('kbd')?.textContent?.toLowerCase()).toBe('g')
  })

})

describe('C1 / C9 — the domain the route names goes away', () => {
  it('a domain archived while open sends the list back to All questions', async () => {
    await at({ tab: 'library', domainId: 'dom-sport' })
    await screen.findAllByRole('checkbox', { name: /^Select (?!all)/ })
    await act(async () => {
      await fake.invoke('catalog_archive', { kind: 'domain', id: 'dom-sport' })
    })
    await waitFor(() => expect(useNavStore.getState().route).toEqual({ tab: 'library' }))
  })
})

describe('C8 — a domain counts what its list shows', () => {
  it('leaves an archived question out of the pane’s count', async () => {
    await act(async () => {
      await fake.invoke('catalog_archive', { kind: 'question', id: 'q-t1' })
    })
    await at({ tab: 'library' })
    const row = (await screen.findAllByText('Technology'))[0]!.closest<HTMLElement>('li')!
    await waitFor(() => expect(row.textContent).toMatch(/1(?!\d)/))
    expect(domain('dom-tech')?.questions).toHaveLength(2)
  })
})

describe('C11 — one question’s menu has the strip’s edits', () => {
  it('offers tagging and difficulty without ticking the row first', async () => {
    await at({ tab: 'library' })
    const row = (await screen.findByRole('checkbox', { name: /^Select What does the L/ })).closest<HTMLElement>('[role="button"]')!
    fireEvent.click(within(row).getByRole('button', { name: 'Open' }))
    expect(await screen.findByRole('menuitem', { name: GROUPS_TAGS.bulkTag })).toBeTruthy()
    expect(screen.getByRole('menuitem', { name: GROUPS_TAGS.bulkDifficulty })).toBeTruthy()
  })
})

describe('C4 — Manage workspaces while a game is in Control', () => {
  it('keeps New and Manage, and disables only the other workspaces', async () => {
    await at({ tab: 'teams' })
    act(() =>
      receivePlayState({
        ...EMPTY_PLAY_STATE,
        playId: 'p1',
        status: 'loaded',
        operator: { recipeId: 'recipe-demo', legalTokenTargets: [], defaultNextTeamId: null, consecutiveCorrect: 0, isRehearsal: false, canUndo: false, canRedo: false, eventCount: 0, showGiveToken: false, overrideAfterLock: 'refuse_until_reveal', disabled: [] },
      } as never),
    )
    const switcher = document.querySelector<HTMLElement>('[data-workspace-switcher]')!
    const button = within(switcher).getAllByRole('button')[0]!
    expect(button.hasAttribute('disabled')).toBe(false)
    fireEvent.click(button)
    expect(await screen.findByRole('menuitem', { name: /Manage workspaces/ })).toBeTruthy()
  })
})
