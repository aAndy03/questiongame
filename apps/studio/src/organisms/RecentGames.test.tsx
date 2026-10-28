import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { App } from '@/App'
import { useChromeStore } from '@/chrome/chrome'
import { HOME, useNavStore } from '@/chrome/nav'
import { useNoticeStore } from '@/chrome/notices'
import { CONTROL } from '@/copy'
import { createFakeHost, type FakeHost } from '@/host/fake'
import { demoLibrary, demoRecipe } from '@/host/devFake'
import { setHostTransport } from '@/host/host'
import { receivePlayState } from '@/host/playState'
import type { PlayRecord, Recipe } from '@/host/types'
import { ago, recentGames, RECENT_GAMES } from './RecentGames'

/**
 * beta.10: Control with nothing loaded offers the games to pick up again —
 * by the later of last played and last edited, at most six — each loadable
 * from there; *Go to Games* stays.
 */
const base = demoRecipe()
const recipe = (id: string, updatedAt: number, extra: Partial<Recipe> = {}): Recipe => ({ ...base, id, name: id, updatedAt, archivedAt: null, ...extra })
const play = (recipeId: string, startedAtMs: number | null, endedAtMs: number | null = null): PlayRecord =>
  ({ id: `p-${recipeId}-${startedAtMs}`, recipeId, operatorId: 'o', status: 'completed', startedAtMs, endedAtMs, eventCount: 0, questionsConsumed: 0, scores: [] }) as unknown as PlayRecord

describe('which games, in which order (beta.10)', () => {
  it('orders by the later of last played and last edited, and says which', () => {
    const games = recentGames([recipe('a', 100), recipe('b', 300), recipe('c', 200)], [play('a', 400), play('c', 150, 250)])
    expect(games.map((g) => [g.recipe.id, g.why])).toEqual([
      ['a', 'played'],
      ['b', 'edited'],
      ['c', 'played'],
    ])
  })

  it('takes six at most, and never an archived game', () => {
    const many = Array.from({ length: 9 }, (_, i) => recipe(`g${i}`, i))
    expect(recentGames(many, [])).toHaveLength(RECENT_GAMES)
    expect(recentGames([recipe('gone', 9, { archivedAt: 10 })], [])).toEqual([])
  })

  it('says when in words', () => {
    const now = Date.UTC(2026, 9, 28, 12)
    expect(ago(now - 2 * 86_400_000, now)).toBe('2 days ago')
    expect(ago(now - 86_400_000, now)).toBe('yesterday')
    expect(ago(now - 5_000, now)).toBe(CONTROL.justNow)
  })
})

describe('Control with nothing loaded (beta.10)', () => {
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

  it('offers the recent games with Load into Control, and keeps Go to Games', async () => {
    render(<App />)
    await act(async () => {
      await useNavStore.getState().go({ tab: 'control' })
    })
    const list = await screen.findByRole('region', { name: CONTROL.recentTitle })
    const card = list.querySelector<HTMLElement>(`[data-recent-game="${demoRecipe().id}"]`)!
    expect(card.textContent).toContain(demoRecipe().name)
    expect(within(list).getByRole('button', { name: CONTROL.goToGames })).toBeTruthy()
    fireEvent.click(within(card).getByRole('button', { name: CONTROL.recentLoad }))
    await waitFor(() => expect(fake.calls.some((c) => c.name === 'play_load' && (c.args as { recipeId: string }).recipeId === demoRecipe().id)).toBe(true))
  })

  it('shows the plain empty state with no games at all', async () => {
    const bare = createFakeHost()
    bare.seed(demoLibrary(), [])
    setHostTransport(bare)
    render(<App />)
    await act(async () => {
      await useNavStore.getState().go({ tab: 'control' })
    })
    expect(await screen.findByRole('button', { name: CONTROL.goToGames })).toBeTruthy()
    expect(screen.queryByRole('region', { name: CONTROL.recentTitle })).toBeNull()
  })
})
