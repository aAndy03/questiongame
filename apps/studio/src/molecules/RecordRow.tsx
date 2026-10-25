import { useRef, type MouseEvent, type ReactNode } from 'react'
import { CheckboxField, Text } from '@/atoms'

export type RecordLayout = 'grid' | 'table'

export interface RecordRowProps {
  layout: RecordLayout
  /** Leading mark: an `Avatar`, a `Swatch`, an `Icon`. */
  leading?: ReactNode
  title: string
  subtitle?: string | undefined
  /** A muted note after the title — "also in History, Science" (stable 1.1). */
  note?: string | undefined
  /**
   * A short mark that always shows — a question's difficulty (P20). In a table
   * it ends the title area at one width, a column down the list, and stays when
   * a narrow list hides the chips; on a card it is the first chip.
   */
  badge?: ReactNode
  /** Chips after the title. */
  chips?: ReactNode
  /** Right-aligned metadata (dates, counts). In table layout these are the cells. */
  meta?: readonly ReactNode[] | undefined
  /** The `ActionMenu`. */
  actions?: ReactNode
  isSelected?: boolean | undefined
  onSelectChange?: ((selected: boolean) => void) | undefined
  /**
   * The selection gestures (beta.8): Shift+click on the row or its checkbox
   * (`true`) selects a run, Ctrl/⌘+click on the row (`false`) ticks it —
   * neither opens the row; a plain click does (the maintainer).
   */
  onSelectGesture?: ((range: boolean) => void) | undefined
  isArchived?: boolean | undefined
  isOverridden?: boolean | undefined
  /** Highlighted as the currently open record (an aside is showing it). */
  isCurrent?: boolean | undefined
  /**
   * 1-based position in the list as it is currently filtered and sorted —
   * a running count, not an id (an archived row does not hold a number).
   * Table layout prints it; the grid does not.
   */
  index?: number | undefined
  onOpen?: (() => void) | undefined
  /** The row's element, for a drag that grabs the row itself (beta.9: questions onto a domain). */
  rowRef?: ((el: Element | null) => void) | undefined
  /** Being carried in a drag: dimmed where it stands. */
  isCarried?: boolean | undefined
  /** The search in force (beta.9): marked in the title, the subtitle and the note. */
  highlight?: string | null | undefined
  /** Where a search hit that the row does not show sits — *Found in: explanation* (beta.9). */
  found?: string | undefined
}

/**
 * One record, two layouts (spec §12: "same row node, two layouts"). The grid
 * card and the table row share every slot, so a tab switches layout without
 * touching its data.
 */
