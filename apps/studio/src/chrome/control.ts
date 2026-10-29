/**
 * The Control mosaic's layout — chrome, persisted per operator (spec §8:
 * "Mosaic layout persisted per operator"). The host's per-operator
 * `control_layout.json` (§5.10) is P10's paths work; until then this lives
 * in `localStorage` next to the other chrome preferences.
 *
 * The tree is `react-mosaic`'s own node shape so the library can be handed
 * it back unchanged. Nothing in here is a Play field.
 */

import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { MosaicNode } from 'react-mosaic-component'

/**
 * The mosaic's tiles. The Timeline is not one since beta.13: it is a fixed
 * strip under the mosaic (`organisms/TimelineStrip.tsx`), never resized.
 */
export type PanelId = 'viewer' | 'game' | 'action' | 'strips'

/**
 * The spec's default arrangement (§11.H), re-weighted in beta.13: the Action
 * column is the one the operator presses, so it is wide enough not to drop to
 * `compact` at 1100 px, and the Game column — mostly read — gives way.
 */
export const DEFAULT_LAYOUT: MosaicNode<PanelId> = {
  type: 'split',
  direction: 'row',
  splitPercentages: [18, 50, 32],
  children: [
    'game',
    'viewer',
    { type: 'split', direction: 'column', splitPercentages: [62, 38], children: ['action', 'strips'] },
  ],
}

export const PANEL_IDS: readonly PanelId[] = ['viewer', 'game', 'action', 'strips']

/**
 * A saved layout without the Timeline tile (beta.13), or null when what is
 * left is not a whole Control — then the default stands. A split that loses
 * a child gives its share to the one that stays.
 */
export function withoutTimeline(node: unknown): MosaicNode<PanelId> | null {
  const prune = (n: unknown): unknown => {
    if (typeof n === 'string') return n === 'timeline' ? null : n
    if (!n || typeof n !== 'object') return null
    const o = n as { type?: string; children?: unknown[]; splitPercentages?: number[]; tabs?: unknown[]; activeTabIndex?: number }
    if (o.type === 'tabs' && Array.isArray(o.tabs)) {
      const tabs = o.tabs.filter((t) => t !== 'timeline')
      if (tabs.length === 0) return null
      return tabs.length === 1 ? tabs[0] : { ...o, tabs, activeTabIndex: Math.min(o.activeTabIndex ?? 0, tabs.length - 1) }
    }
    if (!Array.isArray(o.children)) return null
    const kept = o.children.map((c, i) => ({ c: prune(c), share: o.splitPercentages?.[i] ?? 100 / o.children!.length })).filter((k) => k.c !== null)
    if (kept.length === 0) return null
    if (kept.length === 1) return kept[0]!.c
    const total = kept.reduce((sum, k) => sum + k.share, 0)
    return { ...o, children: kept.map((k) => k.c), splitPercentages: kept.map((k) => (k.share / total) * 100) }
  }
  const pruned = prune(node)
  const ids = new Set<string>()
  const collect = (n: unknown) => {
    if (typeof n === 'string') ids.add(n)
    else if (n && typeof n === 'object') {
      const o = n as { children?: unknown[]; tabs?: unknown[] }
      for (const c of o.children ?? o.tabs ?? []) collect(c)
    }
  }
  collect(pruned)
  return PANEL_IDS.every((id) => ids.has(id)) ? (pruned as MosaicNode<PanelId>) : null
}

/**
 * How finely the Viewer draws its preview (beta.13), as a share of the pixels
 * it is shown at. Lower spares the computer; Stage itself is never touched.
 */
export type ViewerQuality = 'native' | 'high' | 'medium' | 'low'
export const VIEWER_QUALITIES: readonly ViewerQuality[] = ['native', 'high', 'medium', 'low']
export const VIEWER_QUALITY: Readonly<Record<ViewerQuality, { readonly pixels: number; readonly tickMs: number }>> = {
  native: { pixels: 1, tickMs: 0 },
  high: { pixels: 0.75, tickMs: 0 },
  medium: { pixels: 0.5, tickMs: 200 },
  low: { pixels: 0.33, tickMs: 500 },
}

