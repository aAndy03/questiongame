import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { DEFAULT_STAGE_VIEW, type PlayStateForMain } from '@questiongame/contract'
import { App } from '@/App'
import { useArmStore } from '@/chrome/arm'
import { useControlLayoutStore } from '@/chrome/control'
import { HOME, useNavStore } from '@/chrome/nav'
import { useNoticeStore } from '@/chrome/notices'
import { createFakeHost, type FakeHost } from '@/host/fake'
import { demoLibrary, demoPlay, demoRecipe } from '@/host/devFake'
import { setHostTransport } from '@/host/host'
import { receivePlayState } from '@/host/playState'
import { track } from '@/host/timeline'
import type { PlayEvent } from '@/host/types'
import { ScreenTabs, TurnCard, ViewerControls, aidsSummary, overlayBase, screenTabsFit } from '@/molecules'
import { controlsPlacement } from '@/organisms/Viewer'
import { trackSize } from '@/organisms/TimelineStrip'

/**
 * beta.13 (P27.6): the Viewer's controls are icons with popovers, the
 * Timeline folds away and sizes its cards to the room it has, and the Screens
 * tab is one row of screens with the overlays as one picker at its end.
 */
let fake: FakeHost
beforeEach(() => {
  fake = createFakeHost()
  fake.seed(demoLibrary(), [demoRecipe()])
  setHostTransport(fake)
  useNavStore.setState({ route: HOME, back: [], forward: [], guard: null })
  useNoticeStore.setState({ notices: [] })
  useArmStore.setState({ armed: null })
  useControlLayoutStore.setState({ timelineHidden: {} })
  receivePlayState(null)
})
afterEach(() => {
  setHostTransport(null)
  receivePlayState(null)
  cleanup()
})

async function openControl(state: PlayStateForMain) {
  fake.playState = state
  render(<App />)
  await act(async () => {
    receivePlayState(state)
    await useNavStore.getState().go({ tab: 'control' })
  })
  await screen.findAllByText('On Stage')
}

const ev = (seq: number, type: string, fields: Record<string, unknown> = {}): PlayEvent => ({ seq, id: `p:${seq}`, at_ms: 1_000 * seq, kind: { type, ...fields } })
const turn = (seq: number, verdict: string) => [
  ev(seq, 'question_issued', { domain: 'd', question: `q${seq}`, team: 't', timer_duration_ms: null }),
  ev(seq + 1, 'turn_resolved', { verdict, points_awarded: verdict === 'correct' ? 100 : 0, bonus_awarded: null, token_ends: verdict !== 'correct' }),
]

describe('the Viewer toolbar', () => {
  it('leaves the frame nearly all of the tile: a thin band, a thin column, or a bar over the corner', () => {
    expect(controlsPlacement(480, 316)).toBe('below')
    expect(controlsPlacement(480, 300)).toBe('corner')
    expect(controlsPlacement(600, 300)).toBe('beside')
  })

  it('is one icon per control, named with its value, each opening a popover that says whose picture it changes', async () => {
    await openControl(demoPlay('question-outcome-correct'))
    const bar = document.querySelector<HTMLElement>('[data-viewer-controls]')!
    expect(bar.getAttribute('role')).toBe('toolbar')
    // App-wide role queries stop at the What's-new dialog, so by attribute.
    const tool = (id: string) => bar.querySelector<HTMLElement>(`[data-viewer-tool="${id}"]`)!
    expect(['quality', 'colours', 'brightness', 'motion'].map((id) => tool(id).getAttribute('aria-label'))).toEqual(['Preview quality: Native', 'Colours: Normal', 'Brightness: 100%', 'Reduce motion: Off'])
    fireEvent.click(tool('colours'))
    const pop = await waitFor(() => {
      const el = document.querySelector<HTMLElement>('[data-viewer-popover="colours"]')
      if (!el) throw new Error('no popover')
      return el
    })
    expect(within(pop).getByText('Live on Stage')).toBeTruthy()
    fireEvent.click(tool('quality'))
    const quality = await waitFor(() => {
      const el = document.querySelector<HTMLElement>('[data-viewer-popover="quality"]')
      if (!el) throw new Error('no popover')
      return el
    })
    expect(within(quality).getByText('This preview only')).toBeTruthy()
  })

  it('an aid that is on is tinted, dotted and spelled out, so a changed Stage is never a surprise', () => {
    render(<ViewerControls quality="native" onQuality={() => {}} view={{ filter: 'invert', brightness: 80, motion: 'reduced' }} onView={() => {}} scale={40} orientation="row" />)
    expect(screen.getByRole('button', { name: 'Colours: Invert' }).hasAttribute('data-changed')).toBe(true)
    expect(screen.getByRole('button', { name: 'Brightness: 80%' }).hasAttribute('data-changed')).toBe(true)
    expect(screen.getByRole('button', { name: 'Reduce motion: On' }).hasAttribute('data-changed')).toBe(true)
    expect(screen.getByRole('button', { name: 'Preview quality: Native' }).hasAttribute('data-changed')).toBe(false)
    expect(document.querySelector('[data-viewer-aids-summary]')?.textContent).toBe('Invert · 80% · Still')
    expect(aidsSummary(DEFAULT_STAGE_VIEW)).toBe('')
    cleanup()
    // Beside the frame or over its corner there is no room for the words; the tint stays.
    render(<ViewerControls quality="low" onQuality={() => {}} view={{ filter: 'invert', brightness: 80, motion: 'reduced' }} onView={() => {}} scale={40} orientation="column" />)
    expect(document.querySelector('[data-viewer-aids-summary]')).toBeNull()
    expect(screen.getByRole('toolbar').getAttribute('aria-orientation')).toBe('vertical')
    expect(screen.getByRole('button', { name: 'Preview quality: Low' }).hasAttribute('data-changed')).toBe(true)
  })
})

