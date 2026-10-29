import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Button as HeroButton, Popover } from '@heroui/react'
import { DEFAULT_STAGE_VIEW, STAGE_FILTERS, type StageFilter, type StageView } from '@questiongame/contract'
import { Icon, MeaningChip, SegmentedField, SliderField, SwitchField, Text, type IconName } from '@/atoms'
import { VIEWER } from '@/copy'

export type ViewerQualityKey = 'native' | 'high' | 'medium' | 'low'

export interface ViewerControlsProps {
  quality: ViewerQualityKey
  onQuality: (quality: ViewerQualityKey) => void
  /** Stage's display aids, as the host has them. */
  view: StageView
  onView: (view: StageView) => void
  /** The preview's size against the 1920×1080 frame, in percent. */
  scale: number
  /**
   * A row in the band under the frame, a column beside it, or a small bar
   * laid over the frame's corner when the tile leaves neither.
   */
  orientation: 'row' | 'column' | 'over'
}

const QUALITIES: readonly ViewerQualityKey[] = ['native', 'high', 'medium', 'low']

/**
 * The Viewer's toolbar (beta.13): one icon per control, each opening a
 * popover that says what it changes. Two groups, told apart at a glance —
 * **this preview** (how finely it is drawn) and **on Stage** (the display
 * aids, live, for the people watching). An icon that is not at its default
 * is tinted and dotted, so a dimmed or inverted Stage is never a surprise.
 * The aids are the operating systems' set and nothing invented.
 */
export function ViewerControls({ quality, onQuality, view, onView, scale, orientation }: ViewerControlsProps) {
  // The slider moves locally and writes once, on release: a write per pixel
  // of drag would be a settings save and a Stage emission per pixel.
  const [brightness, setBrightness] = useState(view.brightness)
  useEffect(() => setBrightness(view.brightness), [view.brightness])
  // Two quick changes build on each other (review): each write starts from the
  // last one sent until the host's play-state has caught up with it.
  const sent = useRef<StageView | null>(null)
  useEffect(() => {
    if (sent.current && JSON.stringify(sent.current) === JSON.stringify(view)) sent.current = null
  }, [view])
  const write = (patch: Partial<StageView>) => {
    const next = { ...(sent.current ?? view), ...patch }
    sent.current = next
    onView(next)
  }

  const column = orientation === 'column'
  const placement = orientation === 'row' ? 'top' : orientation === 'column' ? 'left' : 'bottom end'
  const summary = aidsSummary(view)
  const divider = <span className={column ? 'my-0.5 h-px w-6 bg-[var(--separator)]' : 'mx-0.5 h-5 w-px bg-[var(--separator)]'} aria-hidden />

  return (
    <div
      className={[
        'flex items-center',
        column ? 'flex-col gap-1' : 'gap-1',
        orientation === 'over' ? 'rounded-[calc(var(--radius)/2)] bg-[var(--surface)]/90 p-0.5 shadow-sm' : '',
      ].join(' ')}
      role="toolbar"
      aria-label={VIEWER.options}
      aria-orientation={column ? 'vertical' : 'horizontal'}
      data-viewer-controls={orientation}
    >
      <Tool id="quality" icon="quality" label={VIEWER.quality} value={VIEWER.qualities[quality]} changed={quality !== 'native'} placement={placement} scope="preview">
        <SegmentedField<ViewerQualityKey>
          label={VIEWER.quality}
          hideLabel
          size="sm"
          value={quality}
          onChange={onQuality}
          options={QUALITIES.map((q) => ({ value: q, label: VIEWER.qualities[q] }))}
        />
        <Text variant="studio-caption" tone="muted">
          {VIEWER.qualityHint}
        </Text>
      </Tool>
      {orientation === 'over' ? null : (
        <span className="px-1" role="img" aria-label={VIEWER.scaleLabel(scale)}>
          <Text variant="studio-mono" tone="muted" tabular>
            {VIEWER.scale(scale)}
          </Text>
        </span>
      )}
      {divider}
      {/* The live group: what the audience sees. */}
      <span className="inline-flex px-1 text-[var(--muted)]" role="img" aria-label={VIEWER.onStage} data-viewer-stage-group>
        {orientation === 'row' ? <MeaningChip meaning="stage">{VIEWER.onStage}</MeaningChip> : <Icon name="displays" size="sm" />}
      </span>
      <Tool id="colours" icon="colours" label={VIEWER.colours} value={VIEWER.filters[view.filter]} changed={view.filter !== DEFAULT_STAGE_VIEW.filter} placement={placement} scope="stage">
        <SegmentedField<StageFilter>
          label={VIEWER.colours}
          hideLabel
          size="sm"
          value={view.filter}
          onChange={(filter) => write({ filter })}
          options={STAGE_FILTERS.map((f) => ({ value: f, label: VIEWER.filters[f] }))}
        />
        <Text variant="studio-caption" tone="muted">
          {VIEWER.coloursHint}
        </Text>
      </Tool>
      <Tool
        id="brightness"
        icon="brightness"
        label={VIEWER.brightness}
        value={VIEWER.scale(view.brightness)}
        changed={view.brightness !== DEFAULT_STAGE_VIEW.brightness}
        placement={placement}
        scope="stage"
      >
        <SliderField
          label={VIEWER.brightness}
          value={brightness}
          minValue={50}
          maxValue={100}
          step={5}
          formatOptions={{ style: 'unit', unit: 'percent', maximumFractionDigits: 0 }}
          onChange={setBrightness}
          onChangeEnd={(value) => write({ brightness: value })}
          description={VIEWER.brightnessHint}
        />
      </Tool>
      <Tool id="motion" icon="motion" label={VIEWER.motion} value={view.motion === 'reduced' ? VIEWER.on : VIEWER.off} changed={view.motion === 'reduced'} placement={placement} scope="stage">
        <SwitchField label={VIEWER.motion} description={VIEWER.motionHint} size="sm" isSelected={view.motion === 'reduced'} onChange={(on) => write({ motion: on ? 'reduced' : 'full' })} />
      </Tool>
      {orientation === 'row' && summary ? (
        <span className="min-w-0 pl-1" data-viewer-aids-summary>
          <Text variant="studio-caption" tone="accent" truncate>
            {summary}
          </Text>
        </span>
      ) : null}
    </div>
  )
}

