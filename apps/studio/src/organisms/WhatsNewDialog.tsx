import { useState } from 'react'
import { Modal } from '@heroui/react'
import { Button, MeaningChip, SegmentedField, Text } from '@/atoms'
import { useWhatsNewStore } from '@/chrome/whatsNew'
import {
  compareVersions,
  WHATS_NEW,
  WHATS_NEW_COPY,
  WHATS_NEW_LANGUAGE_NAME,
  WHATS_NEW_LANGUAGES,
  type WhatsNewLanguage,
} from '@/copy/whatsNew'
import { useHostCommand } from '@/host/commands'
import { useSettings } from '@/host/queries'

/**
 * *What's new* (P12.10; every release since beta.9): what changed for the
 * operator, in plain words, in either language the app speaks. Opens itself
 * once after an update and from Settings ▸ About; closing the first records it
 * as seen.
 *
 * It holds **every release up to this build**, stable and beta, newest first:
 * the versions on the left — the ones this update brought marked *New* — and
 * the chosen one's notes beside them, the newest chosen when it opens.
 *
 * The language starts as the one new games are made in — the operator's own,
 * most likely — and the switch changes only this window.
 */
export function WhatsNewDialog() {
  const open = useWhatsNewStore((s) => s.open)
  const close = useWhatsNewStore((s) => s.close)
  const settings = useSettings()
  const run = useHostCommand()
  const [chosen, setChosen] = useState<WhatsNewLanguage | null>(null)
  const [picked, setPicked] = useState<string | null>(null)
  const language: WhatsNewLanguage = chosen ?? settings.data?.globals.game_defaults.language ?? 'en'
  const copy = WHATS_NEW_COPY[language]

  const done = () => {
    if (open?.markSeen) void run('whats_new_seen')
    setPicked(null)
    close()
  }

  if (!open || open.releases.length === 0) return null
  const newest = open.releases[0]!
  // Every release up to the one it opened with — never one this build has not
  // reached, never one that was not published, and on a stable build no beta
  // (a stable user is never shown a beta's notes, as `notesAfter`).
  const stable = !newest.version.includes('-')
  const releases = WHATS_NEW.filter((r) => compareVersions(r.version, newest.version) <= 0 && !r.unreleased && (!stable || !r.version.includes('-'))).sort((a, b) =>
    compareVersions(b.version, a.version),
  )
  const fresh = new Set(open.markSeen ? open.releases.map((r) => r.version) : [])
  const shown = releases.find((r) => r.version === (picked ?? newest.version)) ?? newest

  return (
    <Modal.Backdrop isOpen onOpenChange={(isOpen) => !isOpen && done()}>
      <Modal.Container size="lg">
        <Modal.Dialog aria-label={WHATS_NEW_COPY.en.title(newest.version)} className="h-[min(40rem,calc(100vh-4rem))] w-full max-w-[min(56rem,calc(100vw-4rem))]">
          <Modal.CloseTrigger />
          <Modal.Header className="flex flex-row flex-wrap items-center gap-x-4 gap-y-2 pr-10">
            <Modal.Heading>{copy.title(shown.version)}</Modal.Heading>
            <SegmentedField
              label={copy.language}
              hideLabel
              value={language}
              onChange={setChosen}
              options={WHATS_NEW_LANGUAGES.map((value) => ({ value, label: WHATS_NEW_LANGUAGE_NAME[value] }))}
              size="sm"
            />
          </Modal.Header>
          <Modal.Body className="@container/whatsnew flex min-h-0 flex-1 overflow-hidden">
            <div className="grid min-h-0 w-full flex-1 grid-cols-1 gap-6 @[36rem]/whatsnew:grid-cols-[11rem_minmax(0,1fr)]">
              {/* Every release, newest first; space, not rules, between the panes (beta.9). */}
              {/* Buttons, the chosen one `aria-current`: a list to pick from, one Tab stop each, named in full. */}
              <nav aria-label={copy.releases} className="hidden min-h-0 flex-col gap-0.5 overflow-y-auto @[36rem]/whatsnew:flex" data-whats-new-releases>
                {releases.map((r) => {
                  const current = r.version === shown.version
                  return (
                    <button
                      key={r.version}
                      type="button"
                      aria-current={current ? 'true' : undefined}
                      aria-label={copy.option(r.version, fresh.has(r.version))}
                      onClick={() => setPicked(r.version)}
                      className={[
                        'flex min-h-8 items-center justify-between gap-2 rounded-[calc(var(--radius)/1.5)] px-2 py-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]',
                        current ? 'bg-[var(--accent)]/12' : 'hover:bg-[var(--surface-secondary)]',
                      ].join(' ')}
                    >
                      <Text variant="studio-label" tone={current ? 'accent' : 'default'} tabular>
                        {r.version}
                      </Text>
                      {fresh.has(r.version) ? <MeaningChip meaning="fresh">{copy.fresh}</MeaningChip> : r.version.includes('-') ? <MeaningChip meaning="beta">{copy.beta}</MeaningChip> : null}
                    </button>
                  )
                })}
              </nav>
              {/* Keyed by release: another opens at its top, not where the last was scrolled to. */}
              <section key={shown.version} className="flex min-h-0 flex-col gap-4 overflow-y-auto" aria-label={shown.version} data-whats-new-notes>
                <ul className="flex flex-col gap-4">
                  {shown.notes[language].map((note) => (
                    <li key={note.title} className="flex flex-col gap-1">
                      <Text as="div" variant="studio-heading">
                        {note.title}
                      </Text>
                      <Text as="div" variant="studio-body" tone="muted">
                        {note.body}
                      </Text>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="primary" onPress={done}>
              {copy.close}
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  )
}
