import { useEffect, useMemo, useRef, useState } from 'react'
import {
  leaderboard,
  STAGE_FRAME,
  VIEWER_SOURCE,
  isViewerMessage,
  parseNodeId,
  type PlayStateForMain,
  type PlayStateForStage,
  type StageToViewer,
  type ViewerNodeRect,
  type ViewerToStage,
} from '@questiongame/contract'
import { HitTarget, Text } from '@/atoms'
import { VIEWER_QUALITY, useControlLayoutStore, useViewerQuality } from '@/chrome/control'
import { armOrConfirm, sameArm, useArmStore, type Arm } from '@/chrome/arm'
import { EmptyState, ViewerControls } from '@/molecules'
import { CONTROL, RING_ROLE, SESSION, TIMER } from '@/copy'
import { useHostCommand } from '@/host/commands'
import { hasTauri } from '@/host/host'
import { usePlayClock, usePlayState } from '@/host/playState'
import { ringEntries, ringRole } from '@/host/ring'
import { canChooseDomain, liveSession } from '@/host/session'
import { useSettings } from '@/host/queries'

/**
 * The Viewer (spec §5.7): the real Stage in an iframe, fed the stripped
 * play-state over `postMessage`, with hit targets laid over the node rects
 * Stage reports. The chrome is in this DOM; the Stage tree gains nothing.
 * Every hit target calls the same `run` the Action Panel and the chords do.
 */
/**
 * The band under the frame, or the column beside it, the toolbar needs
 * (beta.13): one row of icons, or one column of them. The controls open as
 * popovers, so the frame keeps nearly all of the tile.
 */
const BAND_MIN = 44
const COLUMN_MIN = 52

