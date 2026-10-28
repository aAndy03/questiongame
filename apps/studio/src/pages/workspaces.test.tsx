import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { EMPTY_PLAY_STATE, type PlayStateForMain } from '@questiongame/contract'
import { App } from '@/App'
import { useChromeStore } from '@/chrome/chrome'
import { HOME, useNavStore } from '@/chrome/nav'
import { useNoticeStore } from '@/chrome/notices'
import { createFakeHost, type FakeHost } from '@/host/fake'
import { setHostTransport } from '@/host/host'
import { receivePlayState } from '@/host/playState'
import { resetUpdateCheck } from '@/host/updates'
import { resetWhatsNew } from '@/host/whatsNew'
import { BETA_WELCOME } from '@/copy/beta'
import { FIRST_RUN } from '@/copy/firstRun'
import { OPERATOR } from '@/copy'
import { TRANSFER, WORKSPACE } from '@/copy/workspaces'
import type { CatalogItem } from '@/host/types'

/** Beta 2.0 in Studio: naming, the switcher, Manage workspaces. */
let fake: FakeHost
const calls = (name: string) => fake.calls.filter((c) => c.name === name)

const operator: CatalogItem = {
  kind: 'operator',
  item: { id: 'op', displayName: 'Ana', pinHash: null, lastActiveAt: null, playsRun: 0, createdAt: 0, updatedAt: 0, archivedAt: null },
}

async function withOperator() {
  fake.seed([operator])
  await fake.invoke('settings_set_global', { setting: { key: 'active_operator_id', value: 'op' } })
  fake.calls.length = 0
}

beforeEach(() => {
  useNavStore.setState({ route: HOME, back: [], forward: [], guard: null })
  // A search one test typed is not the next test's list.
  useChromeStore.setState({ listState: {} })
  useNoticeStore.setState({ notices: [], collectorOpen: false })
  receivePlayState(null)
  resetUpdateCheck()
  resetWhatsNew()
  fake = createFakeHost()
  setHostTransport(fake)
})
afterEach(() => setHostTransport(null))

describe('naming the workspace', () => {
  it('comes after the Beta welcome and before first run, and suggests nothing', async () => {
    fake.channel = 'beta'
    fake.workspaces = fake.workspaces.map((w) => ({ ...w, name: null }))
    render(<App />)
    fireEvent.click(await screen.findByRole('button', { name: BETA_WELCOME.en.empty }))

    expect(await screen.findByText(WORKSPACE.createTitle)).toBeTruthy()
    expect(screen.queryByText(FIRST_RUN.paths.title)).toBeNull()
    const field = screen.getByRole('textbox', { name: new RegExp(WORKSPACE.nameLabel) }) as HTMLInputElement
    expect(field.value).toBe('')
    expect(field.getAttribute('placeholder')).toBeNull()
    const go = screen.getByRole('button', { name: WORKSPACE.continue })
    expect(go.hasAttribute('disabled') || go.getAttribute('aria-disabled') === 'true' || go.hasAttribute('data-disabled')).toBe(true)

    fireEvent.change(field, { target: { value: '  Club 2026 ' } })
    fireEvent.click(screen.getByRole('button', { name: WORKSPACE.continue }))
    expect(await screen.findAllByText(FIRST_RUN.paths.title)).not.toHaveLength(0)
    expect(fake.workspaces[0]?.name).toBe('Club 2026')
  })

  it('asks a library with work in it to name, not create, its workspace', async () => {
    await withOperator()
    fake.workspaces = fake.workspaces.map((w) => ({ ...w, name: null }))
    render(<App />)
    expect(await screen.findByText(WORKSPACE.guidedTitle)).toBeTruthy()
  })

  it('tells a 1.x library what happened before it asks, with the name prefilled (beta.10)', async () => {
    await withOperator()
    fake.workspaces = fake.workspaces.map((w) => ({ ...w, name: null }))
    render(<App />)
    expect(await screen.findByText(WORKSPACE.guidedTitle)).toBeTruthy()
    for (const title of [WORKSPACE.guidedSafeTitle, WORKSPACE.guidedHereTitle, WORKSPACE.guidedWhyTitle]) {
      expect(screen.getByText(title)).toBeTruthy()
    }
    const field = screen.getByRole('textbox', { name: new RegExp(WORKSPACE.nameLabel) }) as HTMLInputElement
    expect(field.value).toBe(WORKSPACE.guidedDefaultName)
    expect(screen.getByText(WORKSPACE.guidedNameHint)).toBeTruthy()
    // The card is the workspace as it will be: the name as typed, what it holds.
    const card = document.querySelector<HTMLElement>('[data-workspace-card]')!
    expect(card.textContent).toContain(WORKSPACE.guidedDefaultName)
    fireEvent.change(field, { target: { value: 'Quiz club' } })
    expect(card.textContent).toContain('Quiz club')
    fireEvent.click(screen.getByRole('button', { name: WORKSPACE.guidedShowFolder }))
    await waitFor(() => expect(calls('paths_reveal')).toHaveLength(1))
    fireEvent.click(screen.getByRole('button', { name: WORKSPACE.continue }))
    await waitFor(() => expect(fake.workspaces[0]?.name).toBe('Quiz club'))
  })

  it('shows a refused name on the field and stays', async () => {
    await withOperator()
    fake.workspaces = [
      { ...fake.workspaces[0]!, name: null },
      { id: 'ws-2', name: 'Taken', groupId: null, sortKey: 1, settings: null, createdAt: 1, updatedAt: 1, archivedAt: null },
    ]
    render(<App />)
    const field = await screen.findByRole('textbox', { name: new RegExp(WORKSPACE.nameLabel) })
    fireEvent.change(field, { target: { value: 'taken' } })
    fireEvent.click(screen.getByRole('button', { name: WORKSPACE.continue }))
    expect(await screen.findByText('another workspace has this name')).toBeTruthy()
    expect(screen.getByText(WORKSPACE.guidedTitle)).toBeTruthy()
  })
})

