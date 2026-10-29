import type { OverlayKind, OverlayRequest } from '@questiongame/contract'
import { EmptyState, OverlayStrip, ScreenStrip } from '@/molecules'
import { CONTROL, STRIPS } from '@/copy'
import { useChord } from '@/host/chords'
import { useHostCommand } from '@/host/commands'
import { usePlayState } from '@/host/playState'

export interface StripsPanelProps {
  density: 'comfortable' | 'compact' | 'dense'
}

/** Screens and overlays, the operator's two hands on Stage (spec §5.5, §5.6). */
export function StripsPanel({ density }: StripsPanelProps) {
  const play = usePlayState()
  const run = useHostCommand()
  const chord = useChord()
  if (!play) return <EmptyState kind="empty" what={CONTROL.panels.strips.toLowerCase()} detail={CONTROL.noRecipeBody} compact />

  const overlayFor = (kind: OverlayKind): OverlayRequest => {
    switch (kind) {
      case 'token-handoff':
        return { kind, fromTeamId: null, toTeamId: play.ring.currentTeamId ?? play.ring.order[0] ?? '' }
      case 'round-advance':
        return { kind, roundIndex: play.ring.roundIndex }
      case 'multiple-answers':
        return { kind, optionIds: play.session?.selectedOptionIds ?? [] }
      case 'outcome':
        return { kind, verdict: play.session?.outcome?.verdict ?? 'incorrect' }
      case 'current-team':
        return { kind, teamId: play.ring.currentTeamId }
    }
  }

  // An overlay drawn from nothing says something untrue on Stage — "Correct"
  // before any reveal, a hand-off to whoever is first in the ring — so it is
  // off, with the reason, until there is something to draw (beta.13).
  const holder = play.ring.currentTeamId
  const reasons: Partial<Record<OverlayKind, string | null>> = {
    'token-handoff': holder === null ? STRIPS.noHolder : null,
    'current-team': holder === null ? STRIPS.noHolder : null,
    outcome: play.session?.outcome ? null : STRIPS.noOutcome,
    'multiple-answers': (play.session?.selectedOptionIds.length ?? 0) > 0 ? null : STRIPS.noSelection,
  }

  return (
    <div className="flex flex-col gap-4" data-strips-panel>
      <ScreenStrip
        current={play.currentScreen}
        overlayBusy={play.overlay.busy}
        density={density}
        keys={{ prev: chord('screen_prev'), next: chord('screen_next') }}
        onShow={(screen) => void run('show_screen', { screen })}
      />
      <OverlayStrip
        active={play.overlay.active}
        pending={play.overlay.pending}
        enabled={play.overlay.enabled}
        reasons={reasons}
        density={density}
        onShow={(kind) => void run('show_overlay', { overlay: overlayFor(kind) })}
      />
    </div>
  )
}
