import { useEffect, useRef, useState } from 'react'
import { STAGE_FILTERS, type StageFilter, type StageView } from '@questiongame/contract'
import { SegmentedField, SliderField, SwitchField, Text } from '@/atoms'
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
  /** A row in the band under the frame, or a column beside it. */
  orientation: 'row' | 'column'
}

const QUALITIES: readonly ViewerQualityKey[] = ['native', 'high', 'medium', 'low']

/**
 * The Viewer's controls (beta.13), in the room the 16:9 frame leaves: how
 * finely this preview is drawn, then the display aids — which are **Stage's**,
 * live, for the people watching it. The aids are the operating systems' set
 * (invert, greyscale, both, dimming, reduced motion) and nothing invented.
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
  const row = orientation === 'row'
  return (
    <div className={row ? 'flex flex-wrap items-end gap-x-4 gap-y-2' : 'flex flex-col gap-3'} data-viewer-controls={orientation}>
      <SegmentedField<ViewerQualityKey>
        label={VIEWER.quality}
        description={row ? undefined : VIEWER.qualityHint}
        size="sm"
        value={quality}
        onChange={onQuality}
        options={QUALITIES.map((q) => ({ value: q, label: VIEWER.qualities[q] }))}
      />
      <div className={row ? 'flex flex-wrap items-end gap-x-4 gap-y-2' : 'flex flex-col gap-3 border-t border-[var(--separator)] pt-3'} role="group" aria-label={VIEWER.aids}>
        {row ? null : (
          <div className="flex flex-col gap-0.5">
            <Text variant="studio-label">{VIEWER.aids}</Text>
            <Text variant="studio-caption" tone="muted">
              {VIEWER.aidsHint}
            </Text>
          </div>
        )}
        <SegmentedField<StageFilter>
          label={VIEWER.colours}
          size="sm"
          value={view.filter}
          onChange={(filter) => write({ filter })}
          options={STAGE_FILTERS.map((f) => ({ value: f, label: VIEWER.filters[f] }))}
        />
        <SliderField
          label={VIEWER.brightness}
          value={brightness}
          minValue={50}
          maxValue={100}
          step={5}
          formatOptions={{ style: 'unit', unit: 'percent', maximumFractionDigits: 0 }}
          onChange={setBrightness}
          onChangeEnd={(value) => write({ brightness: value })}
          className={row ? 'w-40' : undefined}
        />
        <SwitchField
          label={VIEWER.motion}
          description={row ? undefined : VIEWER.motionHint}
          size="sm"
          isSelected={view.motion === 'reduced'}
          onChange={(on) => write({ motion: on ? 'reduced' : 'full' })}
        />
      </div>
      <Text variant="studio-mono" tone="muted" tabular className={row ? 'ml-auto self-center' : undefined}>
        {VIEWER.scale(scale)}
      </Text>
    </div>
  )
}
