import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import { FIXTURES, stageViewFilter, type PlayStateForStage } from '@questiongame/contract'
import { StageRoot } from './index'
import { motionConfig, sequencer } from '@/presentation'

/**
 * beta.13: the display aids a teacher turns on are applied by Stage, from
 * `play-state.view` alone — to the canvas, not the window, so the letterbox
 * stays black under Invert — and Reduce motion holds every timeline at its
 * end for as long as it is on.
 */
describe('Stage display aids', () => {
  afterEach(() => {
    cleanup()
    motionConfig.immediate = false
    sequencer.reset()
  })

  const at = (view: PlayStateForStage['view']): PlayStateForStage => ({ ...FIXTURES['choose-domain'], view })
  const frame = (root: HTMLElement) => root.querySelector<HTMLElement>('[data-stage-frame]')!

  it('draws the canvas with the aid’s filter, and with none by default', () => {
    const plain = render(<StageRoot state={at({ filter: 'none', brightness: 100, motion: 'full' })} />)
    expect(frame(plain.container).style.filter).toBe('')
    plain.unmount()
    const view = { filter: 'greyscale-invert', brightness: 70, motion: 'full' } as const
    const aided = render(<StageRoot state={at(view)} />)
    expect(frame(aided.container).style.filter).toBe(stageViewFilter(view))
    expect(stageViewFilter(view)).toBe('grayscale(1) invert(1) brightness(0.7)')
  })

  it('invert keeps hues roughly: lightness flips, the hue turns back half a circle', () => {
    expect(stageViewFilter({ filter: 'invert', brightness: 100, motion: 'full' })).toBe('invert(1) hue-rotate(180deg)')
  })

  it('reduce motion holds timelines at their end while it is on, and lets go after', () => {
    motionConfig.immediate = false
    const r = render(<StageRoot state={at({ filter: 'none', brightness: 100, motion: 'reduced' })} />)
    expect(motionConfig.immediate).toBe(true)
    r.rerender(<StageRoot state={at({ filter: 'none', brightness: 100, motion: 'full' })} />)
    expect(motionConfig.immediate).toBe(false)
  })
})
