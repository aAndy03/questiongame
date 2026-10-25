import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { DragDropProvider, PointerSensor, useDraggable } from '@dnd-kit/react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Icon } from '@/atoms'
import { DRAG } from '@/copy'

/** Where the pointer is and what it is over, while questions are dragged. */
export interface QuestionDragState {
  readonly ids: readonly string[]
  readonly over: { readonly id: string; readonly name: string } | null
  /** Ctrl (⌘ on a Mac) held: the drop moves rather than adds. */
  readonly move: boolean
}

interface Context {
  readonly state: QuestionDragState | null
  /** The domain a drop just landed on, and a counter so the same one pulses again. */
  readonly pulse: { readonly id: string; readonly n: number } | null
}

const DragContext = createContext<Context>({ state: null, pulse: null })

/** What a row or a domain reads to draw its part of a drag (dimmed, lit, pulsing). */
export const useQuestionDrag = (): Context => useContext(DragContext)

/**
 * What a drop's toast says (beta.9): what landed, what was already there, what
 * archived questions were left out — and whether anything changed at all.
 */
export function dropSummary(
  report: { readonly changed: readonly string[]; readonly unchanged: readonly string[] },
  leftOut: number,
  move: boolean,
  domain: string,
): { readonly text: string; readonly changed: boolean } {
  const parts: string[] = []
  const n = report.changed.length
  if (n > 0) parts.push(move ? DRAG.moved(n, domain) : DRAG.added(n, domain))
  else parts.push(move ? DRAG.allOnlyThere(report.unchanged.length, domain) : DRAG.allThere(report.unchanged.length, domain))
  if (n > 0 && report.unchanged.length > 0) parts.push(DRAG.alreadyThere(report.unchanged.length))
  if (leftOut > 0) parts.push(DRAG.archivedLeft(leftOut))
  return { text: parts.join(' · '), changed: n > 0 }
}

/** What a grab carries: the selection when the grabbed row is in it, in view order; else that row alone. */
export function grabbed(id: string, selected: ReadonlySet<string>, order: (ids: readonly string[]) => readonly string[]): readonly string[] {
  return selected.has(id) ? order([...selected]) : [id]
}

/** Marks a domain row as a place questions can be dropped (beta.9). */
export const dropTarget = (id: string, name: string) => ({ 'data-domain-drop': id, 'data-domain-name': name })

export interface QuestionDragProviderProps {
  children: ReactNode
  /** The questions a grab carries: the selection when the grabbed row is in it, else that row. */
  idsFor(id: string): readonly string[]
  /** One write; `false` when the host refused (the notice says why). */
  onDrop(ids: readonly string[], domainId: string, domainName: string, move: boolean): Promise<boolean>
}

type Point = { readonly x: number; readonly y: number }
type Settle = { readonly kind: 'cancel' | 'drop'; readonly from: Point; readonly to: Point; readonly label: string; readonly key: number }

/** The domain row under a point, if any — the only drop the drag accepts. */
export function domainAt(p: { readonly x: number; readonly y: number }): { id: string; name: string } | null {
  const hit = document.elementFromPoint(p.x, p.y)?.closest<HTMLElement>('[data-domain-drop]')
  return hit ? { id: hit.dataset['domainDrop'] ?? '', name: hit.dataset['domainName'] ?? '' } : null
}

/**
 * Drag questions onto a domain (beta.9, Domains & Questions). Rows are grabbed
 * anywhere — no handle, no sign — and the drag starts after a few pixels, so a
 * click still opens and Shift/Ctrl+click still select. A chip follows the
 * pointer; **only a release exactly over a domain row counts** (hit-tested at
 * the pointer, not by overlap), and Escape or a release anywhere else cancels:
 * the chip slides back where it came from and nothing is written. Ctrl (⌘)
 * held at the release moves instead of adding; the chip says which as the key
 * goes down and up.
 */
