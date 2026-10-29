import { useEffect, useRef, useState } from 'react'
import {
  STAGE_FRAME,
  VIEWER_SOURCE,
  isViewerMessage,
  parseNodeId,
  textKeysForNode,
  type PlayStateForStage,
  type StageToViewer,
  type ViewerDecorBox,
  type ViewerNodeRect,
  type ViewerToStage,
} from '@questiongame/contract'
import { Text } from '@/atoms'
import { NodeHandle } from '@/molecules'
import { CONTROL, SCREENS_TAB, SHELL } from '@/copy'
import { nodeName } from '@/host/nodeName'

export interface ScreensCanvasProps {
  /** The preview Play to draw (never a `play-state`). */
  preview: PlayStateForStage
  selectedId: string | null
  overriddenIds: ReadonlySet<string>
  /** Elements hidden on Stage, marked on their handles. */
  hiddenIds?: ReadonlySet<string> | undefined
  /** False while an overlay stands over the screen: nothing under it is addressable. */
  handles?: boolean | undefined
  /** Draw the decor boundary and anchor over the picture (beta.13). */
  guide?: boolean | undefined
  onSelect: (id: string | null) => void
  onNudge: (id: string, dx: number, dy: number) => void
  /** The anchor dragged to a new place, as fractions of the boundary. */
  onAnchor?: ((anchor: { x: number; y: number }) => void) | undefined
  /** What Stage measured: each element's words and size, and the decor box. */
  onMeasured?: ((nodes: readonly ViewerNodeRect[], decor: ViewerDecorBox | null) => void) | undefined
}

/**
 * The Screens canvas: the same Stage iframe as Control's Viewer, fed the
 * preview over the Viewer protocol, with `NodeHandle`s over the node rects
 * Stage reports. Handles are Studio DOM and never enter the saved layout.
 *
 * beta.13: the canvas **simulates** — `?viewer&hold&simulate` runs the decor's
 * frame loop, so the dials show what they do (Control's Viewer still does
 * not) — and it can draw the decor's boundary and anchor, which nothing
 * showed before. A click on the picture itself deselects; so does Escape.
 */
