import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Tabs } from '@heroui/react'
import { useDebouncedCallback } from '@tanstack/react-pacer'
import {
  DEFAULT_DECOR_SETTINGS,
  SCREEN_SLOTS,
  applyToAllScreens,
  layoutNodes,
  parseLayout,
  parseNodeId,
  type NodeStyle,
  type ScreenBox,
  type StageDecorSettings,
  textKeysForNode,
  type StageLanguage,
  type StageLayout,
  type StageScreen,
  type TextKey,
  type ViewerDecorBox,
  type ViewerNodeRect,
} from '@questiongame/contract'
import { Button, IconButton, MeaningChip, Panel, SegmentedField, Skeleton, StatusDot, SwitchField, Text, Tooltip, TransportButton } from '@/atoms'
import { ConfirmDialog, DecorDials, NodeInspector, NodeTitle, ScreenTabs, TextInspector, canvasOverlay, type CanvasView } from '@/molecules'
import { toast } from '@/chrome/toast'
import { SCREENS, SCREENS_TAB } from '@/copy'
import { useHostCommand } from '@/host/commands'
import { nodeName, nodeScope } from '@/host/nodeName'
import { usePlayState } from '@/host/playState'
import { previewOverlay, previewPlay } from '@/host/previewPlay'
import { useCatalogList, useRecipe, useSettings } from '@/host/queries'
import { tipLearned } from '@/tips/signals'
import { ScreensCanvas } from './ScreensCanvas'

export interface LayoutEditorProps {
  recipeId: string
  /** Slots the page composes around the editor. */
  /** `status` is the save state, drawn beside the game picker so it takes no row of its own (beta.9). */
  render: (parts: { toolbar: React.ReactNode; status: React.ReactNode; canvas: React.ReactNode; inspector: React.ReactNode }) => React.ReactNode
}

/** Screens with no decor shapes of their own (no manifest in `apps/stage/src/decor`). */
const NO_DECOR: ReadonlySet<StageScreen> = new Set(['currentTeam'])
/** How many edits Undo can walk back, this visit. */
const HISTORY = 100

/** The text keys any element on a screen edits, so a screen's count includes its words. */
function textKeysOnScreen(screen: StageScreen): readonly TextKey[] {
  const keys = new Set<TextKey>()
  for (const [slot, kind] of Object.entries(SCREEN_SLOTS[screen] as Record<string, string>)) {
    for (const k of textKeysForNode(kind === 'static' ? `${screen}.${slot}` : `${screen}.${slot}.x`)) keys.add(k)
  }
  return [...keys]
}

/**
 * The Screens workshop's state: the recipe's layout as a draft, one node
 * selected, every change debounced 400ms into one `recipe_set_layout` and
 * one `rev` (spec §2.10). Leaving mid-debounce flushes.
 *
 * beta.13: Undo and Redo over this visit's edits (Ctrl+Z, Ctrl+Shift+Z); a
 * save state that is honest from the first keystroke, with Retry; the
 * Inspector and the Decor dials as tabs; what Stage measured — each
 * element's words and size, the decor box — fed to the fields that edit them.
 */