/** "Invert · 80% · Still" — what the audience sees differently; empty when nothing is. */
export function aidsSummary(view: StageView): string {
  return [
    view.filter !== DEFAULT_STAGE_VIEW.filter ? VIEWER.filters[view.filter] : null,
    view.brightness !== DEFAULT_STAGE_VIEW.brightness ? VIEWER.scale(view.brightness) : null,
    view.motion === 'reduced' ? VIEWER.still : null,
  ]
    .filter(Boolean)
    .join(' · ')
}

interface ToolProps {
  id: string
  icon: IconName
  label: string
  /** The current value, in words: on the button's name and the popover's head. */
  value: string
  /** Not at its default: the icon is tinted and dotted. */
  changed: boolean
  placement: 'top' | 'left' | 'bottom end'
  /** Whose picture it changes: this preview, or the audience's. */
  scope: 'preview' | 'stage'
  children: ReactNode
}

/** One icon, one popover. The button is the trigger (HeroUI v3: no `Popover.Trigger` around a Button). */
function Tool({ id, icon, label, value, changed, placement, scope, children }: ToolProps) {
  return (
    <Popover>
      <HeroButton variant="ghost" size="sm" isIconOnly aria-label={`${label}: ${value}`} className="relative" data-viewer-tool={id} data-changed={changed ? '' : undefined}>
        <span className={changed ? 'inline-flex text-[var(--accent)]' : 'inline-flex'}>
          <Icon name={icon} size="sm" />
        </span>
        {changed ? <span className="absolute right-1 top-1 size-1.5 rounded-full bg-[var(--accent)]" aria-hidden /> : null}
      </HeroButton>
      <Popover.Content placement={placement}>
        <Popover.Dialog aria-label={label}>
          <div className="flex w-max min-w-60 max-w-[min(24rem,90vw)] flex-col gap-2" data-viewer-popover={id}>
            <div className="flex items-center justify-between gap-3">
              <Text variant="studio-label">{label}</Text>
              {scope === 'stage' ? (
                <MeaningChip meaning="stage">{VIEWER.liveOnStage}</MeaningChip>
              ) : (
                <Text variant="studio-caption" tone="muted">
                  {VIEWER.previewOnly}
                </Text>
              )}
            </div>
            {children}
          </div>
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  )
}