export function Viewer() {
  const play = usePlayState()
  // The Viewer draws Stage, so it needs Stage's clock — but only the clock, and
  // only at the rate Studio publishes it.
  const clock = usePlayClock()
  const playId = usePlayState((s) => s?.playId ?? null)
  const running = usePlayState((s) => s?.clock.running ?? false)
  const settings = useSettings()
  const run = useHostCommand()
  const frame = useRef<HTMLIFrameElement | null>(null)
  const box = useRef<HTMLDivElement | null>(null)
  const [ready, setReady] = useState(false)
  const [nodes, setNodes] = useState<readonly ViewerNodeRect[]>([])
  const [size, setSize] = useState({ width: 0, height: 0 })
  const [tile, setTile] = useState({ width: 0, height: 0 })
  const quality = useViewerQuality()
  const setQuality = useControlLayoutStore((s) => s.setViewerQuality)
  const pixels = VIEWER_QUALITY[quality].pixels
  const hitTargets = settings.data?.control.viewer_hit_targets ?? true
  const armed = useArmStore((s) => s.armed)
  // The latest Play, for the `ready` handler: a re-mounted iframe (the mosaic
  // moved the tile) announces itself again and must get the state at once.
  const latest = useRef<PlayStateForMain | null>(play)
  latest.current = play

  // The tile decides the frame: 16:9, as large as fits (beta.13). What the
  // aspect leaves over — under the frame, or beside it — is the controls'.
  useEffect(() => {
    const el = box.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return
      setTile({ width: entry.contentRect.width, height: entry.contentRect.height })
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  const placement = controlsPlacement(tile.width, tile.height)
  useEffect(() => {
    const w = placement === 'beside' ? tile.width - COLUMN_MIN : tile.width
    const h = placement === 'below' ? tile.height - BAND_MIN : tile.height
    const scale = Math.max(0, Math.min(w / STAGE_FRAME.width, h / STAGE_FRAME.height))
    setSize({ width: Math.floor(STAGE_FRAME.width * scale), height: Math.floor(STAGE_FRAME.height * scale) })
  }, [tile.width, tile.height, placement])

  // Stage → Studio: ready, node rects.
  useEffect(() => {
    const onMessage = (event: MessageEvent<unknown>) => {
      if (event.source !== frame.current?.contentWindow || !isViewerMessage(event.data)) return
      const message = event.data as StageToViewer
      if (message.type === 'ready') {
        setReady(true)
        const state = latest.current ? strip(latest.current) : null
        if (state && frame.current?.contentWindow) {
          const reply: ViewerToStage = { source: VIEWER_SOURCE, type: 'play-state', state }
          frame.current.contentWindow.postMessage(reply, '*')
        }
      }
      if (message.type === 'nodes') setNodes(message.nodes)
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [])

  // Studio → Stage: the stripped state on every change, and once on ready.
  useEffect(() => {
    const target = frame.current?.contentWindow
    if (!target || !ready) return
    const state = play ? strip(play) : null
    if (!state) return
    const message: ViewerToStage = { source: VIEWER_SOURCE, type: 'play-state', state }
    target.postMessage(message, '*')
  }, [play, ready])

  // Studio → Stage: the countdown (P11.9). `play` is event-driven now, so the
  // effect above fires only when the Play changed; without this the Viewer's
  // clock would sit still. A tick is four fields, against a structured clone
  // of the whole stripped Play ten times a second.
  // Medium and Low quality post the clock less often (beta.13); a start or a
  // stop always goes at once, so the preview never shows a clock that is wrong.
  const lastTick = useRef<{ at: number; running: boolean; countdown: number | null }>({ at: 0, running: false, countdown: null })
  const tickMs = VIEWER_QUALITY[quality].tickMs
  useEffect(() => {
    const target = frame.current?.contentWindow
    if (!target || !ready || !playId) return
    const now = performance.now()
    // Only the elapsed clock is thinned (review): the countdown is the number
    // the operator reads, and it already moves at most once a second.
    const countdown = clock.remainingMs
    if (tickMs > 0 && running === lastTick.current.running && countdown === lastTick.current.countdown && now - lastTick.current.at < tickMs) return
    lastTick.current = { at: now, running, countdown }
    const message: ViewerToStage = {
      source: VIEWER_SOURCE,
      type: 'tick',
      tick: { playId, remainingMs: clock.remainingMs, elapsedMs: clock.elapsedMs, running },
    }
    target.postMessage(message, '*')
  }, [clock, playId, running, ready, tickMs])

  useEffect(() => {
    const target = frame.current?.contentWindow
    if (!target || !ready) return
    const message: ViewerToStage = { source: VIEWER_SOURCE, type: 'measure' }
    target.postMessage(message, '*')
  }, [size, ready, pixels])

  const scale = size.width / STAGE_FRAME.width
  const targets = useMemo(() => (play && hitTargets ? nodesToTargets(play, nodes, scale, armed) : []), [play, nodes, scale, hitTargets, armed])
  // An armed target confirms on the second press, from here or anywhere else
  // (`chrome/arm.ts`) — the same arm the Action Panel shows.
  const press = (t: Target) => {
    if (t.arm && !armOrConfirm(t.arm)) return
    void run(t.command, t.args)
  }

  if (!hasTauri() && !import.meta.env.DEV) {
    return <EmptyState kind="empty" what="viewer" detail={CONTROL.viewerNoHost} compact />
  }

  const view = play?.view
  const controls = view ? (
    <ViewerControls
      quality={quality}
      onQuality={setQuality}
      view={view}
      onView={(next) => void run('settings_set_global', { setting: { key: 'stage_view', value: next } })}
      scale={Math.round(scale * 100)}
      orientation={placement === 'below' ? 'row' : placement === 'beside' ? 'column' : 'over'}
    />
  ) : null

  return (
    <div
      ref={box}
      className={['flex h-full w-full gap-3 p-2', placement === 'beside' ? 'flex-row items-start' : 'flex-col items-center'].join(' ')}
      style={{ background: 'var(--surface-tertiary)' }}
      data-viewer
      data-viewer-placement={placement}
    >
      <div className="relative shrink-0 overflow-hidden" style={{ width: size.width || undefined, height: size.height || undefined }}>
        {/* Drawn at `pixels` of its size and scaled up (beta.13): the frame
          * the operator sees stays put, the pixels behind it go down. */}
        <iframe
          ref={frame}
          title={CONTROL.panels.viewer}
          src="/stage/?viewer"
          className="block origin-top-left border-0"
          style={{
            width: size.width * pixels,
            height: size.height * pixels,
            background: 'white',
            ...(pixels < 1 ? { transform: `scale(${1 / pixels})` } : {}),
          }}
          tabIndex={-1}
          aria-hidden
          data-viewer-quality={quality}
        />
        {!ready ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <Text variant="studio-caption" tone="muted">
              {CONTROL.viewerLoading}
            </Text>
          </div>
        ) : null}
        {targets.map((t) => (
          <HitTarget
            key={t.id}
            x={t.x}
            y={t.y}
            width={t.width}
            height={t.height}
            label={t.label}
            legality={t.legal ? 'legal' : 'illegal'}
            reason={t.reason}
            isSelected={t.selected}
            onPress={() => press(t)}
          />
        ))}
        {placement === 'corner' && controls ? <div className="absolute right-1 top-1">{controls}</div> : null}
      </div>
      {placement !== 'corner' && controls ? (
        <div className={placement === 'beside' ? 'shrink-0' : 'w-full min-w-0'} style={placement === 'below' ? { maxWidth: size.width || undefined } : undefined}>
          {controls}
        </div>
      ) : null}
    </div>
  )
}

/**
 * Where the controls go, from the tile alone: under a frame that leaves a
 * band, beside one that leaves a column, else behind a corner button.
 */
export function controlsPlacement(width: number, height: number): 'below' | 'beside' | 'corner' {
  if (width <= 0 || height <= 0) return 'below'
  const fitH = (width * STAGE_FRAME.height) / STAGE_FRAME.width
  if (height - fitH >= BAND_MIN) return 'below'
  const fitW = (height * STAGE_FRAME.width) / STAGE_FRAME.height
  if (width - fitW >= COLUMN_MIN) return 'beside'
  return 'corner'
}

/** The operator half never crosses into the iframe (spec §5.7). */
function strip(play: PlayStateForMain): PlayStateForStage {
  const stage: Record<string, unknown> = { ...play }
  delete stage['operator']
  return stage as unknown as PlayStateForStage
}

interface Target {
  readonly id: string
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
  readonly label: string
  readonly legal: boolean
  readonly reason: string | null
  readonly selected: boolean
  readonly command: 'choose_domain' | 'set_selection' | 'reveal_stem' | 'reveal_outcome' | 'give_token' | 'reveal_and_pass' | 'reveal_leaderboard_rank'
  readonly args: Record<string, unknown> | undefined
  /** Pressed once, this arms; the next press runs `command` (beta.13). */
  readonly arm?: Arm | undefined
}

/** The node → command table of 05_STUDIO_DESIGN.md §10.2. */
function nodesToTargets(play: PlayStateForMain, nodes: readonly ViewerNodeRect[], scale: number, armed: Arm | null): Target[] {
  // The **live** session (`host/session.ts`), not `play.session`: a resolved
  // question stays in the projection so Stage can keep drawing it, and reading
  // it as "a question is in progress" is what left the operator with no legal
  // domain card for the rest of the Play.
  const session = play.session
  const live = liveSession(play)
  const canChoose = canChooseDomain(play)
  const playOpen = play.status === 'playing' || play.status === 'paused'
  const legalTargets = new Set(play.operator.legalTokenTargets)
  // The same sentence the Action Panel's rows carry, so a target reads the
  // same wherever the operator is looking.
  const roles = new Map(ringEntries(play).map((e) => [e.team.id, ringRole(play, e)]))
  const out: Target[] = []
  for (const n of nodes) {
    const parsed = parseNodeId(n.id)
    if (!parsed || parsed.slot === 'decor') continue
    const geom = { id: n.id, x: n.x * scale, y: n.y * scale, width: n.width * scale, height: n.height * scale }
    const slot = `${parsed.screen}.${parsed.slot}`
    if (slot === 'chooseDomain.card' && parsed.key) {
      const domain = play.domains.find((d) => d.id === parsed.key)
      if (!domain) continue
      const legal = !domain.exhausted && canChoose
      const reason = domain.exhausted ? SESSION.exhausted : play.status === 'paused' ? SESSION.pausedReason : live ? SESSION.revealFirst : null
      out.push({ ...geom, label: domain.name, legal, reason, selected: false, command: 'choose_domain', args: { domainId: domain.id } })
    } else if (slot === 'question.option' && parsed.key && session) {
      const option = session.options.find((o) => o.id === parsed.key)
      if (!option) continue
      const selected = session.selectedOptionIds.includes(option.id)
      const next = session.answerMode === 'multiple' ? (selected ? session.selectedOptionIds.filter((id) => id !== option.id) : [...session.selectedOptionIds, option.id]) : [option.id]
      // Live only while the Play is (beta.12, B13): a closed or unstarted Play is refused.
      // On the live question only (review): after an unlocked reveal the
      // resolved session still has no lock, and a press was refused.
      const legal = playOpen && live !== null && session.lockedOptionIds === null
      out.push({ ...geom, label: option.text, legal, reason: !playOpen ? null : legal ? null : TIMER.locked, selected, command: 'set_selection', args: { optionIds: next } })
    } else if (slot === 'question.stem' && session) {
      out.push({ ...geom, label: SESSION.revealStem, legal: playOpen && !session.reveals.stem, reason: null, selected: session.reveals.stem, command: 'reveal_stem', args: undefined })
    } else if (slot === 'question.result' && session) {
      // Before Lock the reveal scores as empty: it arms, as the button does (beta.13).
      const arm: Arm | undefined = session.outcome === null && session.lockedOptionIds === null && !session.timer?.expiredOpen ? { kind: 'reveal-unlocked' } : undefined
      const isArmed = arm !== undefined && sameArm(armed, arm)
      out.push({ ...geom, label: isArmed ? SESSION.revealUnlocked : SESSION.revealOutcome, legal: playOpen && session.outcome === null, reason: null, selected: session.outcome !== null || isArmed, command: 'reveal_outcome', args: undefined, arm })
    } else if ((slot === 'teamOrder.row' || slot === 'scoreboard.row') && parsed.key) {
      const team = play.teams.find((t) => t.id === parsed.key)
      if (!team) continue
      // A closed Play refuses `give_token` (`require_open`), so the row is not
      // a target once the board is empty — it would only refuse.
      // The Action Panel's rule (beta.13): a live question holds the hand-over
      // back — refused under `refuse_until_reveal`, *Reveal & pass* (armed)
      // under `allow` — and a pass after a correct answer confirms. Before,
      // this row offered a plain `give_token` the host refused.
      const role = roles.get(team.id)
      const refused = live !== null && play.operator.overrideAfterLock === 'refuse_until_reveal'
      const legal = playOpen && legalTargets.has(team.id) && play.operator.showGiveToken && !refused
      const resolvedHolder = live === null && play.ring.currentTeamId !== null
      const arm: Arm | undefined = !legal ? undefined : live !== null ? { kind: 'reveal-and-pass', teamId: team.id } : resolvedHolder ? { kind: 'pass', teamId: team.id } : undefined
      const isArmed = arm !== undefined && sameArm(armed, arm)
      const label = !legal
        ? `${team.name} — ${role ? RING_ROLE[role] : ''}`
        : isArmed
          ? live !== null
            ? live.lockedOptionIds === null && !live.timer?.expiredOpen
              ? SESSION.revealAndPassUnlocked(team.name)
              : SESSION.revealAndPassArmed(team.name)
            : SESSION.passArmed(team.name)
          : SESSION.giveTokenTo(team.name)
      const reason = legal ? null : refused && legalTargets.has(team.id) ? SESSION.revealFirst : role ? RING_ROLE[role] : null
      out.push({ ...geom, label, legal, reason, selected: play.ring.currentTeamId === team.id || isArmed, command: live !== null ? 'reveal_and_pass' : 'give_token', args: { teamId: team.id }, arm })
    } else if (slot === 'finalLeaderboard.row' && parsed.key) {
      // **The node key is the finishing position, not the rank** — two tied
      // teams are positions 1 and 2 sharing rank 1, and `LeaderboardList`
      // keys its cards by position so the ids stay distinct. The command
      // takes a rank, so read it off the team standing in that position;
      // sending the position would reveal a rank nobody holds.
      const team = leaderboard(play)[Number(parsed.key) - 1]
      if (!team) continue
      const revealed = play.leaderboardRevealedRanks.includes(team.rank)
      out.push({ ...geom, label: SESSION.leaderboardNext, legal: !revealed, reason: null, selected: revealed, command: 'reveal_leaderboard_rank', args: { rank: team.rank } })
    }
  }
  return out
}