export function LayoutEditor({ recipeId, render }: LayoutEditorProps) {
  const recipe = useRecipe(recipeId)
  const teams = useCatalogList('team', 'all')
  const domains = useCatalogList('domain', 'all')
  const questions = useCatalogList('question', 'all')
  const run = useHostCommand()
  const inControl = usePlayState((p) => p?.operator.recipeId === recipeId)
  const settings = useSettings()

  const [view, setView] = useState<CanvasView>('idle')
  // The screen the canvas draws — under an overlay, the last screen picked.
  const [screen, setScreen] = useState<StageScreen>('idle')
  const overlay = canvasOverlay(view)
  const [selected, setSelected] = useState<string | null>(null)
  const [draft, setDraft] = useState<StageLayout | null>(null)
  const [saving, setSaving] = useState(false)
  // An edit waiting out the debounce is not saved yet (beta.13): the state
  // said "Saved" for the 400 ms before the save began.
  const [pending, setPending] = useState(false)
  // A save the host refused (beta.12, B8): said, not shown as Saved.
  const [failed, setFailed] = useState(false)
  const [resetting, setResetting] = useState<'screen' | 'all' | null>(null)
  const [aside, setAside] = useState<'inspector' | 'decor'>('inspector')
  const [motion, setMotion] = useState(true)
  const [measured, setMeasured] = useState<{ nodes: ReadonlyMap<string, ViewerNodeRect>; decor: ViewerDecorBox | null }>({ nodes: new Map(), decor: null })
  const [history, setHistory] = useState<{ past: StageLayout[]; future: StageLayout[] }>({ past: [], future: [] })
  const recipeLanguage: StageLanguage = recipe.data?.settings.language ?? 'en'
  const [language, setLanguage] = useState<StageLanguage | null>(null)
  const editLanguage = language ?? recipeLanguage
  const dirty = useRef(false)

  // Adopt the recipe's document once per recipe (and after our own save lands
  // as a new rev, which parses to the same draft).
  // A saved draft that parses to the same document is kept as typed (review):
  // the stored words are trimmed, so adopting them took the space just typed.
  useEffect(() => {
    if (!recipe.data || dirty.current) return
    const stored = parseLayout(recipe.data.layout)
    setDraft((d) => (d !== null && JSON.stringify(parseLayout(d)) === JSON.stringify(stored) ? d : stored))
  }, [recipe.data])

  const latest = useRef<StageLayout | null>(null)
  const save = useCallback(
    async (layout: StageLayout) => {
      setSaving(true)
      setPending(false)
      const ok = await run('recipe_set_layout', { id: recipeId, layout })
      // Clean only if nothing was edited while this save was in flight: an
      // edit made meanwhile is still to save (beta.12, B8).
      if (ok !== null && latest.current === layout) dirty.current = false
      setFailed(ok === null)
      setSaving(false)
    },
    [recipeId, run],
  )
  const debouncedSave = useDebouncedCallback((layout: StageLayout) => void save(layout), { wait: 400 })
  useEffect(
    () => () => {
      if (dirty.current && latest.current) void save(latest.current)
    },
    [save],
  )

  const layout = draft ?? parseLayout(recipe.data?.layout)

  /** Every edit, and Undo/Redo, land here: one draft, one debounced save. */
  const commit = (next: StageLayout) => {
    dirty.current = true
    latest.current = next
    setDraft(next)
    setPending(true)
    debouncedSave(next)
  }
  // One Undo step per gesture (review): a slider drag or a held arrow key is
  // many edits of one thing, so edits with the same key inside a second share
  // the step taken before the first of them. An edit that changes nothing is
  // no step and no save.
  const lastEdit = useRef<{ key: string; at: number } | null>(null)
  const update = (next: StageLayout, key?: string) => {
    if (JSON.stringify(next) === JSON.stringify(layout)) return
    const now = Date.now()
    const same = key !== undefined && lastEdit.current?.key === key && now - lastEdit.current.at < 1_000
    lastEdit.current = key === undefined ? null : { key, at: now }
    if (!same) setHistory((h) => ({ past: [...h.past, layout].slice(-HISTORY), future: [] }))
    commit(next)
  }
  const undo = () => {
    const prev = history.past[history.past.length - 1]
    if (!prev) return
    lastEdit.current = null
    setHistory((h) => ({ past: h.past.slice(0, -1), future: [layout, ...h.future] }))
    commit(prev)
  }
  const redo = () => {
    const next = history.future[0]
    if (!next) return
    lastEdit.current = null
    setHistory((h) => ({ past: [...h.past, layout], future: h.future.slice(1) }))
    commit(next)
  }
  // Ctrl+Z / Ctrl+Shift+Z (and Ctrl+Y), unless a field has the keys.
  const keys = useRef({ undo, redo })
  keys.current = { undo, redo }
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey) return
      const t = e.target
      if (t instanceof Element && t.closest('input, textarea, [contenteditable="true"], [role="dialog"], [role="alertdialog"]')) return
      const k = e.key.toLowerCase()
      if (k === 'z' && !e.shiftKey) keys.current.undo()
      else if ((k === 'z' && e.shiftKey) || k === 'y') keys.current.redo()
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const setNode = (id: string, style: NodeStyle | null, key: string = `node:${id}`) => {
    const nodes = { ...layout.nodes }
    if (style === null) delete nodes[id]
    else nodes[id] = style
    update({ ...layout, nodes }, key)
  }
  const nudge = (id: string, dx: number, dy: number) => {
    const s = layout.nodes[id] ?? {}
    setNode(id, { ...s, dx: (s.dx ?? 0) + dx, dy: (s.dy ?? 0) + dy }, `nudge:${id}`)
  }
  const setDecor = (decor: StageDecorSettings) => update({ ...layout, decor }, 'decor')
  // The words being edited are the language picked here (beta.13): the game's
  // own unless the operator switches, which changes nothing on the game.
  const textValues = layout.text[editLanguage] ?? {}
  const setText = (key: TextKey, value: string | null) => {
    const block = { ...textValues }
    if (value === null) delete block[key]
    else block[key] = value
    const text = { ...layout.text }
    if (Object.keys(block).length === 0) delete text[editLanguage]
    else text[editLanguage] = block
    update({ ...layout, text }, `text:${editLanguage}:${key}`)
  }
  const setBox = (box: ScreenBox | undefined) => {
    const screens = { ...layout.screens }
    if (box === undefined) delete screens[screen]
    else screens[screen] = box
    update({ ...layout, screens }, `box:${screen}`)
  }

  const sources = useMemo(
    () => (recipe.data ? { recipe: recipe.data, teams: teams.data ?? [], domains: domains.data ?? [], questions: questions.data ?? [] } : null),
    [recipe.data, teams.data, domains.data, questions.data],
  )
  const globalsTimer = settings.data?.globals.timer
  const preview = useMemo(() => {
    if (!sources) return null
    const look = { decor: layout.decor, motion: motion ? ('full' as const) : ('reduced' as const), language: editLanguage, globalTimer: globalsTimer }
    return overlay ? previewOverlay(sources, overlay, screen, layoutNodes(layout), look) : previewPlay(sources, screen, layoutNodes(layout), look)
  }, [sources, screen, overlay, layout, motion, editLanguage, globalsTimer])
  const overridden = useMemo(() => {
    const ids = new Set(Object.keys(layout.nodes))
    // An element whose words were edited counts as changed too (beta.13).
    const edited = new Set(Object.keys(textValues))
    for (const id of measured.nodes.keys()) if (textKeysForNode(id).some((k) => edited.has(k))) ids.add(id)
    return ids
  }, [layout.nodes, textValues, measured.nodes])
  const hidden = useMemo(() => new Set(Object.entries(layout.nodes).filter(([, s]) => s.hidden).map(([id]) => id)), [layout.nodes])
  // One count per screen, everywhere (beta.13): its elements, its decor box,
  // and the words its elements carry in the language being edited.
  const counts = useMemo(() => {
    const out: Partial<Record<StageScreen, number>> = {}
    for (const id of Object.keys(layout.nodes)) {
      const s = parseNodeId(id)?.screen
      if (s) out[s] = (out[s] ?? 0) + 1
    }
    for (const s of Object.keys(layout.screens) as StageScreen[]) out[s] = (out[s] ?? 0) + 1
    for (const s of Object.keys(SCREEN_SLOTS) as StageScreen[]) {
      const words = textKeysOnScreen(s).filter((k) => textValues[k] !== undefined).length
      if (words > 0) out[s] = (out[s] ?? 0) + words
    }
    return out
  }, [layout.nodes, layout.screens, textValues])

  const onMeasured = useCallback((nodes: readonly ViewerNodeRect[], decor: ViewerDecorBox | null) => {
    setMeasured({ nodes: new Map(nodes.map((n) => [n.id, n])), decor })
  }, [])
  // What Stage measured belongs to the picture it measured (review): a new
  // screen or overlay starts with nothing, until Stage posts again.
  useEffect(() => setMeasured({ nodes: new Map(), decor: null }), [screen, overlay])

  const toolbar = (
    <ScreenTabs
      value={view}
      screen={screen}
      onChange={(v) => {
        setView(v)
        if (!canvasOverlay(v)) setScreen(v as StageScreen)
        setSelected(null)
      }}
      counts={counts}
    />
  )
  const busy = saving || pending
  const status = (
    <span className="flex shrink-0 items-center gap-2" data-save-state={busy ? 'saving' : failed ? 'failed' : 'saved'}>
      {inControl ? (
        <Tooltip content={SCREENS_TAB.liveHint}>
          <span className="inline-flex" data-live-on-stage>
            <MeaningChip meaning="stage">{SCREENS_TAB.live}</MeaningChip>
          </span>
        </Tooltip>
      ) : null}
      <TransportButton size="sm" icon="undo" label={SCREENS_TAB.undo} kbd="ctrl+z" isDisabled={history.past.length === 0} onPress={undo} />
      <TransportButton size="sm" icon="redo" label={SCREENS_TAB.redo} kbd="ctrl+shift+z" isDisabled={history.future.length === 0} onPress={redo} />
      <StatusDot tone={busy ? 'warning' : failed ? 'danger' : 'success'} pulse={busy} />
      <Tooltip content={!busy && !failed ? SCREENS_TAB.savedRev(recipe.data?.rev ?? 0) : null}>
        <span className="inline-flex">
          <Text variant="studio-caption" tone={failed && !busy ? 'danger' : 'muted'}>
            {busy ? SCREENS_TAB.saving : failed ? SCREENS_TAB.notSaved : SCREENS_TAB.saved}
          </Text>
        </span>
      </Tooltip>
      {failed && !busy && latest.current ? (
        <Button size="sm" variant="outline" onPress={() => latest.current && void save(latest.current)}>
          {SCREENS_TAB.retry}
        </Button>
      ) : null}
    </span>
  )

  const guide = aside === 'decor' || layout.screens[screen] !== undefined
  const canvas = preview ? (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <div className="min-h-0 flex-1">
        <ScreensCanvas
          preview={preview}
          selectedId={selected}
          overriddenIds={overridden}
          hiddenIds={hidden}
          handles={overlay === null}
          guide={guide && !NO_DECOR.has(screen) && overlay === null}
          onSelect={(id) => {
            setSelected(id)
            if (id) tipLearned('screens-edit')
          }}
          onNudge={nudge}
          onAnchor={(anchor) => {
            setBox({ ...layout.screens[screen], anchor })
            tipLearned('decor-anchor')
          }}
          onMeasured={onMeasured}
        />
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1">
        <SwitchField size="sm" label={SCREENS_TAB.motion} description={undefined} isSelected={motion} onChange={setMotion} />
        <Text variant="studio-caption" tone="muted" className="ml-auto">
          {SCREENS_TAB.previewHint}
        </Text>
      </div>
    </div>
  ) : (
    <Skeleton shape="card" className="h-full" />
  )

  const sel = selected ? measured.nodes.get(selected) : undefined
  const elements = [...measured.nodes.values()].filter((n) => {
    const p = parseNodeId(n.id)
    return p !== null && p.screen === screen && p.slot !== 'decor'
  })
  const languageSwitch = (
    <SegmentedField<StageLanguage>
      label={SCREENS_TAB.previewLanguage}
      hideLabel
      size="sm"
      value={editLanguage}
      onChange={setLanguage}
      options={[
        { value: 'en', label: 'EN' },
        { value: 'ro', label: 'RO' },
      ]}
    />
  )

  const inspectorPanel = (
    <Panel variant="secondary" className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <Text variant="studio-heading">{SCREENS_TAB.inspector}</Text>
        <Text variant="studio-caption" tone="muted">
          {SCREENS_TAB.overridden(counts[screen] ?? 0)}
        </Text>
      </div>
      {overlay ? (
        <Text variant="studio-body" tone="muted">
          {SCREENS_TAB.overlayInspector}
        </Text>
      ) : null}
      {selected && !overlay ? <NodeTitle nodeId={selected} label={nodeName(selected, preview)} scope={nodeScope(selected)} /> : null}
      {selected && !overlay ? (
        <TextInspector keys={textKeysForNode(selected)} language={editLanguage} values={textValues} onChange={setText} now={sel?.text} languageSwitch={languageSwitch} />
      ) : null}
      {overlay ? null : (
        <NodeInspector
          nodeId={selected}
          style={selected ? layout.nodes[selected] : undefined}
          measured={sel ? { fontSize: sel.fontSize, width: sel.width, height: sel.height } : undefined}
          empty={
            elements.length > 0 ? (
              <div className="flex flex-col gap-1" data-element-list>
                <Text variant="studio-caption" tone="muted">
                  {SCREENS_TAB.elements}
                </Text>
                <ul className="flex flex-col">
                  {elements.map((n) => (
                    <li key={n.id}>
                      <button
                        type="button"
                        className="flex w-full items-center justify-between gap-2 rounded px-1.5 py-1 text-left hover:bg-[var(--surface-secondary)] focus-visible:outline-2 focus-visible:outline-[var(--focus)]"
                        onClick={() => setSelected(n.id)}
                      >
                        <Text variant="studio-caption" truncate>
                          {nodeName(n.id, preview)}
                        </Text>
                        {textKeysForNode(n.id).length > 0 ? (
                          <Text variant="studio-caption" tone="accent" className="shrink-0" title={SCREENS_TAB.editableWords}>
                            Aa
                          </Text>
                        ) : null}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null
          }
          onChange={(style) => selected && setNode(selected, style)}
          onApplyAll={() => {
            if (!selected) return
            const done = applyToAllScreens(layout, selected, layout.nodes[selected] ?? null)
            update(done.layout)
            toast.info(SCREENS_TAB.appliedTo(done.written.length))
          }}
          onReset={() => selected && setNode(selected, null)}
        />
      )}
      {/* The resets act on elements and boxes, so they live with the Inspector (beta.13). */}
      <div className="flex flex-wrap gap-2 border-t border-[var(--separator)] pt-3">
        <Button size="sm" variant="ghost" icon="undo" onPress={() => setResetting('screen')}>
          {SCREENS_TAB.resetScreen}
        </Button>
        <Button size="sm" variant="ghost" icon="undo" onPress={() => setResetting('all')}>
          {SCREENS_TAB.resetAll}
        </Button>
      </div>
    </Panel>
  )

  const decorPanel = (
    <Panel variant="secondary" className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <Text variant="studio-heading">{SCREENS_TAB.decor}</Text>
          <Text variant="studio-caption" tone="muted">
            {SCREENS_TAB.decorHint}
          </Text>
        </div>
        <IconButton
          size="sm"
          variant="ghost"
          icon="undo"
          label={SCREENS_TAB.decorReset}
          onPress={() => {
            update({ ...layout, decor: DEFAULT_DECOR_SETTINGS })
            toast.info(SCREENS_TAB.decorResetDone)
          }}
        />
      </div>
      <DecorDials
        decor={layout.decor}
        onDecorChange={setDecor}
        screen={screen}
        box={layout.screens[screen]}
        onBoxChange={setBox}
        resolved={measured.decor}
        hasShapes={!NO_DECOR.has(screen)}
        boxDisabled={overlay !== null}
      />
    </Panel>
  )

  const inspector = (
    <div className="flex flex-col gap-3">
      {/* Inspector | Decor (beta.13): stacked, picking an element pushed the
        * dials far down a 22rem column. */}
      <Tabs variant="secondary" selectedKey={aside} onSelectionChange={(k) => (k === 'inspector' || k === 'decor') && setAside(k)}>
        <Tabs.ListContainer>
          <Tabs.List aria-label={SCREENS_TAB.inspector}>
            <Tabs.Tab id="inspector">
              {SCREENS_TAB.inspector}
              <Tabs.Indicator />
            </Tabs.Tab>
            <Tabs.Tab id="decor">
              {SCREENS_TAB.decor}
              <Tabs.Indicator />
            </Tabs.Tab>
          </Tabs.List>
        </Tabs.ListContainer>
      </Tabs>
      <section data-inspector hidden={aside !== 'inspector'}>
        {inspectorPanel}
      </section>
      <section data-decor hidden={aside !== 'decor'}>
        {decorPanel}
      </section>
      {/* Both act at once on many overrides, so they confirm first (B7). */}
      <ConfirmDialog
        isOpen={resetting !== null}
        onOpenChange={(open) => !open && setResetting(null)}
        severity="warning"
        title={resetting === 'all' ? SCREENS_TAB.resetAllTitle : SCREENS_TAB.resetScreenTitle(SCREENS[screen])}
        body={resetting === 'all' ? SCREENS_TAB.resetAllBody : SCREENS_TAB.resetScreenBody}
        confirmLabel={SCREENS_TAB.resetConfirm}
        onConfirm={() => {
          if (resetting === 'all') update({ ...layout, nodes: {}, screens: {}, text: {} })
          else {
            const nodes = Object.fromEntries(Object.entries(layout.nodes).filter(([id]) => !id.startsWith(`${screen}.`)))
            const screens = { ...layout.screens }
            delete screens[screen]
            // Words used on this screen alone go back too; shared ones (the
            // eyebrow, the domain label) belong to the other screens as well.
            const shared = new Set((Object.keys(SCREEN_SLOTS) as StageScreen[]).filter((s) => s !== screen).flatMap((s) => [...textKeysOnScreen(s)]))
            const own = textKeysOnScreen(screen).filter((k) => !shared.has(k))
            const text = Object.fromEntries(
              Object.entries(layout.text).map(([lang, block]) => [lang, Object.fromEntries(Object.entries(block ?? {}).filter(([k]) => !own.includes(k as TextKey)))]),
            )
            update({ ...layout, nodes, screens, text: parseLayout({ ...layout, text }).text })
          }
          setResetting(null)
        }}
      />
    </div>
  )

  return <>{render({ toolbar, status, canvas, inspector })}</>
}
