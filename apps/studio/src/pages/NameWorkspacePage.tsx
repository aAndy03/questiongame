import { useRef, useState } from 'react'
import { Button, Icon, Panel, Text, TextField, type IconName } from '@/atoms'
import { WizardLayout } from '@/templates'
import { APP } from '@/copy'
import { WORKSPACE } from '@/copy/workspaces'
import { command, type HostError } from '@/host/host'
import { useWorkspaceCounts, useWorkspaces } from '@/host/queries'

export interface NameWorkspacePageProps {
  /**
   * `create`: a library with nothing in it — the operator is making their
   * first workspace. `name`: a library that moved into a workspace (1.x, or a
   * copy of the stable library) and only needs its name.
   */
  mode: 'create' | 'name'
  /** Told once the name is stored: `App` unlatches. */
  onDone: () => void
}

/**
 * The workspace the library is in has no name yet (Beta 2.0), so Studio asks
 * before anything else in the shell. The host stores the name on the
 * workspace that is already there — a fresh library and a migrated one take
 * the same path.
 *
 * **A 1.x library is told what happened first** (beta.10): the bare *Name
 * your workspace* met someone who had just updated and left them guessing.
 * Now: questiongame 2.0 keeps the library in a workspace, then why that is
 * fine — it was copied before anything changed (*Show in folder*), everything
 * is here (the workspace as a card, with what it holds), and what workspaces
 * are for — and only then the one thing to do, with the name prefilled and
 * *rename it any time* under it. A fresh library gets the short version.
 */
export function NameWorkspacePage({ mode, onDone }: NameWorkspacePageProps) {
  const workspaces = useWorkspaces()
  const counts = useWorkspaceCounts()
  const [name, setName] = useState(mode === 'name' ? WORKSPACE.guidedDefaultName : '')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const pressed = useRef(false)
  const current = workspaces.data?.current
  const held = counts.data?.find((c) => c.workspace === current)

  const submit = async () => {
    if (pressed.current || !name.trim() || !current) return
    pressed.current = true
    setBusy(true)
    try {
      await command('workspace_rename', { id: current, name })
      onDone()
    } catch (e) {
      setError((e as HostError).message.replace(/^[^:]*:\s*/, ''))
      pressed.current = false
      setBusy(false)
    }
  }

  const field = (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        void submit()
      }}
    >
      <TextField
        label={WORKSPACE.nameLabel}
        value={name}
        onChange={(v) => {
          setName(v)
          setError(null)
        }}
        error={error}
        description={mode === 'name' ? WORKSPACE.guidedNameHint : undefined}
        autoFocus
        maxLength={60}
        isRequired
      />
    </form>
  )

  return (
    <WizardLayout
      brand={APP.name}
      steps={<Text variant="studio-caption" tone="muted">{WORKSPACE.switcher}</Text>}
      footer={
        <Button variant="primary" onPress={() => void submit()} isPending={busy} isDisabled={!name.trim() || !current}>
          {WORKSPACE.continue}
        </Button>
      }
    >
      <Panel className="flex flex-col gap-5" data-name-workspace={mode}>
        <Text as="h1" variant="studio-heading">
          {mode === 'create' ? WORKSPACE.createTitle : WORKSPACE.guidedTitle}
        </Text>
        {mode === 'create' ? (
          <Text as="p" variant="studio-body">
            {WORKSPACE.createBody}
          </Text>
        ) : (
          <ul className="flex flex-col gap-3" data-guided-points>
            <Point icon="check" title={WORKSPACE.guidedSafeTitle} body={WORKSPACE.guidedSafeBody}>
              <Button size="sm" variant="ghost" icon="folder" onPress={() => void command('paths_reveal', { which: 'userData' })}>
                {WORKSPACE.guidedShowFolder}
              </Button>
            </Point>
            <Point icon="library" title={WORKSPACE.guidedHereTitle} body={WORKSPACE.guidedHereBody} />
            <Point icon="workspaces" title={WORKSPACE.guidedWhyTitle} body={WORKSPACE.guidedWhyBody} />
          </ul>
        )}
        {/* The workspace itself, as it will look: the name as it is typed, what it holds. */}
        <div className="flex items-center gap-3 rounded-[var(--radius)] bg-[var(--surface-secondary)] px-3 py-2.5" data-workspace-card>
          <Icon name="workspaces" />
          <div className="flex min-w-0 flex-col">
            <Text variant="studio-label" truncate>
              {name.trim() || WORKSPACE.nameLabel}
            </Text>
            <Text variant="studio-caption" tone="muted" tabular>
              {held && held.teams + held.domains + held.questions + held.games > 0 ? WORKSPACE.counts(held) : WORKSPACE.emptyCounts}
            </Text>
          </div>
        </div>
        {field}
      </Panel>
    </WizardLayout>
  )
}

function Point({ icon, title, body, children }: { icon: IconName; title: string; body: string; children?: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-0.5 shrink-0 text-[var(--accent)]">
        <Icon name={icon} size="sm" />
      </span>
      <div className="flex min-w-0 flex-col gap-0.5">
        <Text variant="studio-label">{title}</Text>
        <Text variant="studio-caption" tone="muted">
          {body}
        </Text>
        {children ? <div className="pt-1">{children}</div> : null}
      </div>
    </li>
  )
}
