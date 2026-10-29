import { useEffect, useRef } from 'react'
import { Tabs } from '@heroui/react'
import { OVERLAY_KINDS, STAGE_SCREENS, type OverlayKind, type StageScreen } from '@questiongame/contract'
import { MeaningChip, Text } from '@/atoms'
import { OVERLAYS, SCREENS, SCREENS_TAB, SHELL } from '@/copy'

/** What the Screens canvas can show: one of the seven screens, or one overlay standing over the last screen. */
export type CanvasView = StageScreen | `overlay:${OverlayKind}`

export function canvasScreen(view: CanvasView): StageScreen | null {
  return view.startsWith('overlay:') ? null : (view as StageScreen)
}

export function canvasOverlay(view: CanvasView): OverlayKind | null {
  return view.startsWith('overlay:') ? (view.slice('overlay:'.length) as OverlayKind) : null
}

const NO_OVERLAY = 'none'

export interface ScreenTabsProps {
  value: CanvasView
  /** The screen the canvas draws — under an overlay, the last screen picked. */
  screen: StageScreen
  onChange: (view: CanvasView) => void
  /** How many changes each screen carries, shown after its name. */
  counts?: Partial<Record<StageScreen, number>> | undefined
}

/**
 * The seven screens, then the five overlays as a group of their own (beta.13):
 * twelve tabs on one line overflowed, and "Current team" read twice. The
 * screen tabs always show the screen the canvas draws — an overlay stands over
 * it — and the overlay tabs say which overlay, or none.
 */
export function ScreenTabs({ value, screen, onChange, counts }: ScreenTabsProps) {
  const overlay = canvasOverlay(value)
  const box = useRef<HTMLDivElement | null>(null)
  // The tab picked stays in view when the row scrolls.
  useEffect(() => {
    for (const el of box.current?.querySelectorAll<HTMLElement>('[role="tab"][aria-selected="true"]') ?? []) el.scrollIntoView?.({ block: 'nearest', inline: 'nearest' })
  }, [value, screen])
  return (
    <div ref={box} className="flex min-w-0 max-w-full flex-wrap items-center gap-x-4 gap-y-1" data-screen-tabs>
      <div className="min-w-0 max-w-full overflow-x-auto">
        <Tabs
          variant="secondary"
          selectedKey={screen}
          onSelectionChange={(key) => {
            if (typeof key === 'string' && (STAGE_SCREENS as readonly string[]).includes(key)) onChange(key as StageScreen)
          }}
        >
          <Tabs.ListContainer>
            <Tabs.List aria-label={SHELL.screens}>
              {STAGE_SCREENS.map((s) => (
                <Tabs.Tab key={s} id={s}>
                  {SCREENS[s]}
                  {counts?.[s] ? (
                    <span className="ml-1.5">
                      <MeaningChip meaning="overridden" size="sm">
                        {counts[s]}
                      </MeaningChip>
                    </span>
                  ) : null}
                  <Tabs.Indicator />
                </Tabs.Tab>
              ))}
            </Tabs.List>
          </Tabs.ListContainer>
        </Tabs>
      </div>
      <div className="flex min-w-0 max-w-full items-center gap-2 overflow-x-auto">
        <Text variant="studio-caption" tone="muted" className="shrink-0">
          {SCREENS_TAB.overlaysGroup}
        </Text>
        <Tabs
          variant="secondary"
          selectedKey={overlay ?? NO_OVERLAY}
          onSelectionChange={(key) => {
            if (key === NO_OVERLAY) onChange(screen)
            else if (typeof key === 'string' && (OVERLAY_KINDS as readonly string[]).includes(key)) onChange(`overlay:${key as OverlayKind}`)
          }}
        >
          <Tabs.ListContainer>
            <Tabs.List aria-label={SCREENS_TAB.overlaysGroup}>
              <Tabs.Tab id={NO_OVERLAY}>
                {SCREENS_TAB.noOverlay}
                <Tabs.Indicator />
              </Tabs.Tab>
              {OVERLAY_KINDS.map((k) => (
                <Tabs.Tab key={k} id={k}>
                  {OVERLAYS[k]}
                  <Tabs.Indicator />
                </Tabs.Tab>
              ))}
            </Tabs.List>
          </Tabs.ListContainer>
        </Tabs>
      </div>
    </div>
  )
}