interface ControlLayoutState {
  readonly operatorId: string
  readonly layouts: Readonly<Record<string, MosaicNode<PanelId>>>
  readonly viewerQuality: Readonly<Record<string, ViewerQuality>>
  /** The Timeline strip folded away, per operator (beta.13): shown unless hidden. */
  readonly timelineHidden: Readonly<Record<string, boolean>>
  setOperator(id: string | null): void
  setViewerQuality(quality: ViewerQuality): void
  setTimelineHidden(hidden: boolean): void
  setLayout(node: MosaicNode<PanelId> | null): void
  resetLayout(): void
}

export const useControlLayoutStore = create<ControlLayoutState>()(
  persist(
    (set) => ({
      operatorId: '',
      layouts: {},
      viewerQuality: {},
      timelineHidden: {},
      setTimelineHidden(hidden) {
        set((s) => ({ timelineHidden: { ...s.timelineHidden, [s.operatorId]: hidden } }))
      },
      setViewerQuality(quality) {
        set((s) => ({ viewerQuality: { ...s.viewerQuality, [s.operatorId]: quality } }))
      },
      setOperator(id) {
        set({ operatorId: id ?? '' })
      },
      setLayout(node) {
        set((s) => ({ layouts: { ...s.layouts, [s.operatorId]: node ?? DEFAULT_LAYOUT } }))
      },
      resetLayout() {
        set((s) => ({ layouts: { ...s.layouts, [s.operatorId]: DEFAULT_LAYOUT } }))
      },
    }),
    {
      name: 'questiongame.studio.control',
      storage: createJSONStorage(() => safeStorage()),
      partialize: (s) => ({ layouts: s.layouts, viewerQuality: s.viewerQuality, timelineHidden: s.timelineHidden }),
      // v1 (beta.13): the Timeline left the mosaic. Saved layouts lose its
      // tile; one that no longer holds every panel goes back to the default.
      version: 1,
      migrate: (persisted, version) => {
        const state = (persisted ?? {}) as { layouts?: Record<string, unknown> }
        if (version >= 1) return state as { layouts: Record<string, MosaicNode<PanelId>>; viewerQuality: Record<string, ViewerQuality>; timelineHidden: Record<string, boolean> }
        const layouts: Record<string, MosaicNode<PanelId>> = {}
        for (const [operator, node] of Object.entries(state.layouts ?? {})) {
          const kept = withoutTimeline(node)
          if (kept) layouts[operator] = kept
        }
        return { layouts, viewerQuality: {}, timelineHidden: {} }
      },
    },
  ),
)

export function useViewerQuality(): ViewerQuality {
  return useControlLayoutStore((s) => s.viewerQuality[s.operatorId] ?? 'native')
}

export function useTimelineHidden(): boolean {
  return useControlLayoutStore((s) => s.timelineHidden[s.operatorId] ?? false)
}

export function useControlLayout(): MosaicNode<PanelId> {
  return useControlLayoutStore((s) => s.layouts[s.operatorId] ?? DEFAULT_LAYOUT)
}

function safeStorage(): Storage {
  try {
    if (typeof localStorage !== 'undefined' && typeof localStorage.setItem === 'function') {
      localStorage.setItem('questiongame.studio.probe', '1')
      localStorage.removeItem('questiongame.studio.probe')
      return localStorage
    }
  } catch {
    // fall through
  }
  const memory = new Map<string, string>()
  return {
    getItem: (k) => memory.get(k) ?? null,
    setItem: (k, v) => void memory.set(k, v),
    removeItem: (k) => void memory.delete(k),
    clear: () => memory.clear(),
    key: (i) => [...memory.keys()][i] ?? null,
    get length() {
      return memory.size
    },
  }
}
