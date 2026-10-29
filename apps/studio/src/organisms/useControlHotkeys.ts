import { useEffect } from 'react'
import { useHotkeys, type RegisterableHotkeyChord } from '@tanstack/react-hotkeys'
import { STAGE_SCREENS } from '@questiongame/contract'
import { armOrConfirm, useArmStore } from '@/chrome/arm'
import { toast } from '@/chrome/toast'
import { SESSION } from '@/copy'
import { useChord } from '@/host/chords'
import { useHostCommand } from '@/host/commands'
import { usePlayState } from '@/host/playState'
import { canChooseDomain, liveSession } from '@/host/session'
import { tokenKey } from '@/host/token'
import { tipLearned } from '@/tips/signals'

/** A dialog is up: Enter, R and the digits belong to it, not to the show (beta.13). */
function dialogOpen(): boolean {
  return typeof document !== 'undefined' && document.querySelector('[role="dialog"], [role="alertdialog"]') !== null
}

/**
 * Chords → the same `run` the buttons and the Viewer call (05_STUDIO_DESIGN.md
 * §10.4). Mounted only by the Control page; `ignoreInputs` so a field keeps
 * its keys; never on Stage. The chords come from the host's shortcut table,
 * falling back to the defaults in copy until P10's Shortcuts tab writes them.
 */
export function useControlHotkeys(enabled: boolean): void {
  const play = usePlayState()
  const run = useHostCommand()
  const chord = useChord()
  const open = play !== null && (play.status === 'playing' || play.status === 'paused')
  // The live one: a resolved question is still in `play.session`, and the
  // number keys have to fall back to picking a domain once it is revealed.
  const session = liveSession(play)

  // Anything armed is let go the moment the Play moves on — the holder, the
  // question, the lock, the outcome or the status (spec §14: an arm is for
  // the state it was made in). Here, because Control mounts this once.
  const disarm = useArmStore((s) => s.disarm)
  useEffect(() => disarm(), [disarm, play?.ring.currentTeamId, play?.session?.questionId, play?.session?.lockedOptionIds, play?.session?.outcome, play?.status])

  const screenStep = (dir: -1 | 1) => {
    if (!play) return
    const i = STAGE_SCREENS.indexOf(play.currentScreen)
    const next = STAGE_SCREENS[(i + dir + STAGE_SCREENS.length) % STAGE_SCREENS.length]
    if (next) void run('show_screen', { screen: next })
  }

  const pick = (position: number) => {
    if (!play) return
    if (session) {
      const option = session.options[position - 1]
      if (!option || session.lockedOptionIds !== null) return
      const selected = session.selectedOptionIds.includes(option.id)
      const next = session.answerMode === 'multiple' ? (selected ? session.selectedOptionIds.filter((id) => id !== option.id) : [...session.selectedOptionIds, option.id]) : [option.id]
      void run('set_selection', { optionIds: next })
      return
    }
    const domain = play.domains[position - 1]
    if (domain && !domain.exhausted && canChooseDomain(play)) void run('choose_domain', { domainId: domain.id })
  }

  const definitions = [
    { hotkey: chord('start_timer'), callback: () => void run(session?.timer?.running ? 'pause_timer' : 'start_timer') },
    { hotkey: chord('lock_selection'), callback: () => void run('lock_selection') },
    {
      hotkey: chord('reveal_outcome'),
      // Before Lock the host scores the reveal as an empty answer: arm, as the
      // button does (beta.13). A clock that ran out reveals at once.
      callback: () => {
        if (session && session.lockedOptionIds === null && !session.timer?.expiredOpen && !armOrConfirm({ kind: 'reveal-unlocked' })) return
        void run('reveal_outcome')
      },
    },
    { hotkey: chord('reveal_stem'), callback: () => void run('reveal_stem') },
    { hotkey: chord('reveal_next_option'), callback: () => void run('reveal_next_option') },
    {
      hotkey: chord('give_token'),
      callback: () => {
        if (!play) return
        const action = tokenKey(play, useArmStore.getState().armed)
        if (action.kind === 'arm') useArmStore.getState().arm(action.arm)
        else if (action.kind === 'run') {
          useArmStore.getState().disarm()
          void run(action.command, { teamId: action.teamId })
        } else toast.info(SESSION.tokenKeyNothing[action.why])
      },
    },
    { hotkey: chord('undo_turn'), callback: () => void run('undo_turn') },
    { hotkey: chord('redo_turn'), callback: () => void run('redo_turn') },
    { hotkey: chord('screen_prev'), callback: () => screenStep(-1) },
    { hotkey: chord('screen_next'), callback: () => screenStep(1) },
    ...Array.from({ length: 9 }, (_, i) => ({ hotkey: String(i + 1), callback: () => pick(i + 1) })),
  ].filter((d) => d.hotkey !== '')

  useHotkeys(
    definitions.map((d) => ({
      hotkey: d.hotkey as RegisterableHotkeyChord,
      callback: () => {
        if (dialogOpen()) return
        tipLearned('control-keys')
        d.callback()
      },
    })),
    { enabled: enabled && open, ignoreInputs: true, preventDefault: true },
  )
}
