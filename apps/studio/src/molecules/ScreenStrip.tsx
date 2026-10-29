import { ToggleButton, ToggleButtonGroup } from '@heroui/react'
import { STAGE_SCREENS, type StageScreen } from '@questiongame/contract'
import { Icon, Kbd, Text, Tooltip } from '@/atoms'
import { SCREENS, STRIPS } from '@/copy'
import { SCREEN_ICON } from './glyphs'

export interface ScreenStripProps {
  current: StageScreen
  /** A base transition may not start under a running overlay (spec §2.6). */
  overlayBusy: boolean
  density?: 'comfortable' | 'compact' | 'dense'
  /** The operator's chords for the previous and next screen (beta.13). */
  keys?: { prev: string; next: string } | undefined
  onShow: (screen: StageScreen) => void
}

const ICON = SCREEN_ICON

/**
 * Every Screen, in show order; the operator may jump anywhere (spec §5.5).
 *
 * The group is **detached and wrapping**, never `fullWidth`: seven labelled
 * pills do not fit one row at any panel width the mosaic offers, and an
 * attached full-width group answers that by clipping — the operator was left
 * with half a word and no target. Wrapping is the only layout that is right at
 * every width, so the density decides one thing only: whether the label is
 * printed beside the icon or hung on a tooltip.
 */
export function ScreenStrip({ current, overlayBusy, density = 'comfortable', keys, onShow }: ScreenStripProps) {
  const labelled = density === 'comfortable'
  const at = STAGE_SCREENS.indexOf(current) + 1
  return (
    <div className="flex flex-col gap-2" data-screen-strip>
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <Text variant="studio-caption" tone="muted">
            {STRIPS.screens}
          </Text>
          <span data-screen-index>
            <Text variant="studio-mono" tone="muted" tabular>
              {STRIPS.screenIndex(at, STAGE_SCREENS.length)}
            </Text>
          </span>
        </div>
        {overlayBusy ? (
          <Text variant="studio-caption" tone="warning">
            {STRIPS.overlayBusy}
          </Text>
        ) : keys && (keys.prev || keys.next) ? (
          <Tooltip content={STRIPS.stepKeys}>
            <span className="inline-flex items-center gap-0.5" aria-label={STRIPS.stepKeys}>
              {keys.prev ? <Kbd chord={keys.prev} /> : null}
              {keys.next ? <Kbd chord={keys.next} /> : null}
            </span>
          </Tooltip>
        ) : null}
      </div>
      <ToggleButtonGroup
        isDetached
        selectionMode="single"
        selectedKeys={[current]}
        disallowEmptySelection
        size="sm"
        aria-label={STRIPS.screens}
        className="flex w-full flex-wrap justify-start gap-1.5"
        onSelectionChange={(keys) => {
          const next = [...keys][0]
          if (typeof next === 'string' && (STAGE_SCREENS as readonly string[]).includes(next)) onShow(next as StageScreen)
        }}
      >
        {STAGE_SCREENS.map((screen) => (
          <Tooltip key={screen} content={SCREENS[screen]} isDisabled={labelled}>
            <ToggleButton id={screen} aria-label={SCREENS[screen]} isIconOnly={!labelled}>
              <Icon name={ICON[screen]} size="sm" />
              {labelled ? <span className="truncate">{SCREENS[screen]}</span> : null}
            </ToggleButton>
          </Tooltip>
        ))}
      </ToggleButtonGroup>
    </div>
  )
}
