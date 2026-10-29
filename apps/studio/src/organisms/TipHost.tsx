import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { tipsOf, useChromeStore, useTipsPrefs } from '@/chrome/chrome'
import { useNavStore, useRoute } from '@/chrome/nav'
import { TIPS, TIPS_COPY, type Tip } from '@/copy/tips'
import { onCommandDone } from '@/host/host'
import { usePlayState, usePlayStateKnown } from '@/host/playState'
import { useSettings } from '@/host/queries'
import { HotkeyChords } from '@/molecules'
import { MOMENTS, dismiss, learn, mayShow, pick, shown, touchDay, type Moment } from '@/tips/engine'
import { onTipMoment, tipLearned, tipMoment, tipsClock } from '@/tips/signals'
import { momentOf, skillOf } from '@/tips/skills'
import { TipCard } from './TipCard'

/** A toast in the corner a tip would take (Sonner, bottom right). */
function toastUp(): boolean {
  return typeof document !== 'undefined' && document.querySelector('[data-sonner-toast]') !== null
}

/** How long a moment waits for a toast to go before its tip is decided (a toast lasts 3.5 s). */
const AFTER_TOAST_MS = 4_000

/** Is a dialog up? A tip waits for it to close (§6.7: nothing competes with what the operator is doing). */
function dialogOpen(): boolean {
  return typeof document !== 'undefined' && document.querySelector('[role="dialog"], [role="alertdialog"]') !== null
}

/**
 * Whether a dialog is up, kept current (review): a dialog that opens **after**
 * a tip — *What's new* on the first launch of a version — must hold the tip's
 * clock, or it runs out unseen behind the dialog and counts as read.
 */
function useDialogUp(): boolean {
  const [up, setUp] = useState(dialogOpen)
  useEffect(() => {
    if (typeof MutationObserver === 'undefined') return
    const observer = new MutationObserver(() => setUp(dialogOpen()))
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['role'] })
    return () => observer.disconnect()
  }, [])
  return up
}

/**
 * **Where tips appear** (beta.11): Studio's main window only — never Stage,
 * never the Statistics window. It hears every moment (`tips/signals.ts`) and
 * every tab arrived on, asks the engine whether one earns a tip, and shows at
 * most one, bottom right above the status bar, without a backdrop.
 *
 * Silent while a Play is playing or paused (unless it is a rehearsal), while
 * a dialog is open (a tip already up holds its clock), with *Show tips* off,
 * and until the first `play-state` has said whether a show is on: a restart
 * mid-show must not open on a tip. A moment that meets a toast in the corner
 * waits for it once, and is dropped if the operator has moved on meanwhile.
 */
