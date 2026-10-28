import { useMemo, useState } from 'react'
import { matchesSearch } from '@questiongame/text'
import { Kbd, Text } from '@/atoms'
import { GestureList, HelpFigure, HelpText, PageHeader, SearchField, SectionIndex, helpPlain } from '@/molecules'
import { SettingsLayout } from '@/templates'
import { HOTKEYS, TABS } from '@/copy'
import { GESTURES } from '@/copy/gestures'
import { HELP, HELP_COPY, type HelpBlock, type HelpSection, type HelpTopic } from '@/copy/help'
import { SETTINGS } from '@/copy/settings'
import { useSettings } from '@/host/queries'

/**
 * **Help** (beta.10): how the game plays and how Studio runs it, in plain
 * sections with *On this page* beside them, a search over every line, and
 * the keys and gestures drawn from the same registries Control and the lists
 * answer to — `HOTKEYS` with the operator's own chords, and `GESTURES` — so
 * the page cannot drift from the app. Opened from the sidebar or with F1.
 */
export function HelpPage() {
  const [query, setQuery] = useState('')
  const settings = useSettings()
  const overrides = settings.data?.globals.shortcuts
  const chord = (command: string) => overrides?.[command] ?? HOTKEYS.defaults[command] ?? ''

  const sections = useMemo(() => {
    if (!query.trim()) return HELP
    return HELP.map((s) => ({ ...s, topics: s.topics.filter((t) => matchesSearch(topicWords(s, t), query)) })).filter((s) => s.topics.length > 0)
  }, [query])

  return (
    <SettingsLayout
      header={<PageHeader title={TABS.help.label} toolbar={<SearchField what="help" onSearch={setQuery} className="max-w-sm" />} />}
      aside={sections.length > 0 ? <SectionIndex entries={sections.map((s) => ({ id: `help-${s.id}`, title: s.title }))} /> : undefined}
    >
      {sections.length === 0 ? (
        <Text as="p" variant="studio-body" tone="muted">
          {HELP_COPY.noResults(query.trim())}
        </Text>
      ) : (
        sections.map((s) => (
          <section key={s.id} id={`help-${s.id}`} aria-labelledby={`help-${s.id}-title`} className="flex scroll-mt-4 flex-col gap-4" data-help-section={s.id}>
            <div className="flex flex-col gap-1">
              <Text as="h2" id={`help-${s.id}-title`} variant="studio-title">
                {s.title}
              </Text>
              <Text as="p" variant="studio-body" tone="muted">
                {s.summary}
              </Text>
            </div>
            {s.topics.map((t) => (
              <article key={t.id} id={`help-${s.id}-${t.id}`} className="flex flex-col gap-3" data-help-topic={t.id}>
                <Text as="h3" variant="studio-heading" highlight={query}>
                  {t.title}
                </Text>
                {t.blocks.map((b, i) => (
                  <Block key={i} block={b} query={query} chord={chord} />
                ))}
              </article>
            ))}
          </section>
        ))
      )}
    </SettingsLayout>
  )
}

function Block({ block, query, chord }: { block: HelpBlock; query: string; chord: (command: string) => string }) {
  switch (block.kind) {
    case 'p':
      return (
        <p className="leading-relaxed">
          <HelpText text={block.text} highlight={query} />
        </p>
      )
    case 'note':
      return (
        <p className="rounded-[var(--radius)] border-l-2 border-[var(--accent)] bg-[var(--surface-secondary)] px-3 py-2 leading-relaxed" data-help-note>
          <HelpText text={block.text} highlight={query} />
        </p>
      )
    case 'steps':
    case 'list': {
      const List = block.kind === 'steps' ? 'ol' : 'ul'
      return (
        <List className={['flex flex-col gap-1.5 pl-5 leading-relaxed', block.kind === 'steps' ? 'list-decimal' : 'list-disc'].join(' ')}>
          {block.items.map((item, i) => (
            <li key={i} className="marker:text-[var(--muted)]">
              <HelpText text={item} highlight={query} />
            </li>
          ))}
        </List>
      )
    }
    case 'figure':
      return <HelpFigure figure={block.figure} caption={block.caption} />
    case 'shortcuts':
      return (
        <dl className="grid w-fit grid-cols-[minmax(0,18rem)_auto] items-center gap-x-10 gap-y-2" data-help-shortcuts>
          {Object.keys(HOTKEYS.defaults).map((command) => {
            const keys = chord(command)
            return (
              <div key={command} className="contents">
                <dt>
                  <Text variant="studio-body" highlight={query}>
                    {HOTKEYS.labels[command] ?? command}
                  </Text>
                </dt>
                <dd>{keys ? <Kbd chord={keys} variant="light" /> : <Text variant="studio-caption" tone="muted">{SETTINGS.shortcuts.none}</Text>}</dd>
              </div>
            )
          })}
          <div className="contents">
            <dt>
              <Text variant="studio-body" highlight={query}>
                {HOTKEYS.labels['pick'] ?? ''}
              </Text>
            </dt>
            <dd>
              <Text variant="studio-caption" tone="muted">
                {SETTINGS.shortcuts.positionalRange}
              </Text>
            </dd>
          </div>
        </dl>
      )
    case 'gestures':
      return <GestureList query={query} />
  }
}

/** Everything a topic says, as plain words, for the search. */
function topicWords(section: HelpSection, topic: HelpTopic): string {
  const words = [topic.title, section.title]
  for (const b of topic.blocks) {
    if (b.kind === 'p' || b.kind === 'note') words.push(helpPlain(b.text))
    else if (b.kind === 'steps' || b.kind === 'list') words.push(...b.items.map(helpPlain))
    else if (b.kind === 'figure') words.push(b.caption)
    else if (b.kind === 'shortcuts') words.push(...Object.values(HOTKEYS.labels))
    else words.push(...GESTURES.flatMap((g) => [g.does, g.where]))
  }
  return words.join(' \n ')
}
