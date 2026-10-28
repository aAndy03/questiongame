import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { MotionGlobalConfig } from 'motion/react'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { EMPTY_PLAY_STATE } from '@questiongame/contract'
import { App } from '@/App'
import { tipsOf, useChromeStore } from '@/chrome/chrome'
import { HOME, useNavStore } from '@/chrome/nav'
import { useNoticeStore } from '@/chrome/notices'
import { TIPS, TIPS_COPY } from '@/copy/tips'
import { createFakeHost, type FakeHost } from '@/host/fake'
import { demoLibrary, demoRecipe } from '@/host/devFake'
import { setHostTransport } from '@/host/host'
import { receivePlayState } from '@/host/playState'
import { knowledge } from '@/tips/engine'
import { setTipsClock, tipMoment } from '@/tips/signals'
import { TipCard, tipDuration } from './TipCard'

/**
 * beta.11: tips in the real shell — the first launch's *How the game plays*,
 * a card that never asks for attention, the three ways it closes and what
 * each teaches the engine, silence during a show (a rehearsal excepted), and
 * Settings ▸ Help & tips.
 */
const T0 = new Date(2026, 9, 28, 10).getTime()
let fake: FakeHost
const card = () => document.querySelector<HTMLElement>('[data-tip]')
const prefs = () => useChromeStore.getState().prefs[useChromeStore.getState().operatorId]

// jsdom never finishes an exit animation: a closed card would stay mounted.
beforeAll(() => {
  MotionGlobalConfig.skipAnimations = true
})
afterAll(() => {
  MotionGlobalConfig.skipAnimations = false
})

beforeEach(() => {
  setTipsClock(() => T0)
  useNavStore.setState({ route: HOME, back: [], forward: [], guard: null })
  useNoticeStore.setState({ notices: [] })
  useChromeStore.setState({ listState: {}, prefs: {}, operatorId: '', archiveScope: {} })
  receivePlayState(null)
  fake = createFakeHost()
  fake.seed(demoLibrary(), [demoRecipe()])
  setHostTransport(fake)
})
afterEach(() => {
  setTipsClock(null)
  setHostTransport(null)
  cleanup()
})

describe('the first launch (beta.11)', () => {
  it('shows How the game plays, once, without a backdrop or taking focus', async () => {
    render(<App />)
    await waitFor(() => expect(card()?.dataset['tip']).toBe('how-the-game-plays'))
    const tip = card()!
    expect(tip.getAttribute('role')).toBe('status')
    expect(tip.getAttribute('aria-live')).toBe('polite')
    expect(tip.contains(document.activeElement)).toBe(false)
    // No dimming: nothing covers the window behind it.
    expect(document.querySelector('[data-tip-host]')?.className).toContain('pointer-events-none')
    expect(document.querySelector('.fixed.inset-0[data-tip-host], [data-tip-backdrop]')).toBeNull()
    fireEvent.click(within(tip).getByRole('button', { name: TIPS_COPY.gotIt }))
    await waitFor(() => expect(card()).toBeNull())
    expect(tipsOf(prefs()).firstLaunchDone).toBe(true)
    act(() => tipMoment('first-launch'))
    expect(card()).toBeNull()
  })
})

describe('closing a tip (beta.11)', () => {
  const upFirst = async () => {
    render(<App />)
    await waitFor(() => expect(card()).not.toBeNull())
    return card()!
  }

  it('Got it teaches more than reading, and × or Esc is "not now"', async () => {
    let tip = await upFirst()
    fireEvent.click(within(tip).getByRole('button', { name: TIPS_COPY.gotIt }))
    await waitFor(() => expect(card()).toBeNull())
    expect(knowledge(tipsOf(prefs()), 'how-the-game-plays', T0)).toBeGreaterThan(0)

    useChromeStore.getState().resetTips()
    act(() => tipMoment('first-launch'))
    tip = card()!
    fireEvent.keyDown(within(tip).getByRole('button', { name: TIPS_COPY.gotIt }), { key: 'Escape' })
    await waitFor(() => expect(card()).toBeNull())
    expect(tipsOf(prefs()).tips['how-the-game-plays']?.weight).toBe(0.5)
    expect(knowledge(tipsOf(prefs()), 'how-the-game-plays', T0)).toBe(0)
  })

  it('More in Help opens the tip’s topic', async () => {
    const tip = await upFirst()
    fireEvent.click(within(tip).getByRole('button', { name: TIPS_COPY.moreInHelp }))
    await waitFor(() => expect(useNavStore.getState().route).toMatchObject({ tab: 'help', section: 'how-the-game-plays', topic: 'teams-and-the-token' }))
  })
})