export function TipHost() {
  const route = useRoute()
  const go = useNavStore((s) => s.go)
  const updateTips = useChromeStore((s) => s.updateTips)
  const operatorId = useChromeStore((s) => s.operatorId)
  const { showTips } = useTipsPrefs()
  const known = usePlayStateKnown()
  const playOpen = usePlayState((p) => p?.status === 'playing' || p?.status === 'paused')
  const rehearsal = usePlayState((p) => p?.operator.isRehearsal ?? false)
  const dialogUp = useDialogUp()
  const settings = useSettings()
  const settled = settings.data !== undefined
  const [current, setCurrent] = useState<Tip | null>(null)
  // The tip being shown, set the moment it is chosen: React state would let a
  // second moment in the same commit pick (and record) a tip nobody sees.
  const showing = useRef<Tip | null>(null)

  // The decision reads the latest of everything without re-subscribing.
  const latest = useRef({ showTips, known, playOpen, rehearsal, tab: route.tab })
  latest.current = { showTips, known, playOpen, rehearsal, tab: route.tab }

  useEffect(() => {
    const waiting = new Set<ReturnType<typeof setTimeout>>()
    const consider = (moment: Moment, waitedOn?: string) => {
      const l = latest.current
      if (showing.current !== null || !l.known) return
      if (waitedOn !== undefined && waitedOn !== l.tab) return
      if (!mayShow({ tipsOn: l.showTips, playOpen: l.playOpen, rehearsal: l.rehearsal, dialogOpen: dialogOpen() })) return
      // Saving a question toasts in the same corner: the tip waits its turn
      // instead of being covered (review). Once — a moment does not queue.
      if (toastUp() && waitedOn === undefined) {
        const id = setTimeout(() => {
          waiting.delete(id)
          consider(moment, l.tab)
        }, AFTER_TOAST_MS)
        waiting.add(id)
        return
      }
      const now = tipsClock()
      const state = touchDay(tipsOf(useChromeStore.getState().prefs[useChromeStore.getState().operatorId]), now)
      const rule = pick(state, TIPS, moment, now, Math.random)
      const tip = rule ? (TIPS.find((t) => t.id === rule.id) ?? null) : null
      if (!tip) return
      showing.current = tip
      updateTips((s) => shown(touchDay(s, now), tip, now))
      setCurrent(tip)
    }
    const off = onTipMoment((moment) => consider(moment))
    return () => {
      off()
      for (const id of waiting) clearTimeout(id)
    }
  }, [updateTips])

  // What the host accepted teaches, and may be a moment (`tips/skills.ts`).
  useEffect(
    () =>
      onCommandDone((name, args) => {
        const skill = skillOf(name, args)
        if (skill) tipLearned(skill)
        const moment = momentOf(name, args)
        if (moment) tipMoment(moment)
      }),
    [],
  )

  // A day Studio is used counts as experience, tips on or off (review).
  useEffect(() => {
    if (settled) updateTips((s) => touchDay(s, tipsClock()))
  }, [settled, operatorId, updateTips])

  // A rehearsal under way is a moment of its own, and the skill it teaches.
  useEffect(() => {
    if (playOpen && rehearsal) {
      tipLearned('rehearsal')
      tipMoment('control:rehearsal')
    }
  }, [playOpen, rehearsal])

  // The first launch: once the show state and the operator are known, and
  // again whenever a dialog closes (*What's new* opens first on an update) —
  // the engine says no to anyone it already showed.
  useEffect(() => {
    if (known && settled && !dialogUp) tipMoment('first-launch')
  }, [known, settled, dialogUp, operatorId])

  // Arriving on a tab is a moment — after the first launch's, which comes first.
  useEffect(() => {
    const moment = `route:${route.tab}` as Moment
    if (MOMENTS.includes(moment)) tipMoment(moment)
  }, [route.tab])

  // A show starting takes the tip down with it.
  useEffect(() => {
    if (playOpen && !rehearsal) {
      showing.current = null
      setCurrent(null)
    }
  }, [playOpen, rehearsal])

  // On Control and Screens the right-hand column is where the work is (the
  // Action Panel, the Inspector): the tip stands at the main column's left
  // instead, and on Control above the Timeline strip (beta.13).
  const [corner, setCorner] = useState<{ left: number; bottom: number } | null>(null)
  useEffect(() => {
    if (route.tab !== 'control' && route.tab !== 'screens') {
      setCorner(null)
      return
    }
    const place = () => {
      const main = document.querySelector('main')
      const strip = document.querySelector('[data-timeline-strip]')
      if (!main) return setCorner(null)
      const edge = Math.min(strip?.getBoundingClientRect().top ?? main.getBoundingClientRect().bottom, window.innerHeight)
      const bottom = Math.max(12, window.innerHeight - edge + 12)
      setCorner({ left: main.getBoundingClientRect().left + 16, bottom })
    }
    place()
    window.addEventListener('resize', place)
    return () => window.removeEventListener('resize', place)
  }, [route.tab, current])

  const still = useReducedMotion()
  /** Each close counts once: the card's timer may fire during the exit animation. */
  const close = (tip: Tip, step: (now: number) => void) => {
    if (showing.current !== tip) return
    showing.current = null
    step(tipsClock())
    setCurrent(null)
  }

  return (
    // The live region is here and always mounted, so a tip put into it is
    // read out (a region that arrives already filled is not, review).
    <div
      role="status"
      aria-live="polite"
      aria-label={TIPS_COPY.region}
      className={['pointer-events-none fixed z-40 flex flex-col', corner ? 'items-start' : 'bottom-10 right-4 items-end'].join(' ')}
      style={corner ? { left: corner.left, bottom: corner.bottom } : undefined}
      data-tip-host
    >
      <AnimatePresence>
        {current ? (
          <motion.div
            key={current.id}
            className="pointer-events-auto"
            initial={{ opacity: 0, y: still ? 0 : 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: still ? 0 : 8 }}
            transition={{ duration: 0.16, ease: [0.2, 0, 0, 1] }}
          >
            <HotkeyChords.Provider value={settings.data?.globals.shortcuts ?? {}}>
            <TipCard
              tip={current}
              held={dialogUp}
              onRead={() => close(current, (now) => updateTips((s) => learn(s, current.skill, 'read', now)))}
              onGotIt={() => close(current, (now) => updateTips((s) => learn(s, current.skill, 'gotIt', now)))}
              onDismiss={() => close(current, (now) => updateTips((s) => dismiss(s, current.id, now)))}
              onMoreInHelp={() =>
                close(current, (now) => {
                  updateTips((s) => learn(s, current.skill, 'read', now))
                  void go({ tab: 'help', section: current.help.section, topic: current.help.topic })
                })
              }
            />
            </HotkeyChords.Provider>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
