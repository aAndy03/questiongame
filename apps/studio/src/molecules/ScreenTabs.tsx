import { useEffect, useMemo, useRef, useState } from 'react'
import { Description, Dropdown, Header, Label, Tabs } from '@heroui/react'
import { OVERLAY_KINDS, STAGE_SCREENS, type OverlayKind, type StageScreen } from '@questiongame/contract'
import { Button, Icon, IconButton, MeaningChip, Tooltip } from '@/atoms'
import { OVERLAYS, SCREENS, SCREENS_TAB, SHELL } from '@/copy'
import { OVERLAY_ICON, SCREEN_ICON } from './glyphs'

/** What the Screens canvas can show: one of the seven screens, or one overlay standing over the last screen. */
export type CanvasView = StageScreen | `overlay:${OverlayKind}`

export function canvasScreen(view: CanvasView): StageScreen | null {
  return view.startsWith('overlay:') ? null : (view as StageScreen)
}

export function canvasOverlay(view: CanvasView): OverlayKind | null {
  return view.startsWith('overlay:') ? (view.slice('overlay:'.length) as OverlayKind) : null
}

const NO_OVERLAY = 'none'

/**
 * The screen an overlay is drawn over: the screen picked, except the two that
 * only mean anything over a question (`host/previewPlay.ts`, `previewOverlay`).
 */
export function overlayBase(kind: OverlayKind, screen: StageScreen): StageScreen {
  return kind === 'outcome' || kind === 'multiple-answers' ? 'question' : screen
}

/**
 * How much of each screen tab is printed, from the row's width (beta.13):
 * every name; only the picked screen's (the rest are their glyphs, the
 * glyphs Control's strips use); or glyphs alone. One row at every width —
 * never two rows of tabs, never a scroll arrow.
 */
export type ScreenTabsFit = 'labels' | 'picked' | 'icons'

/** A tab: 10 px padding a side, the 16 px glyph, and a count chip when it has one. */
const tabWidth = (text: number | null, count: number) => 20 + 16 + (text === null ? 0 : 6 + text) + (count ? 26 : 0)

/**
 * The fit, from the row's width, each name's width in px (measured with the
 * tab's own font, or estimated) and the overlay picker's width.
 */
export function screenTabsFit(width: number, screen: StageScreen, measure: (name: string) => number, picker: number, counts?: Partial<Record<StageScreen, number>>): ScreenTabsFit {
  // The list's padding, and the gap before the picker.
  const room = width - 8 - 12 - picker
  const need = (named: (s: StageScreen) => boolean) => STAGE_SCREENS.reduce((sum, s) => sum + tabWidth(named(s) ? measure(SCREENS[s]) : null, counts?.[s] ?? 0), 0)
  if (room >= need(() => true)) return 'labels'
  if (room >= need((s) => s === screen)) return 'picked'
  return 'icons'
}