describe('when no tip shows (beta.11)', () => {
  const playing = (isRehearsal: boolean) =>
    ({
      ...EMPTY_PLAY_STATE,
      playId: 'p1',
      status: 'playing',
      operator: { recipeId: 'recipe-demo', legalTokenTargets: [], defaultNextTeamId: null, consecutiveCorrect: 0, isRehearsal, canUndo: false, canRedo: false, eventCount: 0, showGiveToken: false, overrideAfterLock: 'refuse_until_reveal', disabled: [] },
    }) as never

  it('none while a show is playing, and the one up goes', async () => {
    render(<App />)
    await waitFor(() => expect(card()).not.toBeNull())
    act(() => receivePlayState(playing(false)))
    await waitFor(() => expect(card()).toBeNull())
    useChromeStore.getState().resetTips()
    act(() => tipMoment('first-launch'))
    expect(card()).toBeNull()
  })

  it('a rehearsal still gets them', async () => {
    render(<App />)
    await waitFor(() => expect(card()).not.toBeNull())
    act(() => receivePlayState(playing(true)))
    expect(card()).not.toBeNull()
  })

  it('none with Show tips off', async () => {
    render(<App />)
    await waitFor(() => expect(card()).not.toBeNull())
    fireEvent.click(within(card()!).getByRole('button', { name: TIPS_COPY.gotIt }))
    await waitFor(() => expect(card()).toBeNull())
    act(() => useChromeStore.getState().setShowTips(false))
    useChromeStore.getState().resetTips()
    act(() => tipMoment('first-launch'))
    expect(card()).toBeNull()
  })
})

describe('Settings ▸ Help & tips (beta.11)', () => {
  it('turns tips off, and starts them over', async () => {
    render(<App />)
    await act(async () => {
      await useNavStore.getState().go({ tab: 'settings', inner: 'settings' })
    })
    const toggle = await screen.findByRole('switch', { name: TIPS_COPY.showTips })
    fireEvent.click(toggle)
    await waitFor(() => expect(prefs()?.showTips).toBe(false))
    useChromeStore.getState().updateTips((s) => ({ ...s, firstLaunchDone: true }))
    fireEvent.click(screen.getByRole('button', { name: TIPS_COPY.startOver }))
    expect(tipsOf(prefs()).firstLaunchDone).toBe(false)
  })
})

describe('how long a card stays (beta.11)', () => {
  it('reads itself out after its time, and waits while the pointer is on it', () => {
    vi.useFakeTimers()
    try {
      const tip = TIPS[0]!
      const onRead = vi.fn()
      render(<TipCard tip={tip} onRead={onRead} onGotIt={() => {}} onDismiss={() => {}} onMoreInHelp={() => {}} />)
      const total = tipDuration(tip)
      expect(total).toBeGreaterThanOrEqual(8_000)
      expect(total).toBeLessThanOrEqual(30_000)
      fireEvent.pointerEnter(card()!)
      act(() => void vi.advanceTimersByTime(total + 1_000))
      expect(onRead).not.toHaveBeenCalled()
      fireEvent.pointerLeave(card()!)
      act(() => void vi.advanceTimersByTime(total + 200))
      expect(onRead).toHaveBeenCalledTimes(1)
    } finally {
      vi.useRealTimers()
    }
  })
})
