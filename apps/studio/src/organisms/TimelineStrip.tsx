import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Icon, IconButton, Skeleton, Text, TransportButton, type IconName } from '@/atoms'
import { useControlLayoutStore, useTimelineHidden } from '@/chrome/control'
import { TeamMark, TrackMark, TurnCard, type TrackSize, type TrackStep } from '@/molecules'
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

const UP: Record<TrackSize, TrackSize> = { mini: 'compact', compact: 'full', full: 'full' }
const SIZES: readonly TrackSize[] = ['full', 'compact', 'mini']
/** What each item takes on the track, in px, gap included (TrackItems.tsx). */
const CARD: Record<TrackSize, number> = { full: 176, compact: 112, mini: 48 }
// A full mark is its icon and a short phrase ("Play loaded", "→ TEAM DELTA"), at most 112 px of words.
const MARK: Record<TrackSize, number> = { full: 104, compact: 28, mini: 28 }
const GAP = 6
const TEAM = 26

/**
 * The size of every item (beta.13): **the largest at which the whole Play
 * fits the track**, so the show reads end to end without scrolling for as
 * long as it can; a long Play shrinks to dots, and only then scrolls. The
 * question in play — the newest card — is drawn one size up, so what is
 * happening now is always the easiest thing on the track to read.
 */
export function trackSize(width: number, items: readonly TrackItem[]): TrackSize {
  const last = items.length - 1
  const need = (size: TrackSize) =>
    items.reduce((sum, item, at) => {
      if (item.kind === 'turn') return sum + CARD[at === last ? UP[size] : size] + GAP
      const token = size !== 'full' && item.event.kind.type === 'token_given' ? TEAM : 0
      return sum + MARK[size] + token + GAP
    }, 0)
  return SIZES.find((size) => need(size) <= width) ?? 'mini'
}

/**
 * The Timeline (spec §5.8), beta.13: **a fixed strip under the mosaic**, not a
 * tile — never resized or moved, but folded away completely on the operator's
 * word, like the sidebar (`TimelineToggle`) — that reads the log left to
 * right, one card per question and a small mark for whatever happened between
 * them, newest at the right edge.
 *
 * Read with `play_events`, a Query keyed on the Play id and its `eventCount`,
 * so the tick's count is what refreshes it and no Play field is a cache key.
 * Undo and Redo sit at its end, beside the history they act on. Nothing here
 * rewrites the log: undo appends, and an undone span is drawn struck.
 */
export function TimelineStrip() {
  const hidden = useTimelineHidden()
  return hidden ? null : <Strip />
}

