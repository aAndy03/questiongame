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
 * show says where (*Found in answers*).
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
  it('marks a hit in the title and says nothing about where', async () => {
    await search('byzantine')
    await screen.findByText((_, el) => el?.tagName === 'MARK' && /byzantine/i.test(el.textContent ?? ''))
    expect(marks().some((m) => /^byzantine$/i.test(m ?? ''))).toBe(true)
    expect(document.querySelector('[data-found]')).toBeNull()
  })

  it('says Found in answers when the hit is only in an answer, and marks it in the options', async () => {
    await search('rome')
    const found = await screen.findByText('Found in answers')
    expect(found).toBeTruthy()
    expect(marks()).toContain('Rome')
  })

  it('marks the hit in the opened question beside the list', async () => {
    await search('rome')
    await screen.findByText('Found in answers')
    const row = screen.getByRole('checkbox', { name: /^Select Which city was the capital/ }).closest<HTMLElement>('[role="button"]')!
    fireEvent.click(row)
    await screen.findByText('Options')
    // The row's subtitle and the aside's option B.
    expect(marks().filter((m) => m === 'Rome').length).toBeGreaterThanOrEqual(2)
  })

  it('marks nothing once the search is cleared', async () => {
    await search('rome')
    await screen.findByText('Found in answers')
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: '' } })
    await waitFor(() => expect(marks()).toEqual([]))
  })
})
