import type { ReactNode } from 'react'
import { Icon, MeaningChip, Text, Tooltip, type ChipMeaning, type IconName, type TeamMarkData } from '@/atoms'
import { TIMELINE } from '@/copy'
import { TeamMark } from './TeamMark'

export interface TrackStep {
  readonly key: string
  readonly icon: IconName
  /** The step's words and time, on the tooltip. */
  readonly label: string
}

export interface TurnCardProps {
  /** "Q3 · History". */
  title: string
  team: TeamMarkData | null
  steps: readonly TrackStep[]
  /** The outcome, or null while the question is being played. */
  verdict: { label: string; meaning: ChipMeaning } | null
  /** Taken out by an undo (the whole span, not one row). */
  undone?: boolean | undefined
  /** The time it was issued and what happened, for the card's tooltip. */
  detail: string
}

/**
 * One question of the Timeline track (beta.13): what was asked, who answered,
 * the steps in order and the outcome — read left to right like the show.
 */
export function TurnCard({ title, team, steps, verdict, undone, detail }: TurnCardProps) {
  return (
    <div
      className={[
        'flex h-full w-44 shrink-0 flex-col justify-between gap-0.5 rounded-[calc(var(--radius)/2)] border px-2 py-1',
        verdict === null && !undone ? 'border-[var(--accent)] bg-[var(--accent)]/6' : 'border-[var(--border)]',
        undone ? 'opacity-50' : '',
      ].join(' ')}
      data-track-turn
      data-undone={undone ? '' : undefined}
    >
      <Tooltip content={detail}>
        <div className="flex min-w-0 items-center gap-1.5">
          {team ? <TeamMark mark={team} size="sm" /> : null}
          <Text variant="studio-caption" truncate className={['min-w-0 flex-1', undone ? 'line-through' : ''].join(' ')}>
            {title}
          </Text>
        </div>
      </Tooltip>
      <div className="flex min-w-0 items-center gap-1">
        <div className="flex min-w-0 flex-1 items-center gap-0.5 overflow-hidden">
          {steps.map((s) => (
            <Tooltip key={s.key} content={s.label}>
              <span className="inline-flex text-[var(--muted)]" aria-label={s.label} role="img">
                <Icon name={s.icon} size="sm" />
              </span>
            </Tooltip>
          ))}
        </div>
        {undone ? (
          <MeaningChip meaning="frozen">{TIMELINE.undone}</MeaningChip>
        ) : verdict ? (
          <MeaningChip meaning={verdict.meaning}>{verdict.label}</MeaningChip>
        ) : (
          <MeaningChip meaning="active">{TIMELINE.inPlay}</MeaningChip>
        )}
      </div>
    </div>
  )
}

export interface TrackMarkProps {
  icon: IconName
  label: string
  detail: string
  undone?: boolean | undefined
  /** A team mark before the words: the token's new holder. */
  lead?: ReactNode
}

/** Something that happened between questions: the token moving, a pause, an undo. */
export function TrackMark({ icon, label, detail, undone, lead }: TrackMarkProps) {
  return (
    <Tooltip content={detail}>
      <div
        className={['flex h-8 shrink-0 items-center gap-1 rounded-[calc(var(--radius)/2)] px-1.5 text-[var(--muted)]', undone ? 'opacity-50 line-through' : ''].join(' ')}
        data-track-mark
      >
        <Icon name={icon} size="sm" />
        {lead}
        <Text variant="studio-caption" tone="muted" className="max-w-28 whitespace-nowrap" truncate>
          {label}
        </Text>
      </div>
    </Tooltip>
  )
}
