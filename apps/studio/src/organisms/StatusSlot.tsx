import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface Slot {
  readonly el: HTMLElement | null
  set(el: HTMLElement | null): void
}

const SlotContext = createContext<Slot | null>(null)

/**
 * A place in the status bar the open page fills (beta.9): its list's
 * pagination. The status bar owns the element; a page portals into it. A
 * React portal, not a store — nothing about a page lands in a store — so it is
 * the open page's alone and leaves with it.
 */
export function StatusSlotProvider({ children }: { children: ReactNode }) {
  const [el, setEl] = useState<HTMLElement | null>(null)
  const value = useMemo(() => ({ el, set: setEl }), [el])
  return <SlotContext.Provider value={value}>{children}</SlotContext.Provider>
}

/** The slot itself, in the status bar. */
export function StatusSlot() {
  const slot = useContext(SlotContext)
  return <span ref={slot?.set} className="flex min-w-0 items-center" data-status-slot />
}

/**
 * Draws `children` in the status bar, or `inline` where there is no status
 * bar (a list rendered on its own, in a test).
 */
export function InStatusBar({ children, inline }: { children: ReactNode; inline: ReactNode }) {
  const slot = useContext(SlotContext)
  if (!slot) return <>{inline}</>
  return slot.el ? createPortal(children, slot.el) : null
}
