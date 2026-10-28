import { useEffect, useId, useRef, useState } from 'react'
import { Button, Icon, IconButton, Panel, Text } from '@/atoms'
import { HelpFigure, HelpText, helpPlain } from '@/molecules'
import { TIPS_COPY, type Tip } from '@/copy/tips'
import { duration } from '@/tips/engine'

export interface TipCardProps {
  tip: Tip
  /** A dialog is over it: the clock holds (beta.11 review). */
  held?: boolean | undefined
  /** It stayed its time, or *More in Help* was pressed: read to the end. */
  onRead: () => void
  /** *Thanks* — the tip understood. */
  onGotIt: () => void
  /** × or Esc: *not now*. */
  onDismiss: () => void
  onMoreInHelp: () => void
}

/** Key caps, gesture badges and a figure each take a moment to look at. */
export function tipVisuals(tip: Tip): number {
  return (tip.body.match(/\{\{(key|gesture):/g)?.length ?? 0) + (tip.figure ? 1 : 0)
}

/** How long it stays, from its words and its visuals (`tips/engine.ts duration`). */
export function tipDuration(tip: Tip): number {
  const words = `${tip.title} ${helpPlain(tip.body)}`.split(/\s+/).filter(Boolean).length
  return duration(words, tipVisuals(tip))
}

/**
 * **A tip** (beta.11): Studio's `Panel` with a bulb, the title, Help's inline
 * text (key caps, gesture badges, labels) and maybe a figure, *More in Help*
 * and *Thanks*. **It never asks for attention** (§6.7): no backdrop, no
 * dimming, no focus taken — read out by `TipHost`'s live region, which the
 * operator may listen to or ignore. It stays for its reading time, paused while the pointer is over it
 * or focus is in it, with a thin line for the time left; × or Esc closes it
 * early, and Esc goes no further than the card.
 */
export function TipCard({ tip, held, onRead, onGotIt, onDismiss, onMoreInHelp }: TipCardProps) {
  const total = tipDuration(tip)
  const [left, setLeft] = useState(total)
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const paused = hovered || focused || held === true
  const done = useRef(false)
  const titleId = useId()
  const read = useRef(onRead)
  read.current = onRead

  useEffect(() => {
    if (paused) return
    const step = 100
    const id = setInterval(() => setLeft((l) => Math.max(0, l - step)), step)
    return () => clearInterval(id)
  }, [paused])

  useEffect(() => {
    if (left === 0 && !done.current) {
      done.current = true
      read.current()
    }
  }, [left])
  /** One way out: after Thanks, × or More in Help the timer can no longer read it out. */
  const once = (fn: () => void) => () => {
    if (done.current) return
    done.current = true
    fn()
  }

  return (
    <div
      role="group"
      aria-labelledby={titleId}
      className="w-[22rem] max-w-[calc(100vw-2rem)]"
      data-tip={tip.id}
      data-paused={paused || undefined}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocused(false)
      }}
      onKeyDown={(e) => {
        if (e.key !== 'Escape') return
        // The card's Esc is the card's: an editor or a list behind it keeps its own.
        e.stopPropagation()
        e.preventDefault()
        once(onDismiss)()
      }}
    >
      <Panel className="relative flex flex-col gap-3 overflow-hidden shadow-[var(--overlay-shadow)]">
        <div className="flex items-start gap-2.5">
          <span className="mt-0.5 shrink-0 text-[var(--accent)]">
            <Icon name="tip" size="sm" />
          </span>
          <Text as="h2" id={titleId} variant="studio-label" className="min-w-0 flex-1">
            {tip.title}
          </Text>
          <div className="-mr-2 -mt-1.5 shrink-0">
            <IconButton icon="close" size="sm" label={TIPS_COPY.dismiss} onPress={once(onDismiss)} />
          </div>
        </div>
        <p className="leading-relaxed">
          <HelpText text={tip.body} variant="studio-caption" />
        </p>
        {tip.figure ? <HelpFigure figure={tip.figure} caption={tip.title} hideCaption /> : null}
        <div className="flex items-center justify-end gap-2">
          <Button size="sm" variant="ghost" onPress={once(onMoreInHelp)}>
            {TIPS_COPY.moreInHelp}
          </Button>
          <Button size="sm" variant="secondary" onPress={once(onGotIt)}>
            {TIPS_COPY.gotIt}
          </Button>
        </div>
        {/* The time left: a hairline along the bottom edge, still while paused. */}
        <span aria-hidden className="absolute inset-x-0 bottom-0 h-0.5 bg-[var(--accent)] opacity-60" style={{ width: `${(left / total) * 100}%` }} data-tip-progress />
      </Panel>
    </div>
  )
}