let canvas: CanvasRenderingContext2D | null | undefined
/** A name's width in the tab's font; about 7.5 px a character where there is no canvas. */
function measurer(tab: Element | null | undefined): (name: string) => number {
  const style = tab ? getComputedStyle(tab) : null
  if (canvas === undefined) {
    try {
      canvas = document.createElement('canvas').getContext('2d')
    } catch {
      canvas = null
    }
  }
  const ctx = canvas
  if (!ctx || !style?.fontFamily) return (name) => name.length * 7.5
  ctx.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`
  return (name) => Math.ceil(ctx.measureText(name).width)
}

export interface ScreenTabsProps {
  value: CanvasView
  /** The screen the canvas draws — under an overlay, the last screen picked. */
  screen: StageScreen
  onChange: (view: CanvasView) => void
  /** How many changes each screen carries, shown after its name. */
  counts?: Partial<Record<StageScreen, number>> | undefined
}

/**
 * The seven screens as one row of tabs, and the overlays as **one picker at
 * its end** (beta.13): an overlay is not an eighth screen, it stands *over*
 * the screen picked, so it reads as "this screen, with that over it". Two
 * stacked tab rows wrapped differently at every width, and only one of them
 * grew a scroll arrow.
 */
export function ScreenTabs({ value, screen, onChange, counts }: ScreenTabsProps) {
  const overlay = canvasOverlay(value)
  // The tab lit is the screen the canvas draws, under any overlay.
  const drawn = overlay ? overlayBase(overlay, screen) : screen
  const box = useRef<HTMLDivElement | null>(null)
  const pickerBox = useRef<HTMLDivElement | null>(null)
  const [width, setWidth] = useState({ row: 0, picker: 0 })
  useEffect(() => {
    const row = box.current
    const picker = pickerBox.current
    if (!row || !picker || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(() => setWidth({ row: row.clientWidth, picker: picker.offsetWidth }))
    observer.observe(row)
    observer.observe(picker)
    return () => observer.disconnect()
  }, [])
  // A row the tests never measure prints every name.
  const fit = useMemo(
    () => (width.row > 0 ? screenTabsFit(width.row, drawn, measurer(box.current?.querySelector('[role="tab"]')), width.picker, counts) : 'labels'),
    [width, drawn, counts],
  )

  return (
    <div ref={box} className="flex min-w-0 max-w-full items-center gap-3" data-screen-tabs={fit}>
      <div className="min-w-0 flex-1">
        <Tabs
          variant="secondary"
          selectedKey={drawn}
          onSelectionChange={(key) => {
            if (typeof key === 'string' && (STAGE_SCREENS as readonly string[]).includes(key)) onChange(key as StageScreen)
          }}
        >
          <Tabs.ListContainer>
            <Tabs.List aria-label={SHELL.screens}>
              {STAGE_SCREENS.map((s) => {
                const named = fit === 'labels' || (fit === 'picked' && s === drawn)
                return (
                  // Each tab as wide as what it prints (HeroUI spreads them evenly).
                  <Tabs.Tab key={s} id={s} className="w-auto px-2.5" data-screen-tab={s}>
                    <Tooltip content={named ? null : SCREENS[s]}>
                      <span className="inline-flex items-center gap-1.5">
                        <Icon name={SCREEN_ICON[s]} size="sm" />
                        <span className={named ? 'whitespace-nowrap' : 'sr-only'}>{SCREENS[s]}</span>
                        {counts?.[s] ? (
                          <MeaningChip meaning="overridden" size="sm">
                            {counts[s]}
                          </MeaningChip>
                        ) : null}
                      </span>
                    </Tooltip>
                    <Tabs.Indicator />
                  </Tabs.Tab>
                )
              })}
            </Tabs.List>
          </Tabs.ListContainer>
        </Tabs>
      </div>
      <div ref={pickerBox} className="flex shrink-0 items-center gap-0.5" data-overlay-picker={overlay ?? NO_OVERLAY}>
        <Dropdown>
          <Button variant={overlay ? 'primary' : 'secondary'} size="sm" icon={overlay ? OVERLAY_ICON[overlay] : 'overlay'}>
            <span className="whitespace-nowrap">{overlay ? OVERLAYS[overlay] : SCREENS_TAB.overlayPrompt}</span>
            <Icon name="chevronDown" size="sm" />
          </Button>
          <Dropdown.Popover placement="bottom end">
            <Dropdown.Menu
              aria-label={SCREENS_TAB.overlaysGroup}
              selectionMode="single"
              selectedKeys={new Set([overlay ?? NO_OVERLAY])}
              onAction={(key) => {
                if (key === NO_OVERLAY) onChange(screen)
                else if (typeof key === 'string' && (OVERLAY_KINDS as readonly string[]).includes(key)) onChange(`overlay:${key as OverlayKind}`)
              }}
            >
              <Dropdown.Section>
                <Header>{SCREENS_TAB.overOn(SCREENS[screen])}</Header>
                <Dropdown.Item id={NO_OVERLAY} textValue={SCREENS_TAB.noOverlay}>
                  <Dropdown.ItemIndicator />
                  <Icon name="circleDashed" size="sm" />
                  <Label>{SCREENS_TAB.noOverlay}</Label>
                </Dropdown.Item>
                {OVERLAY_KINDS.map((k) => {
                  const base = overlayBase(k, screen)
                  return (
                    <Dropdown.Item key={k} id={k} textValue={OVERLAYS[k]}>
                      <Dropdown.ItemIndicator />
                      <Icon name={OVERLAY_ICON[k]} size="sm" />
                      <Label>{OVERLAYS[k]}</Label>
                      {/* The two that bring their own screen say so. */}
                      {base !== screen ? <Description>{SCREENS_TAB.overOn(SCREENS[base])}</Description> : null}
                    </Dropdown.Item>
                  )
                })}
              </Dropdown.Section>
            </Dropdown.Menu>
          </Dropdown.Popover>
        </Dropdown>
        {overlay ? <IconButton icon="close" label={SCREENS_TAB.overlayOff} size="sm" onPress={() => onChange(screen)} /> : null}
      </div>
    </div>
  )
}
