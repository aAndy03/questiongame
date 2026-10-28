import { Kbd, Text } from '@/atoms'
import { ACTION_WORD, GESTURES, type Gesture } from '@/copy/gestures'

export interface GestureBadgeProps {
  /** An id in `GESTURES`; an unknown id paints nothing. */
  id: string
}

/**
 * A gesture as it is done (beta.10): its keys as key caps, then the pointer
 * half in words — `Shift` + *click*, *drag*, `Esc`. Help and Settings ▸
 * Keyboard shortcuts both paint gestures with it.
 */
export function GestureBadge({ id }: GestureBadgeProps) {
  const gesture = GESTURES.find((g) => g.id === id)
  if (!gesture) return null
  const word = gesture.action ? ACTION_WORD[gesture.action] : ''
  return (
    <span className="inline-flex items-center gap-1 align-middle" data-gesture={id}>
      {gesture.keys.length > 0 ? <Kbd chord={gesture.keys.join('+')} variant="light" /> : null}
      {gesture.keys.length > 0 && word ? (
        <Text variant="studio-caption" tone="muted">
          +
        </Text>
      ) : null}
      {word ? (
        <Text variant="studio-caption" className="rounded bg-[var(--surface-secondary)] px-1.5 py-0.5 font-medium">
          {word}
        </Text>
      ) : null}
    </span>
  )
}

/** A gesture in words, for search and for a screen reader: *Shift + click*. */
export function gestureWords(gesture: Gesture): string {
  const word = gesture.action ? ACTION_WORD[gesture.action] : ''
  return [...gesture.keys, word].filter(Boolean).join(' + ')
}

/** Every fixed gesture: how it is done, what it does, where (Settings ▸ Keyboard shortcuts draws the same list). */
export function GestureList({ query }: { query?: string | undefined }) {
  return (
    <dl className="flex flex-col gap-3" data-help-gestures>
      {GESTURES.map((g) => (
        <div key={g.id} className="grid grid-cols-1 gap-1 sm:grid-cols-[12rem_minmax(0,1fr)] sm:gap-4">
          <dt className="flex items-start" aria-label={gestureWords(g)}>
            <GestureBadge id={g.id} />
          </dt>
          <dd className="flex flex-col">
            <Text variant="studio-body" highlight={query}>
              {g.does}
            </Text>
            <Text variant="studio-caption" tone="muted" highlight={query}>
              {g.where}
            </Text>
          </dd>
        </div>
      ))}
    </dl>
  )
}
