import { useEffect, useMemo, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Skeleton, Text, TransportButton, type IconName } from '@/atoms'
import { TrackMark, TurnCard, type TrackStep } from '@/molecules'
import { SESSION, TIMELINE, TRANSPORT } from '@/copy'
import { useChord } from '@/host/chords'
import { useHostCommand } from '@/host/commands'
import { command } from '@/host/host'
import { usePlayState } from '@/host/playState'
import { resolvedOf, track, type TrackItem } from '@/host/timeline'
import type { PlayEvent } from '@/host/types'
import type { PlayStateForMain } from '@questiongame/contract'

/** The icon of each event the track draws; a kind this build does not know gets the generic one. */
const ICON: Readonly<Record<string, IconName>> = {
  play_loaded: 'open',
  play_started: 'play',
  paused: 'pause',
  resumed: 'play',
  token_given: 'token',
  stem_revealed: 'eye',
  option_revealed: 'listCheck',
  selection_set: 'check',
  timer_started: 'clock',
  timer_paused: 'pause',
  timer_expired: 'clock',
  selection_locked: 'lock',
  ring_reordered: 'shuffle',
  leaderboard_rank_revealed: 'flag',
  turn_inverted: 'undo',
  turn_reapplied: 'redo',
  play_completed: 'flag',
  play_abandoned: 'abandon',
  play_restarted: 'restart',
  settings_live_changed: 'sliders',
  operator_switched: 'operators',
}

/**
 * The Timeline (spec §5.8), beta.13: **a fixed strip under the mosaic**, not a
 * tile — it is never resized, moved or collapsed — that reads the log left to
 * right, one card per question and a small mark for whatever happened between
 * them, newest at the right edge.
 *
 * Read with `play_events`, a Query keyed on the Play id and its `eventCount`,
 * so the tick's count is what refreshes it and no Play field is a cache key.
 * Undo and Redo sit at its end, beside the history they act on. Nothing here
 * rewrites the log: undo appends, and an undone span is drawn struck.
 */