export function ScreensCanvas({ preview, selectedId, overriddenIds, hiddenIds, handles: withHandles = true, guide, onSelect, onNudge, onAnchor, onMeasured }: ScreensCanvasProps) {
  const frame = useRef<HTMLIFrameElement | null>(null)
  const box = useRef<HTMLDivElement | null>(null)
  const latest = useRef(preview)
  latest.current = preview
  const measured = useRef(onMeasured)
  measured.current = onMeasured
  const [ready, setReady] = useState(false)
  const [nodes, setNodes] = useState<readonly ViewerNodeRect[]>([])
  const [decor, setDecor] = useState<ViewerDecorBox | null>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })
  const [dragAnchor, setDragAnchor] = useState<{ x: number; y: number } | null>(null)

  useEffect(() => {
    const el = box.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return
      const scale = Math.min(entry.contentRect.width / STAGE_FRAME.width, entry.contentRect.height / STAGE_FRAME.height)
      setSize({ width: Math.floor(STAGE_FRAME.width * scale), height: Math.floor(STAGE_FRAME.height * scale) })
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const onMessage = (event: MessageEvent<unknown>) => {
      if (event.source !== frame.current?.contentWindow || !isViewerMessage(event.data)) return
      const message = event.data as StageToViewer
      if (message.type === 'ready') {
        setReady(true)
        const reply: ViewerToStage = { source: VIEWER_SOURCE, type: 'play-state', state: latest.current }
        frame.current?.contentWindow?.postMessage(reply, '*')
      }
      if (message.type === 'nodes') {
        setNodes(message.nodes)
        setDecor(message.decor ?? null)
        measured.current?.(message.nodes, message.decor ?? null)
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [])

  useEffect(() => {
    const target = frame.current?.contentWindow
    if (!target || !ready) return
    const message: ViewerToStage = { source: VIEWER_SOURCE, type: 'play-state', state: preview }
    target.postMessage(message, '*')
  }, [preview, ready])

  useEffect(() => {
    const target = frame.current?.contentWindow
    if (!target || !ready) return
    target.postMessage({ source: VIEWER_SOURCE, type: 'measure' } satisfies ViewerToStage, '*')
  }, [size, ready])

  // Escape lets go of the selection, unless a field or a dialog has the key.
  useEffect(() => {
    if (selectedId === null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      const t = e.target
      if (t instanceof Element && t.closest('input, textarea, select, [role="dialog"], [role="alertdialog"], [role="listbox"]')) return
      onSelect(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectedId, onSelect])

  const scale = size.width / STAGE_FRAME.width
  // Decor bodies move and are tuned by the dials, not by node styles; they get no handle.
  const handles = withHandles
    ? nodes.filter((n) => {
        const parsed = parseNodeId(n.id)
        return parsed !== null && parsed.screen === preview.currentScreen && parsed.slot !== 'decor'
      })
    : []
  const anchor = dragAnchor ?? decor?.anchor ?? null
  const boundary = decor?.boundary ?? null
  const toCanvas = (fx: number, fy: number) =>
    boundary ? { left: (boundary.x + fx * boundary.width) * scale, top: (boundary.y + fy * boundary.height) * scale } : null
  const point = anchor ? toCanvas(anchor.x, anchor.y) : null

  return (
    <div
      ref={box}
      className="flex h-full w-full items-center justify-center rounded-[var(--radius)]"
      style={{ background: 'var(--surface-tertiary)' }}
      data-screens-canvas
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onSelect(null)
      }}
    >
      <div className="group/canvas relative overflow-hidden" style={{ width: size.width || undefined, height: size.height || undefined }}>
        {/* `hold`: an overlay on the canvas stands still instead of playing out (P11.16).
          * `simulate`: the decor moves, as on Stage (beta.13). */}
        <iframe ref={frame} title={SHELL.canvas} src="/stage/?viewer&hold&simulate" className="block border-0" style={{ width: size.width, height: size.height, background: 'white' }} tabIndex={-1} aria-hidden />
        {/* Over the picture and under the handles: a click on the picture
          * itself — not on an element — lets go of the selection (beta.13).
          * Before, only the grey margin did, and the iframe swallowed the rest. */}
        <div className="absolute inset-0" onPointerDown={() => onSelect(null)} data-canvas-catcher aria-hidden />
        {!ready ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <Text variant="studio-caption" tone="muted">
              {CONTROL.viewerLoading}
            </Text>
          </div>
        ) : null}
        {guide && boundary ? (
          <div
            className="pointer-events-none absolute border-2 border-dashed border-[var(--accent)]/70"
            style={{ left: boundary.x * scale, top: boundary.y * scale, width: boundary.width * scale, height: boundary.height * scale }}
            data-decor-guide="boundary"
            aria-hidden
          />
        ) : null}
        {handles.map((n) => (
          <NodeHandle
            key={n.id}
            id={n.id}
            label={nodeName(n.id, preview)}
            x={n.x * scale}
            y={n.y * scale}
            width={n.width * scale}
            height={n.height * scale}
            isSelected={selectedId === n.id}
            isOverridden={overriddenIds.has(n.id)}
            hasText={textKeysForNode(n.id).length > 0}
            isHidden={hiddenIds?.has(n.id)}
            scale={scale}
            onSelect={() => onSelect(n.id)}
            onNudge={(dx, dy) => onNudge(n.id, dx, dy)}
          />
        ))}
        {guide && point && boundary ? (
          // The anchor: a crosshair the operator can drag (beta.13). It writes
          // the screen's anchor point as fractions of the boundary, on release.
          <div
            role="slider"
            tabIndex={0}
            aria-label={SCREENS_TAB.dials.anchorPoint}
            aria-valuetext={`${Math.round((anchor?.x ?? 0) * 100)}%, ${Math.round((anchor?.y ?? 0) * 100)}%`}
            className="absolute z-10 -ml-4 -mt-4 flex size-8 cursor-grab items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
            style={{ left: point.left, top: point.top }}
            data-decor-guide="anchor"
            onPointerDown={(e) => {
              if (!onAnchor) return
              e.preventDefault()
              e.stopPropagation()
              try {
                e.currentTarget.setPointerCapture?.(e.pointerId)
              } catch {
                // not capturable: the drag still works over the guide
              }
              setDragAnchor(anchor)
            }}
            onPointerMove={(e) => {
              if (!dragAnchor || !boundary || scale <= 0) return
              const rect = e.currentTarget.parentElement!.getBoundingClientRect()
              const fx = ((e.clientX - rect.left) / scale - boundary.x) / boundary.width
              const fy = ((e.clientY - rect.top) / scale - boundary.y) / boundary.height
              setDragAnchor({ x: clamp01(fx), y: clamp01(fy) })
            }}
            onPointerUp={() => {
              if (dragAnchor) onAnchor?.({ x: round2(dragAnchor.x), y: round2(dragAnchor.y) })
              setDragAnchor(null)
            }}
          >
            <svg viewBox="0 0 32 32" className="size-8 text-[var(--accent)]" aria-hidden>
              <circle cx="16" cy="16" r="7" fill="none" stroke="currentColor" strokeWidth="2.5" />
              <path d="M16 1v9M16 22v9M1 16h9M22 16h9" stroke="currentColor" strokeWidth="2.5" />
            </svg>
          </div>
        ) : null}
      </div>
    </div>
  )
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n))
const round2 = (n: number) => Math.round(n * 100) / 100
