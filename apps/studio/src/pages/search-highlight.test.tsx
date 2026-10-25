import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { App } from '@/App'
import { useChromeStore } from '@/chrome/chrome'
import { HOME, useNavStore } from '@/chrome/nav'
import { useNoticeStore } from '@/chrome/notices'
import { createFakeHost } from '@/host/fake'
import { demoLibrary, demoRecipe } from '@/host/devFake'
import { setHostTransport } from '@/host/host'
import { receivePlayState } from '@/host/playState'

/**
 * beta.9: the search in force is marked where it hits — the row, the opened
 * question beside the list — and a row whose hit sits somewhere it does not
 * show shows it: the answers themselves, cut so the hit is in view.
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

async function search(text: string) {
  render(<App />)
  await act(async () => {
    await useNavStore.getState().go({ tab: 'library' })
  })
  await screen.findAllByRole('checkbox', { name: /^Select (?!all)/ })
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: text } })
}

const marks = () => [...document.querySelectorAll('mark[data-hit]')].map((m) => m.textContent)

describe('search highlight (beta.9)', () => {
  it('cuts the answers so a hit far along stays in view', async () => {
    const { snippetAround } = await import('@questiongame/text')
    expect(snippetAround('Alexandria · Antioch · Carthage · Constantinople · Rome', 'rome').startsWith('…')).toBe(true)
  })

  it('marks a hit in the title and says nothing about where', async () => {
    await search('byzantine')
    await screen.findByText((_, el) => el?.tagName === 'MARK' && /byzantine/i.test(el.textContent ?? ''))
    expect(marks().some((m) => /^byzantine$/i.test(m ?? ''))).toBe(true)
    expect(document.querySelector('[data-found]')).toBeNull()
  })

  it('shows the answers when the hit is only in one, marked, in place of the subtitle', async () => {
    await search('rome')
    const found = await waitFor(() => {
      const el = document.querySelector<HTMLElement>('[data-found]')
      expect(el?.textContent).toBe('Constantinople · Rome · Athens')
      return el!
    })
    expect(found.querySelector('mark')?.textContent).toBe('Rome')
    expect(document.body.textContent).not.toMatch(/Found in/)
    expect(marks()).toContain('Rome')
  })

  it('says where the words the stem lacks were found, when one word is in the stem', async () => {
    await search('byzantine rome')
    await waitFor(() => expect(document.querySelector('[data-found]')?.textContent).toBe('Constantinople · Rome · Athens'))
  })

  it('marks the hit in the opened question beside the list', async () => {
    await search('rome')
    await waitFor(() => expect(document.querySelector('[data-found]')).toBeTruthy())
    const row = screen.getByRole('checkbox', { name: /^Select Which city was the capital/ }).closest<HTMLElement>('[role="button"]')!
    fireEvent.click(row)
    await screen.findByText('Options')
    // The row's subtitle and the aside's option B.
    expect(marks().filter((m) => m === 'Rome').length).toBeGreaterThanOrEqual(2)
  })

  it('marks nothing once the search is cleared', async () => {
    await search('rome')
    await waitFor(() => expect(document.querySelector('[data-found]')).toBeTruthy())
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: '' } })
    await waitFor(() => expect(marks()).toEqual([]))
  })
})
