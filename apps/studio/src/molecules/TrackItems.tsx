import type { ReactNode } from 'react'
import { Icon, MeaningChip, StatusDot, Text, Tooltip, type ChipMeaning, type DotTone, type IconName, type TeamMarkData } from '@/atoms'
import { TIMELINE } from '@/copy'
import { TeamMark } from './TeamMark'

/**
 * How much of a track item is drawn (beta.13), from the room the strip has:
 *
 *   full     the question, its domain, the steps and the outcome in words
 *   compact  the question number and the points; domain and steps on the tooltip
 *   mini     the team and a coloured dot — the shape of the show at a glance
 */
export type TrackSize = 'full' | 'compact' | 'mini'

export interface TrackStep {
  readonly key: string
  readonly icon: IconName
  /** The step's words and time, on the tooltip. */
  readonly label: string
}

export interface TrackVerdict {
  /** "Correct +250". */
  readonly label: string
  /** "+250": what a compact card has room for. */
  readonly short: string
  readonly meaning: ChipMeaning
  /** The dot a mini card shows. */
  readonly tone: DotTone
}

export interface TurnCardProps {
  /** "Q3 · History". */
  title: string
  /** "Q3". */
  number: string
  team: TeamMarkData | null
  steps: readonly TrackStep[]
  /** The outcome, or null while the question is being played. */
  verdict: TrackVerdict | null
  /** Taken out by an undo (the whole span, not one row). */
  undone?: boolean | undefined
  /** Closed without an outcome: the Play ended or restarted under it. */
  unfinished?: boolean | undefined
  /** The time it was issued and what happened, for the card's tooltip. */
  detail: string
  size?: TrackSize | undefined
}

const WIDTH: Record<TrackSize, string> = { full: 'w-44', compact: 'w-28', mini: 'w-12' }

/**
 * One question of the Timeline track (beta.13): what was asked, who answered,
 * the steps in order and the outcome — read left to right like the show. It
 * sheds words before it sheds meaning: the outcome's colour survives at every
 * size, and whatever is not drawn is on the tooltip.
 */
export function TurnCard({ title, number, team, steps, verdict, undone, unfinished, detail, size = 'full' }: TurnCardProps) {
  const live = verdict === null && !undone && !unfinished
  const state = undone
    ? { meaning: 'frozen' as const, label: TIMELINE.undone, short: TIMELINE.undone, tone: 'neutral' as const }
    : verdict
      ? verdict
      : unfinished
        ? { meaning: 'unset' as const, label: TIMELINE.unanswered, short: '—', tone: 'neutral' as const }
        : { meaning: 'active' as const, label: TIMELINE.inPlay, short: TIMELINE.inPlay, tone: 'accent' as const }
  const frame = [
    'flex h-full shrink-0 rounded-[calc(var(--radius)/2)] border',
    WIDTH[size],
    live ? 'border-[var(--accent)] bg-[var(--accent)]/6' : 'border-[var(--border)]',
    undone ? 'opacity-50' : '',
  ].join(' ')
  const data = { 'data-track-turn': size, 'data-undone': undone ? '' : undefined }

  if (size === 'mini') {
    return (
      <Tooltip content={`${detail} · ${state.label}`}>
        <div className={[frame, 'flex-col items-center justify-center gap-1 px-1'].join(' ')} {...data} aria-label={`${title} · ${state.label}`} role="img">
          {team ? <TeamMark mark={team} size="sm" /> : null}
          <span className="flex items-center gap-1">
            <Text variant="studio-caption" tone="muted" tabular className={undone ? 'line-through' : ''}>
              {number}
            </Text>
            <StatusDot tone={state.tone} pulse={live} />
          </span>
        </div>
      </Tooltip>
    )
  }

  const compact = size === 'compact'
  return (
    <div className={[frame, 'flex-col justify-between gap-0.5 px-2 py-1'].join(' ')} {...data}>
      <Tooltip content={compact ? [detail, ...steps.map((s) => s.label)].join(' · ') : detail}>
        <div className="flex min-w-0 items-center gap-1.5">
          {team ? <TeamMark mark={team} size="sm" /> : null}
          <Text variant="studio-caption" truncate className={['min-w-0 flex-1', undone ? 'line-through' : ''].join(' ')}>
            {compact ? number : title}
          </Text>
        </div>
      </Tooltip>
      <div className="flex min-w-0 items-center gap-1">
        {compact ? (
          <span className="flex-1" />
        ) : (
          <div className="flex min-w-0 flex-1 items-center gap-0.5 overflow-hidden">
            {steps.map((s) => (
              <Tooltip key={s.key} content={s.label}>
                <span className="inline-flex text-[var(--muted)]" aria-label={s.label} role="img">
                  <Icon name={s.icon} size="sm" />
                </span>
              </Tooltip>
            ))}
          </div>
        )}
        <MeaningChip meaning={state.meaning}>
          {compact ? (
            <>
              {state.short}
              <span className="sr-only">{` · ${state.label}`}</span>
            </>
          ) : (
            state.label
          )}
        </MeaningChip>
      </div>
    </div>
  )
}

export interface TrackMarkProps {
  icon: IconName
  label: string
  detail: string
  undone?: boolean | undefined
  /** A team mark after the icon: the token's new holder. */
  lead?: ReactNode
  size?: TrackSize | undefined
}

/**
 * Something that happened between questions: the token moving, a pause, an
 * undo. Below `full` it is its icon (and the token's new holder), the words on
 * the tooltip.
 */
export function TrackMark({ icon, label, detail, undone, lead, size = 'full' }: TrackMarkProps) {
  const words = size === 'full'
  return (
    <Tooltip content={detail}>
      <div
        className={['flex h-8 shrink-0 items-center gap-1 rounded-[calc(var(--radius)/2)] px-1 text-[var(--muted)]', undone ? 'opacity-50 line-through' : ''].join(' ')}
        data-track-mark={size}
        aria-label={words ? undefined : label}
        role={words ? undefined : 'img'}
      >
        <Icon name={icon} size="sm" />
        {lead}
        {words ? (
          <Text variant="studio-caption" tone="muted" className="max-w-28 whitespace-nowrap" truncate>
            {label}
          </Text>
        ) : null}
      </div>
    </Tooltip>
  )
}
