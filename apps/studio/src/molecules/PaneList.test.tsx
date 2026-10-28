import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { PaneList } from './PaneList'

/** C6: a manager's search folds accents and case, by word prefix, as the library's does. */
const names = ['Pământ', 'Apă', 'Istorie', 'Știință', 'Geografie', 'Muzică', 'Sport', 'Artă', 'Film']
const entries = names.map((label, i) => ({ id: `t${i}`, label, count: i }))
const shown = () => screen.queryAllByRole('option').map((o) => o.textContent?.replace(/\d+$/, ''))

describe('PaneList search (C6)', () => {
  it('finds Pământ from "pamant" and marks it', async () => {
    render(<PaneList entries={entries} selectedId={null} onSelect={() => {}} what="tags" />)
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'pamant' } })
    await waitFor(() => expect(shown()).toEqual(['Pământ']))
    expect(document.querySelector('mark[data-hit]')?.textContent).toBe('Pământ')
  })

  it('matches the start of a word, not its middle', async () => {
    render(<PaneList entries={entries} selectedId={null} onSelect={() => {}} what="tags" />)
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'sto' } })
    // *Istorie* holds "sto" only inside a word.
    await waitFor(() => expect(shown()).toEqual([]))
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'STI' } })
    await waitFor(() => expect(shown()).toEqual(['Știință']))
  })
})
