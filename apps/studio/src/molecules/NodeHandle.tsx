import { useRef, useState } from 'react'
import { Text } from '@/atoms'
import { SCREENS_TAB } from '@/copy'
import { tipLearned } from '@/tips/signals'

export interface NodeHandleProps {
  id: string
  /** The element's name in the operator's words (`host/nodeName.ts`). */
  label: string
  /** Box in canvas pixels. */
  x: number
  y: number
  width: number
  height: number
  isSelected: boolean
  isOverridden: boolean
  /** It carries words the Text section edits (beta.13): an "Aa" corner. */
  hasText?: boolean | undefined
  /** Hidden on Stage: the handle stays, marked. */
  isHidden?: boolean | undefined
  /** Canvas px per frame px, to turn a drag into a frame offset. */
  scale: number
  onSelect: () => void
  /** Called on release with the drag in frame px. */
  onNudge: (dx: number, dy: number) => void
}

/**
 * An element on the Screens canvas: a faint outline whenever the canvas is
 * under the pointer (so it reads as something to click), the selected box
 * with its name, drag to nudge — the box follows the pointer while it moves.
 * Lives in Studio's DOM over the iframe and is never part of the saved
 * layout (spec §17).
 */
export function NodeHandle({ id, label, x, y, width, height, isSelected, isOverridden, hasText, isHidden, scale, onSelect, onNudge }: NodeHandleProps) {
  const drag = useRef<{ x: number; y: number; moved: boolean } | null>(null)
  // The drag so far, in canvas px: the box moves with the pointer (beta.13),
  // and the node itself moves once, on release, as one saved change.
  const [offset, setOffset] = useState<{ dx: number; dy: number } | null>(null)
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={label}
      aria-pressed={isSelected}
      data-node-handle={isSelected ? 'selected' : isOverridden ? 'overridden' : 'rest'}
      data-node-id={id}
      onPointerDown={(e) => {
        e.preventDefault()
        // Capture on the handle, not on whatever child was hit, and only where
        // the environment has the API — jsdom does not.
        // A pointer the browser no longer tracks throws; the drag works without capture.
        try {
          e.currentTarget.setPointerCapture?.(e.pointerId)
        } catch {
          // not capturable
        }
        drag.current = { x: e.clientX, y: e.clientY, moved: false }
        onSelect()
      }}
      onPointerMove={(e) => {
        const d = drag.current
        if (!d) return
        if (Math.abs(e.clientX - d.x) > 2 || Math.abs(e.clientY - d.y) > 2) d.moved = true
        if (d.moved) setOffset({ dx: e.clientX - d.x, dy: e.clientY - d.y })
      }}
      onPointerUp={(e) => {
        const d = drag.current
        drag.current = null
        setOffset(null)
        if (!d || !d.moved || scale <= 0) return
        onNudge(Math.round((e.clientX - d.x) / scale), Math.round((e.clientY - d.y) / scale))
      }}
      onPointerCancel={() => {
        drag.current = null
        setOffset(null)
      }}
      // Reaching a handle by Tab selects it (beta.13): the arrows then move
      // what the Inspector shows, never a handle it does not.
      onFocus={() => {
        if (!isSelected) onSelect()
      }}
      onKeyDown={(e) => {
        if (!isSelected) return
        // gesture: shift-arrow-nudge
        const step = e.shiftKey ? 10 : 1
        if (e.shiftKey && !e.repeat && e.key.startsWith('Arrow')) tipLearned('shift-arrow-nudge')
        if (e.key === 'ArrowLeft') onNudge(-step, 0)
        if (e.key === 'ArrowRight') onNudge(step, 0)
        if (e.key === 'ArrowUp') onNudge(0, -step)
        if (e.key === 'ArrowDown') onNudge(0, step)
        if (e.key.startsWith('Arrow') || e.key === ' ') e.preventDefault()
      }}
      className={[
        'absolute rounded-[2px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--focus)]',
        offset ? 'cursor-grabbing' : isSelected ? 'cursor-move' : 'cursor-pointer',
        isSelected
          ? 'border-2 border-[var(--accent)] bg-[var(--accent)]/10'
          : isOverridden
            ? 'border border-dashed border-[var(--accent)]/70 hover:bg-[var(--accent)]/10'
            : 'border border-transparent group-hover/canvas:border-[var(--accent)]/35 hover:bg-[var(--accent)]/8',
      ].join(' ')}
      style={{ left: x, top: y, width, height, ...(offset ? { transform: `translate(${offset.dx}px, ${offset.dy}px)` } : {}) }}
    >
      {isSelected ? (
        <span className={['absolute left-0 whitespace-nowrap rounded px-1', y < 20 ? 'top-full mt-0.5' : '-top-5'].join(' ')} style={{ background: 'var(--accent)', color: 'var(--accent-foreground)' }}>
          <Text variant="studio-caption" tone="inherit">
            {offset && scale > 0 ? `${label} · ${Math.round(offset.dx / scale)}, ${Math.round(offset.dy / scale)}` : label}
          </Text>
        </span>
      ) : null}
      {hasText || isHidden ? (
        <span className="pointer-events-none absolute right-0 top-0 flex gap-0.5 p-0.5">
          {isHidden ? (
            <span className="rounded bg-[var(--surface)] px-1 text-[10px] leading-4 text-[var(--muted)]">{SCREENS_TAB.hiddenTag}</span>
          ) : null}
          {hasText ? (
            <span className="rounded bg-[var(--accent)]/85 px-1 text-[10px] font-semibold leading-4 text-[var(--accent-foreground)]" title={SCREENS_TAB.editableWords} aria-hidden>
              Aa
            </span>
          ) : null}
        </span>
      ) : null}
    </div>
  )
}
