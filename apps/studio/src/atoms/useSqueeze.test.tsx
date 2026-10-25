import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import { useRef } from 'react'
import { useSqueeze } from './useSqueeze'

/**
 * beta.9: once squeezed, the search keeps the width it had at full size —
 * measured with last time's cap taken off, or the cap would decide the next
 * squeeze. jsdom has no layout, so the sizes are stubbed.
 */
afterEach(() => {
  vi.restoreAllMocks()
  cleanup()
})

function Row({ n }: { n: number }) {
  const ref = useRef<HTMLDivElement | null>(null)
  useSqueeze(ref)
  return (
    <div ref={ref} data-squeeze data-n={n}>
      <div className="search-field" />
      <button className="button">Sort</button>
    </div>
  )
}

describe('the search through a squeeze (beta.9)', () => {
  it('is capped at its full-size width while squeezed, measured uncapped, and freed when not', () => {
    let overflow = true
    vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockImplementation(function (this: HTMLElement) {
      return this.hasAttribute('data-squeeze') && overflow ? 500 : 0
    })
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(() => 400)
    // Capped, it would measure 100; uncapped, 150.
    vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockImplementation(function (this: HTMLElement) {
      return this.classList.contains('search-field') ? (this.style.maxWidth ? 100 : 150) : 0
    })
    const { container, rerender } = render(<Row n={1} />)
    const search = container.querySelector<HTMLElement>('.search-field')!
    expect(container.firstElementChild!.hasAttribute('data-squeezed')).toBe(true)
    expect(search.style.maxWidth).toBe('150px')
    // Another pass while squeezed: still the uncapped width, not the capped one.
    rerender(<Row n={2} />)
    expect(search.style.maxWidth).toBe('150px')
    overflow = false
    rerender(<Row n={3} />)
    expect(container.firstElementChild!.hasAttribute('data-squeezed')).toBe(false)
    expect(search.style.maxWidth).toBe('')
  })
})
