import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useChromeStore, useTipsPrefs } from '@/chrome/chrome'
import { useNavStore, useRoute } from '@/chrome/nav'
import { TIPS, type Tip } from '@/copy/tips'
import { onCommandDone } from '@/host/host'
import { usePlayState, usePlayStateKnown } from '@/host/playState'
import { useSettings } from '@/host/queries'
import { MOMENTS, dismiss, learn, mayShow, pick, shown, touchDay, type Moment } from '@/tips/engine'
import { onTipMoment, tipLearned, tipMoment, tipsClock } from '@/tips/signals'
import { momentOf, skillOf } from '@/tips/skills'
import { TipCard } from './TipCard'

/** Is a dialog up? A tip waits for it to close (§6.7: nothing competes with what the operator is doing). */
function dialogOpen(): boolean {
  return typeof document !== 'undefined' && document.querySelector('[role="dialog"], [role="alertdialog"]') !== null
}

/**
 * **Where tips appear** (beta.11): Studio's main window only — never Stage,
 * never the Statistics window. It hears every moment (`tips/signals.ts`) and
 * every tab arrived on, asks the engine whether one earns a tip, and shows at
 * most one, bottom right above the status bar, without a backdrop.
 *
 * Silent while a Play is playing or paused (unless it is a rehearsal — one
 * team), while a dialog is open, with *Show tips* off, and until the first
 * `play-state` has said whether a show is on: a restart mid-show must not
 * open on a tip (review focus).
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
  const [current, setCurrent] = useState<Tip | null>(null)

  // The decision reads the latest of everything without re-subscribing.
  const latest = useRef({ showTips, known, playOpen, rehearsal, current })
  latest.current = { showTips, known, playOpen, rehearsal, current }

  useEffect(() => {
    const consider = (moment: Moment) => {
      const l = latest.current
      if (l.current !== null || !l.known) return
      if (!mayShow({ tipsOn: l.showTips, playOpen: l.playOpen, rehearsal: l.rehearsal, dialogOpen: dialogOpen() })) return
      const now = tipsClock()
      let chosen: Tip | null = null
      updateTips((state) => {
        const today = touchDay(state, now)
        const rule = pick(today, TIPS, moment, now, Math.random)
        chosen = rule ? (TIPS.find((t) => t.id === rule.id) ?? null) : null
        return chosen ? shown(today, chosen, now) : today
      })
      if (chosen) setCurrent(chosen)
    }
    return onTipMoment(consider)
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

  // A rehearsal under way is a moment of its own, and the skill it teaches.
  useEffect(() => {
    if (playOpen && rehearsal) {
      tipLearned('rehearsal')
      tipMoment('control:rehearsal')
    }
  }, [playOpen, rehearsal])

  // Arriving on a tab is a moment; so is the first launch, once the show state is known.
  useEffect(() => {
    const moment = `route:${route.tab}` as Moment
    if (MOMENTS.includes(moment)) tipMoment(moment)
  }, [route.tab])
  // Settings loaded is the operator known: the memory asked is theirs, and an
  // operator switched to is asked again (the engine says no to anyone it showed).
  const settled = useSettings().data !== undefined
  useEffect(() => {
    if (known && settled) tipMoment('first-launch')
  }, [known, settled, operatorId])

  // A show starting takes the tip down with it.
  useEffect(() => {
    if (playOpen && !rehearsal) setCurrent(null)
  }, [playOpen, rehearsal])

  const close = (step: (now: number, tip: Tip) => void) => {
    const tip = current
    if (!tip) return
    step(tipsClock(), tip)
    setCurrent(null)
  }

  return (
    <div className="pointer-events-none fixed bottom-10 right-4 z-40 flex flex-col items-end" data-tip-host>
      <AnimatePresence>
        {current ? (
          <motion.div
            key={current.id}
            className="pointer-events-auto"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.16, ease: [0.2, 0, 0, 1] }}
          >
            <TipCard
              tip={current}
              onRead={() => close((now, tip) => updateTips((s) => learn(s, tip.skill, 'read', now)))}
              onGotIt={() => close((now, tip) => updateTips((s) => learn(s, tip.skill, 'gotIt', now)))}
              onDismiss={() => close((now, tip) => updateTips((s) => dismiss(s, tip.id, now)))}
              onMoreInHelp={() =>
                close((now, tip) => {
                  updateTips((s) => learn(s, tip.skill, 'read', now))
                  void go({ tab: 'help', section: tip.help.section, topic: tip.help.topic })
                })
              }
            />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