export function QuestionDragProvider({ children, idsFor, onDrop }: QuestionDragProviderProps) {
  const [state, setState] = useState<QuestionDragState | null>(null)
  // The handlers below are the provider's, bound once: they read the drag through this.
  const live = useRef<QuestionDragState | null>(null)
  live.current = state
  const [pointer, setPointer] = useState<Point | null>(null)
  const [settle, setSettle] = useState<Settle | null>(null)
  const [pulse, setPulse] = useState<Context['pulse']>(null)
  const start = useRef<Point>({ x: 0, y: 0 })
  const last = useRef<Point>({ x: 0, y: 0 })
  const moveKey = useRef(false)
  const cancelled = useRef(false)
  const still = useReducedMotion()

  const dragging = state !== null
  useEffect(() => {
    if (!dragging) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cancelled.current = true
      moveKey.current = e.ctrlKey || e.metaKey
      setState((s) => (s && s.move !== moveKey.current ? { ...s, move: moveKey.current } : s))
    }
    // No text selection across the rows while dragging.
    document.body.style.userSelect = 'none'
    window.addEventListener('keydown', onKey)
    window.addEventListener('keyup', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('keyup', onKey)
      document.body.style.userSelect = ''
    }
  }, [dragging])

  // Where the pointer is now and what it is over — from the drag's own moves
  // (the sensor holds the pointer, so a window listener would not hear them).
  const track = (at: Point, ctrl: boolean | null) => {
    last.current = at
    if (ctrl !== null) moveKey.current = ctrl
    setPointer(at)
    const over = domainAt(at)
    setState((s) => (s && (s.over?.id !== over?.id || s.move !== moveKey.current) ? { ...s, over, move: moveKey.current } : s))
  }

  const label = (s: QuestionDragState) =>
    s.over ? (s.move ? DRAG.moveTo(s.ids.length, s.over.name) : DRAG.addTo(s.ids.length, s.over.name)) : DRAG.carrying(s.ids.length)

  return (
    <DragContext.Provider value={{ state, pulse }}>
      <DragDropProvider
        // The pointer only: the keyboard sensor would take Space and Enter,
        // which open a row. The keyboard way is the row menu's *Move to domain…*.
        sensors={[PointerSensor]}
        // No plugins: the row stays where it is (the chip is the feedback, drawn
        // here), and nothing scrolls or restyles the page under the operator.
        plugins={[]}
        onDragStart={(event) => {
          const id = String(event.operation.source?.id ?? '')
          const native = event.nativeEvent as PointerEvent | undefined
          const at = native && 'clientX' in native ? { x: native.clientX, y: native.clientY } : last.current
          start.current = at
          last.current = at
          cancelled.current = false
          moveKey.current = Boolean(native?.ctrlKey || native?.metaKey)
          setSettle(null)
          setPointer(at)
          setState({ ids: idsFor(id), over: null, move: moveKey.current })
        }}
        onDragMove={(event) => {
          const native = event.nativeEvent as PointerEvent | undefined
          if (native && 'clientX' in native) track({ x: native.clientX, y: native.clientY }, native.ctrlKey || native.metaKey)
          else if (event.to) track({ x: event.to.x, y: event.to.y }, null)
        }}
        onDragEnd={(event) => {
          const s = live.current
          setState(null)
          if (!s) return
          const over = event.canceled || cancelled.current ? null : domainAt(last.current)
          const from = last.current
          if (!over) {
            setSettle({ kind: 'cancel', from, to: start.current, label: label({ ...s, over: null }), key: Date.now() })
            return
          }
          const move = moveKey.current
          setSettle({ kind: 'drop', from, to: from, label: label({ ...s, over, move }), key: Date.now() })
          void onDrop(s.ids, over.id, over.name, move).then((ok) => {
            if (ok) setPulse((p) => ({ id: over.id, n: (p?.n ?? 0) + 1 }))
          })
        }}
      >
        {children}
      </DragDropProvider>
      {typeof document === 'undefined'
        ? null
        : createPortal(
            <AnimatePresence>
              {state && pointer ? (
                <Chip key="live" at={pointer} label={label(state)} move={state.move} over={state.over !== null} />
              ) : settle ? (
                <motion.div
                  key={`settle-${settle.key}`}
                  className="pointer-events-none fixed left-0 top-0 z-[100]"
                  initial={{ x: settle.from.x + 14, y: settle.from.y + 14, opacity: 1, scale: 1 }}
                  animate={
                    settle.kind === 'cancel'
                      ? { x: settle.to.x + 14, y: settle.to.y + 14, opacity: 0, scale: 0.9 }
                      : { opacity: 0, scale: 0.6 }
                  }
                  transition={{ duration: still ? 0 : settle.kind === 'cancel' ? 0.25 : 0.18, ease: 'easeOut' }}
                  onAnimationComplete={() => setSettle(null)}
                  data-drag-settle={settle.kind}
                >
                  <ChipBody label={settle.label} move={false} over={settle.kind === 'drop'} />
                </motion.div>
              ) : null}
            </AnimatePresence>,
            document.body,
          )}
    </DragContext.Provider>
  )
}

function Chip({ at, label, move, over }: { at: Point; label: string; move: boolean; over: boolean }) {
  return (
    <div className="pointer-events-none fixed left-0 top-0 z-[100]" style={{ transform: `translate(${at.x + 14}px, ${at.y + 14}px)` }} data-drag-chip>
      <ChipBody label={label} move={move} over={over} />
    </div>
  )
}

function ChipBody({ label, move, over }: { label: string; move: boolean; over: boolean }) {
  return (
    <div
      className={[
        'flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-xs shadow-lg transition-colors',
        over ? 'border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-foreground)]' : 'border-[var(--border)] bg-[var(--overlay)] text-[var(--foreground)]',
      ].join(' ')}
    >
      <Icon name={move ? 'transfer' : over ? 'add' : 'question'} size="sm" style={{ width: 14, height: 14 }} />
      <span className="whitespace-nowrap">{label}</span>
    </div>
  )
}

/**
 * One draggable question row: the row element is the draggable — no handle —
 * and draws nothing for it; the row dims while it is carried.
 */
export function DraggableQuestion({ id, children }: { id: string; children: (ref: (el: Element | null) => void, carried: boolean) => ReactNode }) {
  const { ref } = useDraggable({ id })
  const { state } = useQuestionDrag()
  return <>{children(ref, state?.ids.includes(id) ?? false)}</>
}