export function RecordRow({
  layout,
  leading,
  title,
  subtitle,
  note,
  badge,
  chips,
  meta = [],
  actions,
  isSelected,
  onSelectChange,
  onSelectGesture,
  isArchived,
  isOverridden,
  isCurrent,
  index,
  onOpen,
  rowRef,
  isCarried,
  highlight,
  found,
}: RecordRowProps) {
  const selectable = onSelectChange !== undefined
  const tone = isArchived ? 'muted' : 'default'
  // A table row is a slice of one rounded, clipped container, so its ring is
  // drawn **inside**: an outer ring on the first or last row is a square
  // corner over the container's rounded one, and half of it is clipped away.
  // A card owns its whole outline, so its ring stays outside.
  const frame = [
    'group relative outline-none transition-colors',
    isCurrent ? (layout === 'table' ? 'ring-2 ring-inset ring-[var(--accent)]' : 'ring-2 ring-[var(--accent)]') : '',
    isSelected ? 'bg-[var(--accent)]/8' : '',
    isOverridden ? 'border-l-2 border-l-[var(--accent)]' : '',
    isArchived ? 'opacity-70' : '',
    isCarried ? 'opacity-40' : '',
  ].join(' ')

  // Shift held when the checkbox was pressed: React Aria's onChange has no
  // event, so the pointer-down remembers it.
  const shift = useRef(false)
  const checkbox = selectable ? (
    <div
      onClick={(e) => e.stopPropagation()}
      onPointerDownCapture={(e) => (shift.current = e.shiftKey)}
      onKeyDownCapture={() => (shift.current = false)}
      className="flex items-center"
    >
      <CheckboxField
        label={`Select ${title}`}
        hideLabel
        isSelected={Boolean(isSelected)}
        onChange={(on) => (shift.current && onSelectGesture ? onSelectGesture(true) : onSelectChange?.(on))}
      />
    </div>
  ) : null
  // Shift selects a run, Ctrl/⌘ ticks; only a plain click opens. Shift's
  // mouse-down would select text across the rows, so it is refused.
  const click = (e: MouseEvent) => {
    if (onSelectGesture && (e.shiftKey || e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      onSelectGesture(e.shiftKey)
      return
    }
    onOpen?.()
  }
  const mouseDown = (e: MouseEvent) => {
    if (onSelectGesture && e.shiftKey) e.preventDefault()
  }

  if (layout === 'grid') {
    return (
      <div
        ref={rowRef}
        role={onOpen ? 'button' : undefined}
        tabIndex={onOpen ? 0 : undefined}
        onClick={click}
        onMouseDown={mouseDown}
        onKeyDown={(e) => {
          if (onOpen && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault()
            onOpen()
          }
        }}
        className={[
          frame,
          'flex min-h-16 flex-col gap-3 rounded-[var(--radius)] border border-[var(--border)] p-4',
          onOpen ? 'cursor-pointer hover:bg-[var(--surface-secondary)] focus-visible:ring-2 focus-visible:ring-[var(--focus)]' : '',
        ].join(' ')}
        style={{ background: 'var(--surface)' }}
      >
        <div className="flex items-start gap-3">
          {checkbox}
          {leading ? <div className="shrink-0">{leading}</div> : null}
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            {/* The title leads the card: up to three lines, not one cut short (1.1.1, the maintainer). */}
            <Text variant="studio-body" tone={tone} className="line-clamp-3 break-words font-medium" highlight={highlight}>
              {title}
            </Text>
            {subtitle ? (
              <Text variant="studio-caption" tone="muted" truncate highlight={highlight}>
                {subtitle}
              </Text>
            ) : null}
            {note ? (
              <Text variant="studio-caption" tone="muted" truncate highlight={highlight}>
                {note}
              </Text>
            ) : null}
            {found ? (
              <Text variant="studio-caption" tone="muted" truncate className="italic" data-found>
                {found}
              </Text>
            ) : null}
          </div>
          {actions ? (
            <div onClick={(e) => e.stopPropagation()} className="-mr-2 -mt-1 shrink-0">
              {actions}
            </div>
          ) : null}
        </div>
        {badge || chips || meta.length > 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
              {badge}
              {chips}
            </div>
            {/* Each value on one line; the values wrap as wholes (1.1.1: "Oct 21," over "2026"). */}
            <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1">
              {meta.map((m, i) => (
                <Text key={i} variant="studio-caption" tone="muted" className="whitespace-nowrap">
                  {m}
                </Text>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    )
  }

  return (
    <div
      ref={rowRef}
      role={onOpen ? 'button' : 'row'}
      tabIndex={onOpen ? 0 : undefined}
      onClick={click}
      onMouseDown={mouseDown}
      onKeyDown={(e) => {
        if (onOpen && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault()
          onOpen()
        }
      }}
      className={[
        frame,
        // The last row's separator is the container's own bottom border.
        'flex h-10 items-center gap-3 border-b border-[var(--separator)] px-3 last:border-b-0',
        onOpen ? 'cursor-pointer hover:bg-[var(--surface-secondary)] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--focus)]' : '',
      ].join(' ')}
    >
      {checkbox}
      {index !== undefined ? (
        <Text variant="studio-mono" tone="muted" className="w-7 shrink-0 text-right" tabular>
          {index}
        </Text>
      ) : null}
      {leading ? <div className="shrink-0">{leading}</div> : null}
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {/* A readable minimum: beside an opened row's aside the chips and meta
            took every pixel and the text went to nothing (1.1.1). */}
        <Text variant="studio-label" tone={tone} truncate className="min-w-[8rem] flex-1" highlight={highlight}>
          {title}
        </Text>
        {/* Always shown, whatever the width: it is why the row is here (beta.9). */}
        {found ? (
          <span className="shrink-0" data-found>
            <Text variant="studio-caption" tone="muted" className="italic">
              {found}
            </Text>
          </span>
        ) : null}
        {/*
          The wrapper hides them, not the Text: a truncated Text sets an inline
          `display: block`, which beats `hidden` — the options showed at every
          width (P20). Both follow the list's width, not the window's, so beside
          the domain pane the stem comes first.
        */}
        {note ? (
          <div className="hidden min-w-0 max-w-[30%] shrink-0 @xl/list:block">
            <Text variant="studio-caption" tone="muted" truncate highlight={highlight}>
              {note}
            </Text>
          </div>
        ) : null}
        {subtitle ? (
          <div className="hidden min-w-0 max-w-[30%] @5xl/list:block">
            <Text variant="studio-caption" tone="muted" truncate highlight={highlight}>
              {subtitle}
            </Text>
          </div>
        ) : null}
        <div className="hidden min-w-0 shrink items-center gap-1.5 overflow-hidden @lg/list:flex">{chips}</div>
        {/* Last in the title area at one width, so the badges read as a column down the list. */}
        {badge ? <div className="flex min-w-28 shrink-0 items-center gap-1.5">{badge}</div> : null}
      </div>
      {meta.map((m, i) => (
        // As `LibraryList`'s `metaFits`: the first from 36rem, the rest from 48rem.
        <Text key={i} variant="studio-caption" tone="muted" className={`${i === 0 ? 'hidden @xl/list:block' : 'hidden @3xl/list:block'} w-28 shrink-0 text-right`} tabular>
          {m}
        </Text>
      ))}
      {actions ? (
        <div onClick={(e) => e.stopPropagation()} className="shrink-0">
          {actions}
        </div>
      ) : null}
    </div>
  )
}
