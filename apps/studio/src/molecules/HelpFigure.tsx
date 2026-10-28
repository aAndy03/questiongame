import type { ReactNode } from 'react'
import { Icon, Panel, Text } from '@/atoms'
import type { HelpFigureId } from '@/copy/help'

export interface HelpFigureProps {
  figure: HelpFigureId
  /** Under the picture, and its accessible name. */
  caption: string
}

/**
 * Help's pictures (beta.10): small diagrams drawn from Studio's own tokens,
 * never screenshots — a screenshot goes stale with the next change and is
 * wrong in the other theme. Each is one `role="img"` named by its caption.
 * Drawn as Studio draws everything else: `Panel` surfaces and fills, never
 * an outline.
 */
export function HelpFigure({ figure, caption }: HelpFigureProps) {
  return (
    <figure className="flex flex-col gap-2" data-help-figure={figure}>
      <Panel variant="secondary">
        <div role="img" aria-label={caption} className="flex items-center justify-center overflow-x-auto">
          {DRAWINGS[figure]()}
        </div>
      </Panel>
      <figcaption>
        <Text variant="studio-caption" tone="muted">
          {caption}
        </Text>
      </figcaption>
    </figure>
  )
}

function Box({ children, tone = 'plain', className }: { children: ReactNode; tone?: 'plain' | 'accent' | 'success' | 'muted'; className?: string }) {
  const look = {
    plain: 'bg-[var(--surface)] text-[var(--foreground)]',
    accent: 'bg-[color-mix(in_oklab,var(--accent)_16%,var(--surface))] text-[var(--accent)]',
    success: 'bg-[color-mix(in_oklab,var(--success)_16%,var(--surface))] text-[var(--success)]',
    muted: 'bg-[color-mix(in_oklab,var(--foreground)_4%,transparent)] text-[var(--muted)]',
  }[tone]
  return <div className={['flex shrink-0 flex-col items-center justify-center gap-0.5 rounded-[calc(var(--radius)*0.66)] px-3 py-2 text-center', look, className ?? ''].join(' ')}>{children}</div>
}

function Arrow() {
  return (
    <span aria-hidden className="shrink-0 px-1 text-[var(--muted)]">
      →
    </span>
  )
}

function Small({ children }: { children: string }) {
  return (
    <Text variant="studio-caption" tone="muted">
      {children}
    </Text>
  )
}

const DRAWINGS: Readonly<Record<HelpFigureId, () => ReactNode>> = {
  'select-lock-reveal': () => (
    <div className="flex items-center">
      <Box>
        <Text variant="studio-label">Select</Text>
        <Small>timer runs</Small>
      </Box>
      <Arrow />
      <Box tone="accent">
        <Text variant="studio-label">Lock</Text>
        <Small>timer stops</Small>
      </Box>
      <Arrow />
      <Box tone="success">
        <Text variant="studio-label">Reveal</Text>
        <Small>scores · uses it up</Small>
      </Box>
    </div>
  ),
  'easy-to-hard': () => (
    <div className="flex items-end gap-2">
      {[10, 30, 50, 70, 90].map((d, i) => (
        <div key={d} className="flex items-end">
          <div className="flex flex-col items-center gap-1">
            <div className="w-10 rounded-t bg-[var(--accent)]" style={{ height: 12 + d * 0.6, opacity: 0.35 + i * 0.15 }} />
            <Text variant="studio-caption" tabular>
              {String(d)}
            </Text>
          </div>
          {i < 4 ? <Arrow /> : null}
        </div>
      ))}
    </div>
  ),
  'drag-to-domain': () => (
    <div className="flex items-center gap-2">
      <Box className="relative min-w-40 items-start text-left">
        <Text variant="studio-label">Who painted…</Text>
        <Small>difficulty 40</Small>
        <span className="absolute -right-2 -top-2 rounded-full bg-[var(--accent)] px-1.5 text-xs font-medium text-[var(--accent-foreground)]">3</span>
      </Box>
      <Arrow />
      <div className="flex flex-col gap-1">
        <Box tone="muted" className="min-w-28 py-1">
          <Small>History</Small>
        </Box>
        <Box tone="accent" className="min-w-28 py-1">
          <Text variant="studio-caption">Art</Text>
        </Box>
        <Box tone="muted" className="min-w-28 py-1">
          <Small>Science</Small>
        </Box>
      </div>
    </div>
  ),
  'token-ring': () => (
    <div className="flex items-center gap-3">
      {[
        { name: 'Owls', state: 'played' },
        { name: 'Foxes', state: 'token' },
        { name: 'Bears', state: 'next' },
        { name: 'Hares', state: 'waiting' },
      ].map((t) => (
        <div key={t.name} className="flex flex-col items-center gap-1">
          <div
            className={[
              'flex size-12 items-center justify-center rounded-full',
              t.state === 'token' ? 'bg-[var(--accent)] text-[var(--accent-foreground)]' : 'bg-[var(--surface)]',
            ].join(' ')}
          >
            {t.state === 'played' ? <Icon name="check" size="sm" /> : t.state === 'token' ? <Text variant="studio-label">●</Text> : null}
          </div>
          <Text variant="studio-caption">{t.name}</Text>
          <Small>{t.state === 'played' ? 'played' : t.state === 'token' ? 'token' : t.state === 'next' ? 'next' : 'to come'}</Small>
        </div>
      ))}
    </div>
  ),
  'stage-displays': () => (
    <div className="flex items-end gap-4">
      {[
        { name: 'Laptop', stage: false, stats: true, w: 96 },
        { name: 'TV', stage: true, stats: false, w: 144 },
        { name: 'Projector', stage: true, stats: false, w: 120 },
      ].map((d) => (
        <div key={d.name} className="flex flex-col items-center gap-1.5">
          <div
            className={['flex items-center justify-center rounded-[calc(var(--radius)*0.66)]', d.stage ? 'bg-[color-mix(in_oklab,var(--accent)_20%,var(--surface))]' : 'bg-[var(--surface)]'].join(' ')}
            style={{ width: d.w, height: d.w * 0.5625 }}
          >
            <Small>{d.stage ? 'Stage' : d.stats ? 'Statistics' : ''}</Small>
          </div>
          <Text variant="studio-caption">{d.name}</Text>
          <span className="flex items-center gap-1 text-[var(--accent)]">
            {d.stage || d.stats ? <Icon name="check" size="sm" /> : null}
            <Small>{d.stage ? 'Stage' : 'Statistics'}</Small>
          </span>
        </div>
      ))}
    </div>
  ),
}
