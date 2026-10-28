import { useRef, useState, type ReactNode } from 'react'
import { ConfirmDialog } from '@/molecules'
import { CONFIRM } from '@/copy'
import { command } from '@/host/host'
import { useHostCommand } from '@/host/commands'
import { toast } from '@/chrome/toast'
import type { LibraryKind } from '@/host/types'

export interface ArchiveRequest {
  readonly kind: LibraryKind | 'recipe'
  readonly ids: readonly string[]
  readonly what: string
}

export interface ArchiveController {
  /** Ask, then archive. Bulk is one confirm for the batch (spec §2.19). */
  archive(request: ArchiveRequest): void
  /** Restore needs no confirm: it undoes an archive. */
  restore(request: ArchiveRequest): Promise<void>
  readonly isPending: boolean
  /** Mount once on the page. */
  readonly dialog: ReactNode
}

/**
 * Archive with the §4.1 courtesy: `referenced_by` first, so the confirm can
 * say what still uses the row; arm→confirm when it is used. Recipes have
 * their own verbs, so the kind decides the command.
 */
export function useArchive(): ArchiveController {
  const run = useHostCommand()
  const [pending, setPending] = useState(false)
  const [request, setRequest] = useState<ArchiveRequest | null>(null)
  // What uses the rows, as the host says it in one sentence; `undefined`
  // while it is asked, and the confirm stays armed until it knows.
  const [referenced, setReferenced] = useState<string | null | undefined>(null)
  const asked = useRef<ArchiveRequest | null>(null)

  // What uses the rows, by name — for one row or all of a selection (beta.3:
  // a bulk archive said nothing about the games it would leave holding an
  // archived row). Only the newest request's answer is kept.
  const archive = (req: ArchiveRequest) => {
    asked.current = req
    setRequest(req)
    if (req.kind === 'recipe') return setReferenced(null)
    setReferenced(undefined)
    void command<string | null>('referenced_by', { kind: req.kind, ids: req.ids })
      .catch(() => null)
      .then((by) => {
        if (asked.current === req) setReferenced(by)
      })
  }

  // How many rows the host took (C3): each recipe is its own call, a catalog
  // batch is one call that lands whole or not at all. `run.ok`, not the value
  // — a write that answers nothing is still a write the host accepted.
  const apply = async (req: ArchiveRequest, verb: 'archive' | 'restore'): Promise<number> => {
    const archiving = verb === 'archive'
    if (req.kind === 'recipe') {
      let done = 0
      for (const id of req.ids) if (await run.ok(archiving ? 'recipe_archive' : 'recipe_restore', { id })) done++
      return done
    }
    if (req.ids.length === 1) return (await run.ok(archiving ? 'catalog_archive' : 'catalog_restore', { kind: req.kind, id: req.ids[0] })) ? 1 : 0
    return (await run.ok(archiving ? 'catalog_archive_many' : 'catalog_restore_many', { kind: req.kind, ids: req.ids })) ? req.ids.length : 0
  }
  // Say only what happened: nothing taken is the refusal notice's to say.
  const report = (req: ArchiveRequest, done: number, says: (n: number, what: string) => string) => {
    if (done === 0) return
    const failed = req.ids.length - done
    if (failed === 0) toast.info(says(done, req.what))
    else toast.warn(says(done, req.what), CONFIRM.notDone(failed))
  }

  const confirm = async () => {
    if (!request) return
    setPending(true)
    const done = await apply(request, 'archive')
    setPending(false)
    setRequest(null)
    report(request, done, CONFIRM.archivedN)
  }

  const restore = async (req: ArchiveRequest) => {
    setPending(true)
    const done = await apply(req, 'restore')
    setPending(false)
    report(req, done, CONFIRM.restoredN)
  }

  const n = request?.ids.length ?? 0
  const dialog = request ? (
    <ConfirmDialog
      isOpen
      onOpenChange={(open) => !open && setRequest(null)}
      title={n === 1 ? CONFIRM.archiveOne(request.what) : CONFIRM.archiveMany(n, request.what)}
      body={
        referenced
          ? `${n === 1 ? CONFIRM.referencedBy(referenced) : CONFIRM.referencedByMany(referenced)} ${CONFIRM.archiveBody}`
          : CONFIRM.archiveBody
      }
      severity="danger"
      confirmLabel={CONFIRM.arm}
      arm={referenced !== null}
      armedLabel={CONFIRM.armed}
      isPending={pending}
      onConfirm={confirm}
    />
  ) : null

  return { archive, restore, isPending: pending, dialog }
}