describe('the switcher', () => {
  it('names the current workspace and switches through the host', async () => {
    await withOperator()
    await fake.invoke('workspace_create', { name: 'Club' })
    render(<App />)
    const trigger = await screen.findByRole('button', { name: /My library/ })
    fireEvent.click(trigger)
    const menu = await screen.findByRole('menu')
    fireEvent.click(within(menu).getByText('Club'))
    await waitFor(() => expect(calls('workspace_switch')).toHaveLength(1))
    expect(await screen.findByRole('button', { name: /Club/ })).toBeTruthy()
  })

  it('keeps New and Manage while a game is loaded, and disables switching away (beta.12, C4)', async () => {
    await withOperator()
    const loaded = {
      ...EMPTY_PLAY_STATE,
      playId: 'p',
      status: 'loaded',
      operator: { recipeId: 'g', legalTokenTargets: [], defaultNextTeamId: null, consecutiveCorrect: 0, isRehearsal: false, canUndo: false, canRedo: false, eventCount: 0, disabled: [] },
    } as unknown as PlayStateForMain
    // Both halves: the store, and the fake's own `get_state` the bridge asks on mount.
    fake.playState = loaded
    receivePlayState(loaded)
    render(<App />)
    await screen.findAllByRole('button', { name: /My library/ })
    const trigger = document.querySelector('[data-workspace-switcher] button') as HTMLElement
    expect(trigger.hasAttribute('disabled')).toBe(false)
    fireEvent.click(trigger)
    expect(await screen.findByRole('menuitem', { name: WORKSPACE.manage })).toBeTruthy()
    expect(screen.getByText(WORKSPACE.loaded)).toBeTruthy()
  })
})

