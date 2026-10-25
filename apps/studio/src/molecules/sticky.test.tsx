import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, render, screen } from '@testing-library/react'
import { GroupHeader, StickyBand } from './ListControls'

/**
 * beta.9: what tells you where you are sticks, at its smallest. The sentinel's
 * observer is mocked — jsdom has none and no layout — so each test says when
 * the sentinel has scrolled past.
 */
type Callback = (entries: Partial<IntersectionObserverEntry>[]) => void
let observers: { cb: Callback; options: IntersectionObserverInit | undefined }[] = []

beforeEach(() => {
  observers = []
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(cb: Callback, options?: IntersectionObserverInit) {
        observers.push({ cb, options })
      }
      observe() {}
      disconnect() {}
    },
  )
})
afterEach(() => {
  vi.unstubAllGlobals()
  cleanup()
})

/** The sentinel scrolled past the band's offset (`true`) or back into view. */
const scrollPast = (past: boolean) =>
  act(() => {
    for (const o of observers) o.cb([{ isIntersecting: !past, boundingClientRect: { top: past ? -10 : 50 } as DOMRect, rootBounds: { top: 0 } as DOMRect }])
  })

const header = (stuck: boolean) => <GroupHeader label="History" count={4} continued={false} collapsed={false} onToggle={() => {}} compact={stuck} />

describe('a sticky band (beta.9)', () => {
  it('sticks at its offset, opaque, and watches a sentinel past that offset', () => {
    render(<StickyBand top={36} background="var(--surface)">{header}</StickyBand>)
    const band = document.querySelector<HTMLElement>('[data-sticky-band]')!
    expect(band.className).toContain('sticky')
    expect(band.style.top).toBe('36px')
    expect(band.style.background).toBe('var(--surface)')
    expect(band.previousElementSibling?.hasAttribute('data-sticky-sentinel')).toBe(true)
    expect(observers[0]?.options?.rootMargin).toBe('-37px 0px 0px 0px')
  })

  it('draws the compact header only while stuck, and gives the height back as margin', () => {
    render(<StickyBand top={0} background="var(--background)">{header}</StickyBand>)
    const heading = () => screen.getByRole('heading', { name: /History/ })
    expect(heading().hasAttribute('data-compact')).toBe(false)
    expect(heading().className).toContain('h-10')
    scrollPast(true)
    expect(heading().hasAttribute('data-compact')).toBe(true)
    expect(heading().className).toContain('h-7')
    const band = document.querySelector<HTMLElement>('[data-sticky-band]')!
    expect(band.hasAttribute('data-stuck')).toBe(true)
    scrollPast(false)
    expect(heading().hasAttribute('data-compact')).toBe(false)
    expect(band.style.marginBottom).toBe('')
  })

  it('gives back, as margin, exactly the height it lost by sticking, so the rows under it do not jump', () => {
    // jsdom has no layout: the band is 40px tall unstuck and 28px stuck (a wrapped Board row: 64 and 56).
    const tall = vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockImplementation(function (this: HTMLElement) {
      if (!this.hasAttribute('data-sticky-band')) return 0
      const wrapped = this.textContent?.includes('Wrapped')
      return this.hasAttribute('data-stuck') ? (wrapped ? 56 : 28) : wrapped ? 64 : 40
    })
    render(<StickyBand top={0} background="var(--background)">{header}</StickyBand>)
    const band = document.querySelector<HTMLElement>('[data-sticky-band]')!
    scrollPast(true)
    expect(band.style.marginBottom).toBe('12px')
    scrollPast(false)
    expect(band.style.marginBottom).toBe('')
    cleanup()
    render(<StickyBand top={0} background="var(--surface)">{() => <span>Wrapped</span>}</StickyBand>)
    scrollPast(true)
    expect(document.querySelector<HTMLElement>('[data-sticky-band]')!.style.marginBottom).toBe('8px')
    tall.mockRestore()
  })

  it('off: the same tree, not sticky and never stuck (a closed Board domain)', () => {
    render(<StickyBand top={0} background="var(--surface)" off>{header}</StickyBand>)
    scrollPast(true)
    const band = document.querySelector<HTMLElement>('[data-sticky-band]')!
    expect(band.className).not.toContain('sticky')
    expect(band.hasAttribute('data-stuck')).toBe(false)
  })

  it('in a list it is an li, and so is its sentinel', () => {
    render(
      <ul>
        <StickyBand as="li" top={0} background="var(--overlay)">
          {header}
        </StickyBand>
      </ul>,
    )
    const band = document.querySelector('[data-sticky-band]')!
    expect(band.tagName).toBe('LI')
    expect(band.previousElementSibling?.tagName).toBe('LI')
  })
})
