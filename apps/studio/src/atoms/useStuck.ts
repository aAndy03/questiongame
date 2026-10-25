import { useCallback, useEffect, useState } from 'react'

/** The nearest ancestor that scrolls vertically — what a sticky band sticks in. */
function scroller(el: Element): Element | null {
  for (let p = el.parentElement; p; p = p.parentElement) {
    const y = getComputedStyle(p).overflowY
    if (y === 'auto' || y === 'scroll') return p
  }
  return null
}

/**
 * Whether a sticky band is stuck (beta.9), so it can draw its compact variant.
 * Put the returned ref on a zero-height sentinel **just before** the band: once
 * the sentinel has scrolled past `top` (the band's sticky offset, in px) the
 * band is stuck. One `IntersectionObserver`, no scroll handler; without one
 * (jsdom) the band is never stuck.
 */
export function useStuck(top: number): readonly [(el: HTMLElement | null) => void, boolean] {
  const [sentinel, setSentinel] = useState<HTMLElement | null>(null)
  const [stuck, setStuck] = useState(false)
  const ref = useCallback((el: HTMLElement | null) => setSentinel(el), [])
  useEffect(() => {
    if (!sentinel || typeof IntersectionObserver === 'undefined') return
    const root = scroller(sentinel)
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e) return
        const edge = e.rootBounds?.top ?? 0
        setStuck(!e.isIntersecting && e.boundingClientRect.top < edge)
      },
      { root, rootMargin: `-${top + 1}px 0px 0px 0px`, threshold: 0 },
    )
    io.observe(sentinel)
    return () => io.disconnect()
  }, [sentinel, top])
  return [ref, stuck]
}