function Strip() {
  const play = usePlayState()
  const setHidden = useControlLayoutStore((s) => s.setTimelineHidden)
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
  const section = useRef<HTMLElement | null>(null)
  const [width, setWidth] = useState({ strip: 0, track: 0 })
  useEffect(() => {
    const strip = section.current
    const lane = scroller.current
    if (!strip || !lane || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(() => setWidth({ strip: strip.clientWidth, track: lane.clientWidth }))
    observer.observe(strip)
    return () => observer.disconnect()
    // The elements exist once a Play does: the strip draws nothing before.
  }, [play === null])
  // A strip the tests never measure is drawn in full.
  const size = width.track > 0 ? trackSize(width.track, items) : 'full'
  // The title gives way to the count on a narrow strip.
  const narrow = width.strip > 0 && width.strip < 640

  // Newest at the right, always in view — on a new item, and when the strip
  // changes width (the last card was left half under the Undo column).
  useEffect(() => {
    const el = scroller.current
    el?.scrollTo?.({ left: el.scrollWidth })
  }, [items.length, items[items.length - 1]?.key, size, width])

  if (!play) return null
  const busy = play.overlay.busy
  const undoReason = busy ? TRANSPORT.waitOverlay : !play.operator.canUndo ? TRANSPORT.nothingToUndo : null
  const redoReason = busy ? TRANSPORT.waitOverlay : !play.operator.canRedo ? TRANSPORT.redoAfterUndo : null

  const last = items.length - 1
  return (
    <section ref={section} aria-label={TIMELINE.title} className="flex h-[84px] shrink-0 items-stretch gap-2 border-t border-[var(--chrome-line)] px-3" data-timeline-strip data-track-size={size}>
      <div className={['flex shrink-0 items-center gap-1', narrow ? 'flex-col justify-center' : ''].join(' ')}>
        <IconButton icon="chevronDown" label={TIMELINE.hide} size="sm" onPress={() => setHidden(true)} />
        {narrow ? (
          <span role="img" aria-label={TIMELINE.events(count)}>
            <Text variant="studio-caption" tone="muted" tabular>
              {count}
            </Text>
          </span>
        ) : (
          <div className="flex w-16 flex-col justify-center gap-0.5">
            <Text variant="studio-label">{TIMELINE.title}</Text>
            <Text variant="studio-caption" tone="muted" tabular>
              {TIMELINE.events(count)}
            </Text>
          </div>
        )}
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
          items.map((item, at) => <Item key={item.key} item={item} play={play} size={at === last && item.kind === 'turn' ? UP[size] : size} />)
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

function Item({ item, play, size }: { item: TrackItem; play: PlayStateForMain; size: TrackSize }) {
  const team = (id: unknown) => (typeof id === 'string' ? play.teams.find((t) => t.id === id) : undefined)
  if (item.kind === 'turn') {
    const holder = team(item.teamId)
    const domain = play.domains.find((d) => d.id === item.domainId)?.name ?? ''
    const steps: TrackStep[] = item.steps.map((s) => ({ key: s.id, icon: ICON[s.kind.type] ?? 'info', label: `${kindOf(s)} · ${timeOf(s)}${detailOf(s, play) ? ` · ${detailOf(s, play)}` : ''}` }))
    const result = item.resolved ? resolvedOf(item.resolved) : null
    const verdict = result
      ? {
          label: [VERDICTS[result.verdict] ?? '', SESSION.points(result.points)].filter(Boolean).join(' '),
          short: SESSION.points(result.points),
          meaning: result.verdict === 'correct' ? ('easy' as const) : result.verdict === 'incorrect' ? ('hard' as const) : ('medium' as const),
          tone: result.verdict === 'correct' ? ('success' as const) : result.verdict === 'incorrect' ? ('danger' as const) : ('warning' as const),
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
        number={TIMELINE.turn(item.number, '')}
        size={size}
        team={holder ? { color: holder.color, shortCode: holder.shortCode, name: holder.name, logoUrl: holder.logoUrl } : null}
        steps={steps}
        verdict={verdict}
        undone={item.undone}
        unfinished={item.unfinished}
        detail={detail}
      />
    )
  }
  const e = item.event
  const given = e.kind.type === 'token_given' ? team(e.kind['team']) : undefined
  const label = given ? TIMELINE.tokenTo(given.name) : kindOf(e)
  const detail = [kindOf(e), detailOf(e, play), TIMELINE.at(timeOf(e))].filter(Boolean).join(' · ')
  // The token's new holder is drawn, not spelled, below full size.
  const lead = given && size !== 'full' ? <TeamMark mark={{ color: given.color, shortCode: given.shortCode, name: given.name, logoUrl: given.logoUrl }} size="sm" /> : undefined
  return <TrackMark icon={ICON[e.kind.type] ?? 'info'} label={label} detail={detail} undone={item.undone} lead={lead} size={size} />
}

/**
 * The Timeline's switch, in the status bar under it (beta.13): always there,
 * so a strip folded away comes back from where it went — the sidebar's
 * pattern. It says how many events the log holds while the strip is away.
 */
export function TimelineToggle() {
  const hidden = useTimelineHidden()
  const setHidden = useControlLayoutStore((s) => s.setTimelineHidden)
  const count = usePlayState((s) => s?.operator.eventCount ?? null)
  if (count === null) return null
  return (
    <button
      type="button"
      className="flex items-center gap-1.5 rounded px-1 outline-none hover:bg-[var(--surface-secondary)] focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
      aria-pressed={!hidden}
      aria-label={hidden ? TIMELINE.show : TIMELINE.hide}
      onClick={() => setHidden(!hidden)}
      data-timeline-toggle={hidden ? 'hidden' : 'shown'}
    >
      <span className={hidden ? 'inline-flex opacity-60' : 'inline-flex text-[var(--accent)]'}>
        <Icon name="timeline" size="sm" />
      </span>
      <Text variant="studio-caption" tone={hidden ? 'muted' : 'default'}>
        {hidden ? `${TIMELINE.title} · ${TIMELINE.events(count)}` : TIMELINE.title}
      </Text>
    </button>
  )
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