describe('Manage workspaces', () => {
  it('archives another workspace and cannot archive the current one', async () => {
    await withOperator()
    await fake.invoke('workspace_create', { name: 'Club' })
    useNavStore.setState({ route: { tab: 'workspaces' } })
    render(<App />)
    const club = await screen.findByLabelText(`${WORKSPACE.actions}: Club`)
    fireEvent.click(club)
    fireEvent.click(await screen.findByText(WORKSPACE.archive))
    // C13: it asks first, as Teams, Games and Questions do.
    const confirm = await screen.findByRole('alertdialog')
    expect(within(confirm).getByText(WORKSPACE.archiveTitle('Club'))).toBeTruthy()
    expect(calls('workspace_archive')).toHaveLength(0)
    fireEvent.click(within(confirm).getByRole('button', { name: WORKSPACE.archive }))
    await waitFor(() => expect(calls('workspace_archive')).toHaveLength(1))
    expect(await screen.findByText(WORKSPACE.archived)).toBeTruthy()

    fireEvent.click(screen.getByLabelText(`${WORKSPACE.actions}: My library`))
    const archive = await screen.findByRole('menuitem', { name: WORKSPACE.archive })
    expect(archive.getAttribute('aria-disabled')).toBe('true')
  })

  // P21.6: the list every other library tab has — the selection strip, and
  // grid or table.
  it('archives a selection in bulk and keeps the current workspace out of it', async () => {
    await withOperator()
    await fake.invoke('workspace_create', { name: 'Club' })
    await fake.invoke('workspace_create', { name: 'School' })
    useNavStore.setState({ route: { tab: 'workspaces' } })
    render(<App />)
    fireEvent.click(await screen.findByRole('checkbox', { name: 'Select all' }))
    const strip = await waitFor(() => {
      const el = document.querySelector<HTMLElement>('[data-bulk-strip]:not([data-bulk-idle])')
      if (!el) throw new Error('no strip')
      return el
    })
    expect(within(strip).getByText('3 selected')).toBeTruthy()
    fireEvent.click(within(strip).getByRole('button', { name: 'Archive 2' }))
    const confirm = await screen.findByRole('alertdialog')
    expect(within(confirm).getByText(WORKSPACE.archiveManyTitle(2))).toBeTruthy()
    fireEvent.click(within(confirm).getByRole('button', { name: WORKSPACE.archive }))
    await waitFor(() => expect(calls('workspace_archive')).toHaveLength(2))
    expect(calls('workspace_archive').map((c) => c.args?.['id'])).not.toContain(fake.workspaces[0]?.id)
    expect(await screen.findByText(WORKSPACE.archivedMany(2))).toBeTruthy()
  })

  // C6: by word prefix, accents and case folded, as the library searches.
  it('finds Pământ from "pamant"', async () => {
    await withOperator()
    await fake.invoke('workspace_create', { name: 'Pământ' })
    useNavStore.setState({ route: { tab: 'workspaces' } })
    render(<App />)
    await screen.findByLabelText(`${WORKSPACE.actions}: Pământ`)
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'pamant' } })
    await waitFor(() => expect(screen.queryByLabelText(`${WORKSPACE.actions}: My library`)).toBeNull())
    expect(screen.getByLabelText(`${WORKSPACE.actions}: Pământ`)).toBeTruthy()
    // A hit inside a word is not a hit.
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'mant' } })
    await waitFor(() => expect(screen.queryByLabelText(`${WORKSPACE.actions}: Pământ`)).toBeNull())
  })

  it('moves a selection to a workspace group, and offers grid as well as table', async () => {
    await withOperator()
    await fake.invoke('workspace_create', { name: 'Club' })
    await fake.invoke('workspace_group_create', { name: 'Clients' })
    useNavStore.setState({ route: { tab: 'workspaces' } })
    render(<App />)
    expect(await screen.findByRole('radio', { name: 'Grid' })).toBeTruthy()
    expect(screen.getByRole('radio', { name: 'Table' })).toBeTruthy()
    fireEvent.click(await screen.findByRole('checkbox', { name: 'Select all' }))
    fireEvent.click(await screen.findByRole('button', { name: WORKSPACE.moveToGroup }))
    expect(await screen.findByText(WORKSPACE.moveManyTitle(2))).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: WORKSPACE.save }))
    await waitFor(() => expect(calls('workspace_set_group')).toHaveLength(2))
  })
})

// C10: Operators has the selection strip every library tab has.
describe('Operators in bulk', () => {
  it('archives a selection and keeps the active operator out of it', async () => {
    await withOperator()
    fake.seed([{ kind: 'operator', item: { ...operator.item, id: 'op-2', displayName: 'Bogdan' } } as CatalogItem])
    fake.calls.length = 0
    useNavStore.setState({ route: { tab: 'operators' } })
    render(<App />)
    fireEvent.click(await screen.findByRole('checkbox', { name: 'Select all' }))
    const strip = await waitFor(() => {
      const el = document.querySelector<HTMLElement>('[data-bulk-strip]:not([data-bulk-idle])')
      if (!el) throw new Error('no strip')
      return el
    })
    expect(within(strip).getByText('2 selected')).toBeTruthy()
    // Archive counts what it takes: the active operator stays.
    fireEvent.click(await within(strip).findByRole('button', { name: 'Archive 1' }))
    expect(await screen.findByText(OPERATOR.activeNotArchived)).toBeTruthy()
    const confirm = await screen.findByRole('alertdialog')
    fireEvent.click(within(confirm).getByRole('button', { name: /^Archive/ }))
    await waitFor(() => expect(calls('catalog_archive')).toHaveLength(1))
    expect(calls('catalog_archive')[0]?.args).toMatchObject({ kind: 'operator', id: 'op-2' })
  })
})