describe('the Timeline folds away', () => {
  it('hides from its own button, comes back from the status bar, and Undo follows it to the Action Panel', async () => {
    fake.events = [ev(1, 'play_loaded'), ev(2, 'play_started'), ...turn(3, 'correct')]
    await openControl(demoPlay('question-outcome-correct'))
    const panel = () => document.querySelector<HTMLElement>('[data-action-panel]')!
    expect(document.querySelector('[data-timeline-strip]')).not.toBeNull()
    expect(within(panel()).queryAllByLabelText('Undo turn')).toHaveLength(0)

    fireEvent.click(document.querySelector<HTMLElement>('[data-timeline-strip] button[aria-label="Hide the Timeline"]')!)
    await waitFor(() => expect(document.querySelector('[data-timeline-strip]')).toBeNull())
    const toggle = document.querySelector<HTMLElement>('[data-timeline-toggle]')!
    expect(toggle.getAttribute('data-timeline-toggle')).toBe('hidden')
    expect(toggle.getAttribute('aria-pressed')).toBe('false')
    expect(toggle.textContent).toMatch(/Timeline · \d+ events?/)
    expect(within(panel()).getAllByLabelText('Undo turn').length).toBeGreaterThan(0)
    // Per operator, remembered with the layout.
    expect(Object.values(useControlLayoutStore.getState().timelineHidden)).toContain(true)

    fireEvent.click(toggle)
    await waitFor(() => expect(document.querySelector('[data-timeline-strip]')).not.toBeNull())
    expect(within(panel()).queryAllByLabelText('Undo turn')).toHaveLength(0)
  })
})

describe('the Timeline sizes its items to the room it has', () => {
  const log = [ev(1, 'play_loaded'), ev(2, 'play_started'), ...turn(3, 'correct'), ev(5, 'token_given', { team: 't2' }), ...turn(6, 'incorrect'), ...turn(8, 'correct')]
  const items = track(log)

  it('picks the largest size at which the whole Play fits, and only then scrolls', () => {
    expect(trackSize(2000, items)).toBe('full')
    expect(trackSize(560, items)).toBe('compact')
    expect(trackSize(300, items)).toBe('mini')
    // Too long for even the dots: dots, scrolling.
    expect(trackSize(40, items)).toBe('mini')
  })

  it('a mini card keeps the outcome as a colour and the words on its name', () => {
    render(<TurnCard title="Q3 · History" number="Q3" team={null} steps={[]} verdict={{ label: 'Correct +250', short: '+250', meaning: 'easy', tone: 'success' }} detail="Q3 · History" size="mini" />)
    const card = document.querySelector<HTMLElement>('[data-track-turn="mini"]')!
    expect(card.getAttribute('aria-label')).toBe('Q3 · History · Correct +250')
    expect(card.textContent).toContain('Q3')
    expect(card.textContent).not.toContain('History')
  })

  it('a compact card prints the points and keeps the verdict for a screen reader', () => {
    render(<TurnCard title="Q3 · History" number="Q3" team={null} steps={[]} verdict={{ label: 'Incorrect +0', short: '+0', meaning: 'hard', tone: 'danger' }} detail="Q3" size="compact" />)
    const card = document.querySelector<HTMLElement>('[data-track-turn="compact"]')!
    expect(within(card).getByText('Q3')).toBeTruthy()
    expect(card.textContent).toContain('+0')
    expect(card.querySelector('.sr-only')?.textContent).toContain('Incorrect +0')
  })
})

describe('the Screens row', () => {
  const measure = (name: string) => name.length * 7

  it('prints every name, only the picked one, or glyphs alone — one row at every width', () => {
    expect(screenTabsFit(2000, 'idle', measure, 100)).toBe('labels')
    expect(screenTabsFit(700, 'idle', measure, 100)).toBe('picked')
    expect(screenTabsFit(380, 'idle', measure, 100)).toBe('icons')
    // A wider picker (an overlay on) or a count chip takes room from the names.
    const all = screenTabsFit(1000, 'idle', measure, 100)
    expect(all).toBe('labels')
    expect(screenTabsFit(1000, 'idle', measure, 400)).toBe('picked')
  })

  it('an overlay is a picker at the end, the tab lit is the screen drawn under it, and one press takes it off', async () => {
    const onChange = vi.fn()
    render(<ScreenTabs value="overlay:outcome" screen="idle" onChange={onChange} />)
    expect(overlayBase('outcome', 'idle')).toBe('question')
    expect(overlayBase('token-handoff', 'idle')).toBe('idle')
    expect(screen.getByRole('tab', { selected: true }).textContent).toContain('Question')
    expect(screen.queryAllByRole('tab', { name: 'Outcome' })).toHaveLength(0)
    fireEvent.click(screen.getByRole('button', { name: 'Back to the screen alone' }))
    expect(onChange).toHaveBeenCalledWith('idle')
    fireEvent.click(screen.getByRole('button', { name: /^Outcome/ }))
    expect(await screen.findByText('Over Idle')).toBeTruthy()
    expect(screen.getAllByText('Over Question').length).toBe(2)
    fireEvent.click(screen.getByRole('menuitemradio', { name: /^Round advance/ }))
    expect(onChange).toHaveBeenLastCalledWith('overlay:round-advance')
  })
})