export function TimelineStrip() {
  const play = usePlayState()
  const run = useHostCommand()
  const chord = useChord()
  const playId = play?.playId ?? null
  const count = play?.operator.eventCount ?? 0
  const events = useQuery({
    queryKey: ['plays', 'events', playId ?? '', count],
    queryFn: () => command<PlayEvent[]>('play_events', { playId }),
    enabled: playId !== null,
    placeholderData: (prev) => prev,
  })
  const items = useMemo(() => track(events.data ?? []), [events.data])
  const scroller = useRef<HTMLDivElement | null>(null)

  // Newest at the right, always in view.
  useEffect(() => {
    const el = scroller.current
    el?.scrollTo?.({ left: el.scrollWidth })
  }, [items.length, items[items.length - 1]?.key])

  if (!play) return null
  const busy = play.overlay.busy
  const undoReason = busy ? TRANSPORT.waitOverlay : !play.operator.canUndo ? TRANSPORT.nothingToUndo : null
  const redoReason = busy ? TRANSPORT.waitOverlay : !play.operator.canRedo ? TRANSPORT.redoAfterUndo : null

  return (
    <section aria-label={TIMELINE.title} className="flex h-[84px] shrink-0 items-stretch gap-2 border-t border-[var(--chrome-line)] px-3" data-timeline-strip>
      <div className="flex w-20 shrink-0 flex-col justify-center gap-0.5">
        <Text variant="studio-label">{TIMELINE.title}</Text>
        <Text variant="studio-caption" tone="muted" tabular>
          {TIMELINE.events(count)}
        </Text>
      </div>
      <div
        ref={scroller}
        className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto overflow-y-hidden py-2"
        // A wheel scrolls the track sideways: it has no other way to go.
        onWheel={(e) => {
          if (scroller.current && Math.abs(e.deltaY) > Math.abs(e.deltaX)) scroller.current.scrollLeft += e.deltaY
        }}
        data-timeline-track
      >
        {events.isPending && count > 0 ? (
          <>
            <Skeleton className="h-full w-44 shrink-0" />
            <Skeleton className="h-full w-44 shrink-0" />
            <span className="sr-only">{TIMELINE.loading}</span>
          </>
        ) : events.isError && items.length === 0 ? (
          <Text variant="studio-caption" tone="warning">
            {TIMELINE.failed}
          </Text>
        ) : items.length === 0 ? (
          <Text variant="studio-caption" tone="muted">
            {count > 0 && events.isFetching ? TIMELINE.loading : TIMELINE.empty}
          </Text>
        ) : (
          items.map((item) => <Item key={item.key} item={item} play={play} />)
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1 border-l border-[var(--separator)] pl-2">
        <TransportButton icon="undo" label={TRANSPORT.undo} size="sm" onPress={() => void run('undo_turn')} isDisabled={!play.operator.canUndo || busy} disabledReason={undoReason} kbd={chord('undo_turn')} />
        <TransportButton icon="redo" label={TRANSPORT.redo} size="sm" onPress={() => void run('redo_turn')} isDisabled={!play.operator.canRedo || busy} disabledReason={redoReason} kbd={chord('redo_turn')} />
      </div>
    </section>
  )
}

const TIME = new Intl.DateTimeFormat(undefined, { timeStyle: 'medium' })
const timeOf = (e: PlayEvent) => TIME.format(e.at_ms)
const kindOf = (e: PlayEvent) => TIMELINE.kinds[e.kind.type] ?? TIMELINE.unknownKind

/** The verdict's operator words; a verdict this build does not know shows nothing rather than its wire name. */
const VERDICTS: Readonly<Record<string, string>> = SESSION.verdict

function Item({ item, play }: { item: TrackItem; play: PlayStateForMain }) {
  const team = (id: unknown) => (typeof id === 'string' ? play.teams.find((t) => t.id === id) : undefined)
  if (item.kind === 'turn') {
    const holder = team(item.teamId)
    const domain = play.domains.find((d) => d.id === item.domainId)?.name ?? ''
    const steps: TrackStep[] = item.steps.map((s) => ({ key: s.id, icon: ICON[s.kind.type] ?? 'info', label: `${kindOf(s)} · ${timeOf(s)}${detailOf(s, play) ? ` · ${detailOf(s, play)}` : ''}` }))
    const result = item.resolved ? resolvedOf(item.resolved) : null
    const verdict = result
      ? {
          label: [VERDICTS[result.verdict] ?? '', SESSION.points(result.points)].filter(Boolean).join(' '),
          meaning: result.verdict === 'correct' ? ('easy' as const) : result.verdict === 'incorrect' ? ('hard' as const) : ('medium' as const),
        }
      : null
    const detail = [
      TIMELINE.turn(item.number, domain),
      holder?.name,
      TIMELINE.at(timeOf(item.issued)),
      result && result.bonus ? SESSION.bonus(result.bonus) : null,
      item.undone ? TIMELINE.undone : null,
    ]
      .filter(Boolean)
      .join(' · ')
    return (
      <TurnCard
        title={TIMELINE.turn(item.number, domain)}
        team={holder ? { color: holder.color, shortCode: holder.shortCode, name: holder.name, logoUrl: holder.logoUrl } : null}
        steps={steps}
        verdict={verdict}
        undone={item.undone}
        detail={detail}
      />
    )
  }
  const e = item.event
  const given = e.kind.type === 'token_given' ? team(e.kind['team']) : undefined
  const label = given ? TIMELINE.tokenTo(given.name) : kindOf(e)
  const detail = [kindOf(e), detailOf(e, play), TIMELINE.at(timeOf(e))].filter(Boolean).join(' · ')
  return <TrackMark icon={ICON[e.kind.type] ?? 'info'} label={label} detail={detail} undone={item.undone} />
}

/** A short detail from the event's own fields; names come from the snapshot. */
function detailOf(e: PlayEvent, play: PlayStateForMain): string {
  const k = e.kind
  switch (k.type) {
    case 'token_given':
      return play.teams.find((t) => t.id === k['team'])?.name ?? ''
    case 'selection_set':
    case 'selection_locked':
      return Array.isArray(k['options']) ? TIMELINE.selected((k['options'] as unknown[]).length) : ''
    case 'leaderboard_rank_revealed':
      return k['rank'] !== undefined ? `#${String(k['rank'])}` : ''
    default:
      return ''
  }
}