describe('review fixes', () => {
  it('never shows first run before the workspace list has said the workspace is unnamed', async () => {
    fake.workspaces = fake.workspaces.map((w) => ({ ...w, name: null }))
    const real = fake.invoke.bind(fake)
    let release: () => void = () => {}
    const gate = new Promise<void>((r) => (release = r))
    setHostTransport({
      invoke: async (name, args) => {
        if (name === 'workspace_list') await gate
        return real(name, args)
      },
      listen: (name, handler) => fake.listen(name, handler),
    })
    render(<App />)
    await waitFor(() => expect(calls('settings_get').length).toBeGreaterThan(0))
    await new Promise((r) => setTimeout(r, 50))
    expect(screen.queryByText(FIRST_RUN.paths.title)).toBeNull()
    release()
    expect(await screen.findByText(WORKSPACE.createTitle)).toBeTruthy()
  })

  it('leaves an open record for its tab before switching', async () => {
    await withOperator()
    fake.seed([{ kind: 'team', item: { id: 'red', origin: 'operator', name: 'Red', shortCode: 'RED', color: 'var(--ink)', logoAssetId: null, notes: null, playCount: 0, lastPlayAt: null, createdAt: 0, updatedAt: 0, archivedAt: null } }])
    await fake.invoke('workspace_create', { name: 'Club' })
    useNavStore.setState({ route: { tab: 'teams', id: 'red', mode: 'view' } })
    render(<App />)
    fireEvent.click(await screen.findByRole('button', { name: /My library/ }))
    fireEvent.click(within(await screen.findByRole('menu')).getByText('Club'))
    await waitFor(() => expect(calls('workspace_switch')).toHaveLength(1))
    expect(useNavStore.getState().route).toEqual({ tab: 'teams' })
  })

  it('offers Stop following its copies on a row in a family', async () => {
    await withOperator()
    fake.seed([{ kind: 'team', item: { id: 'red', origin: 'operator', name: 'Red', shortCode: 'RED', color: 'var(--ink)', logoAssetId: null, notes: null, playCount: 0, lastPlayAt: null, createdAt: 0, updatedAt: 0, archivedAt: null, familyId: 3 } }])
    useNavStore.setState({ route: { tab: 'teams' } })
    render(<App />)
    await screen.findByText('Red')
    const menus = screen.getAllByRole('button', { name: 'Open' })
    fireEvent.click(menus[0] as HTMLElement)
    fireEvent.click(await screen.findByText(TRANSFER.unfollow))
    await waitFor(() => expect(calls('catalog_unfollow')).toHaveLength(1))
  })
})

describe('a switch leaves nothing of the old workspace (beta.2)', () => {
  it('clears Back and Forward, and drops notices about the rows it left', async () => {
    await withOperator()
    const other = await fake.invoke<{ id: string }>('workspace_create', { name: 'Club' })
    render(<App />)
    await waitFor(() => expect(calls('workspace_list').length).toBeGreaterThan(0))
    await useNavStore.getState().go({ tab: 'teams' })
    await useNavStore.getState().go({ tab: 'library' })
    expect(useNavStore.getState().back.length).toBeGreaterThan(0)
    useNoticeStore.getState().pushError('catalog', 'board refused', 'recipe.g1.board')
    useNoticeStore.getState().pushError('disk', 'disk nearly full', null)
    await fake.invoke('workspace_switch', { id: other.id })
    await waitFor(() => expect(useNavStore.getState().back).toEqual([]))
    expect(useNavStore.getState().forward).toEqual([])
    const left = useNoticeStore.getState().notices.map((n) => n.detail.message)
    expect(left).toContain('disk nearly full')
    expect(left).not.toContain('board refused')
  })
})
