import { Button as HeroButton, Dropdown, Header, Label } from '@heroui/react'
import { IconButton, Icon } from '@/atoms'
import { OperatorBadge, PlayStatusPill } from '@/molecules'
import { ControlTools } from './ControlTools'
import { UnloadGame } from './UnloadGame'
import { SIDEBAR_WIDTH } from './SidebarNav'
import { TRAFFIC_LIGHTS, WindowControls, useTitleBar } from './WindowControls'
import { useActivateOperator } from './useActivateOperator'
import { useChromeStore, usePrefs, type ThemeChoice } from '@/chrome/chrome'
import { useNavStore } from '@/chrome/nav'
import { CHROME } from '@/copy'
import { usePlayState } from '@/host/playState'
import { useCatalogList, useRecipe, useSettings } from '@/host/queries'

/**
 * Recipe name if loaded · play status · current operator (spec §11.I), plus
 * back/forward and the theme toggle. The status comes from `play-state`; the
 * operator from `settings_get`; nothing here is remembered locally.
 */
export function TopBar() {
  const play = usePlayState()
  const settings = useSettings()
  const back = useNavStore((s) => s.back)
  const forward = useNavStore((s) => s.forward)
  const goBack = useNavStore((s) => s.goBack)
  const goForward = useNavStore((s) => s.goForward)
  const go = useNavStore((s) => s.go)
  const onControl = useNavStore((s) => s.route.tab === 'control')
  const { theme, sidebar } = usePrefs()
  const setTheme = useChromeStore((s) => s.setTheme)
  const { activate, prompt } = useActivateOperator()

  const recipe = useRecipe(play?.operator.recipeId ?? null)
  const operators = useCatalogList('operator', 'active')
  const activeId = settings.data?.globals.active_operator_id ?? null
  const active = operators.data?.find((o) => o.id === activeId) ?? null

  const switchOperator = (id: string) => {
    const target = operators.data?.find((o) => o.id === id)
    if (target) activate(target)
  }

  // beta.10: Studio's header **is** the title bar, unless the system's was
  // chosen. Its empty parts move the window (double-click maximizes, as the
  // OS's bar does); on Windows the caption buttons close it; on a Mac the
  // traffic lights sit at the window's top-left, so the bar starts after them
  // when the sidebar is narrower than they are.
  const { custom, mac } = useTitleBar()
  const inset = custom && mac ? Math.max(0, TRAFFIC_LIGHTS - SIDEBAR_WIDTH[sidebar]) : 0
  const drag = custom ? { 'data-tauri-drag-region': true } : {}

  return (
    <header
      className="flex h-12 shrink-0 items-center gap-3 border-b border-[var(--chrome-line)] px-3"
      style={{ background: 'var(--chrome)', paddingLeft: inset > 0 ? inset + 12 : undefined }}
      data-title-bar={custom ? (mac ? 'mac' : 'windows') : undefined}
      {...drag}
    >
      <div className="flex items-center gap-1">
        <IconButton icon="back" label={CHROME.back} size="sm" isDisabled={back.length === 0} onPress={() => void goBack()} />
        <IconButton icon="forward" label={CHROME.forward} size="sm" isDisabled={forward.length === 0} onPress={() => void goForward()} />
      </div>
      <div className="min-w-0 flex-1 self-stretch" {...drag} />
      {/*
        The pill is centred on the **window** (beta.9), not on what is left of
        the header between the sidebar and the tools: Control's tools coming
        and going, or the sidebar folding, no longer move it. Unload hangs off
        its right edge, so it does not move it either.
      */}
      <div className="pointer-events-none fixed left-1/2 top-0 z-10 flex h-12 -translate-x-1/2 items-center" data-status-pill>
        <div className="pointer-events-auto relative flex items-center">
          <PlayStatusPill status={play?.status ?? null} recipeName={recipe.data?.name ?? null} />
          {/* Beside the game it unloads (P21.5), on Control with the other tools. */}
          {onControl ? (
            <div className="absolute left-full ml-1">
              <UnloadGame />
            </div>
          ) : null}
        </div>
      </div>
      <div className="flex items-center gap-1">
        {/* Control's own tools, only while Control is open (P21.4). */}
        {onControl ? <ControlTools /> : null}
        <Dropdown>
          {/* The button *is* the trigger. `Dropdown.Trigger` renders a
            * `<button>` around its child, so wrapping one nests two buttons —
            * invalid HTML and a React error on every boot. HeroUI v3's own
            * usage example puts the Button directly under `Dropdown`. */}
          <HeroButton variant="ghost" size="sm" isIconOnly aria-label={CHROME.theme}>
            <Icon name={theme === 'dark' ? 'themeDark' : theme === 'light' ? 'themeLight' : 'themeSystem'} size="sm" />
          </HeroButton>
          <Dropdown.Popover placement="bottom end">
            <Dropdown.Menu
              selectionMode="single"
              selectedKeys={[theme]}
              onSelectionChange={(keys) => {
                const next = [...keys][0]
                if (next === 'system' || next === 'light' || next === 'dark') setTheme(next as ThemeChoice)
              }}
            >
              <Dropdown.Item id="system" textValue={CHROME.themeSystem}>
                <Label>{CHROME.themeSystem}</Label>
                <Dropdown.ItemIndicator />
              </Dropdown.Item>
              <Dropdown.Item id="light" textValue={CHROME.themeLight}>
                <Label>{CHROME.themeLight}</Label>
                <Dropdown.ItemIndicator />
              </Dropdown.Item>
              <Dropdown.Item id="dark" textValue={CHROME.themeDark}>
                <Label>{CHROME.themeDark}</Label>
                <Dropdown.ItemIndicator />
              </Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown.Popover>
        </Dropdown>
        <Dropdown>
          <HeroButton variant="ghost" size="sm" aria-label={CHROME.operator} className="max-w-[12rem] rounded-full pl-1 pr-2">
            <OperatorBadge name={active?.displayName ?? null} isActive={active !== null} />
            <Icon name="chevronDown" size="sm" className="opacity-60" />
          </HeroButton>
          <Dropdown.Popover placement="bottom end">
            <Dropdown.Menu
              onAction={(key) => {
                if (key === '__manage') void go({ tab: 'operators' })
                else switchOperator(String(key))
              }}
            >
              <Dropdown.Section>
                <Header>{CHROME.switchOperator}</Header>
                {(operators.data ?? []).map((o) => (
                  <Dropdown.Item key={o.id} id={o.id} textValue={o.displayName}>
                    <Label>{o.displayName}</Label>
                    {o.id === activeId ? <Dropdown.ItemIndicator /> : null}
                  </Dropdown.Item>
                ))}
              </Dropdown.Section>
              <Dropdown.Item id="__manage" textValue={CHROME.manageOperators}>
                <Label>{CHROME.manageOperators}</Label>
              </Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown.Popover>
        </Dropdown>
        {prompt}
      </div>
      {custom && !mac ? <WindowControls /> : null}
    </header>
  )
}
