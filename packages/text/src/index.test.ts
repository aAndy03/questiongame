import { describe, expect, it } from 'vitest'
import { TEXT_VARIANTS, variantTokens } from './index'

describe('Text module', () => {
  it('resolves every variant to a token pair, never a raw size', () => {
    for (const v of TEXT_VARIANTS) {
      const { size, family } = variantTokens(v)
      expect(size).toMatch(/^var\(--/)
      expect(family).toMatch(/^var\(--/)
    }
  })

  it('separates the Stage and Studio type scales', () => {
    expect(TEXT_VARIANTS.filter((v) => v.startsWith('stage-')).length).toBeGreaterThan(0)
    expect(TEXT_VARIANTS.filter((v) => v.startsWith('studio-')).length).toBeGreaterThan(0)
  })
})

import { highlightRanges, matchesSearch, searchTerms, snippetAround } from './index'

const marked = (text: string, q: string) => highlightRanges(text, q).map(([a, b]) => text.slice(a, b))

describe('highlight (beta.9)', () => {
  it('marks nothing for a blank query', () => {
    expect(highlightRanges('Pământ', '')).toEqual([])
    expect(highlightRanges('Pământ', '   ')).toEqual([])
    expect(searchTerms(null)).toEqual([])
  })
  it('ignores case and accents, both ways, and marks the original characters', () => {
    expect(marked('Care este satelitul natural al Pământului?', 'pamant')).toEqual(['Pământ'])
    expect(marked('Pamant', 'PĂMÂNT')).toEqual(['Pamant'])
    expect(marked('Ştiinţe', 'stiint')).toEqual(['Ştiinţ'])
  })
  it('matches at the start of a word, not inside one', () => {
    expect(marked('Rome and Byzantium', 'rom')).toEqual(['Rom'])
    expect(marked('Chromosome', 'rom')).toEqual([])
    expect(marked('the L in HTML', 'html')).toEqual(['HTML'])
  })
  it('marks every word of the query, and merges what overlaps', () => {
    expect(marked('Who built the Roman roads?', 'roman built')).toEqual(['built', 'Roman'])
    expect(marked('Romania', 'rom roma')).toEqual(['Roma'])
  })
  it('treats regex characters in the query as text', () => {
    expect(marked('a (b) c', '(b)')).toEqual(['b'])
    expect(() => highlightRanges('x', '.*[')).not.toThrow()
  })
  it('keeps its place after an emoji or a flag (two UTF-16 units each)', () => {
    expect(marked('😀 Rome', 'rome')).toEqual(['Rome'])
    expect(marked('🇷🇴 Pământ', 'pamant')).toEqual(['Pământ'])
  })
  it('splits a query on what is not a letter or a digit, as the search does', () => {
    expect(searchTerms('rock-n-roll')).toEqual(['rock', 'n', 'roll'])
    expect(marked('Rock-n-roll', 'rock-n-roll')).toEqual(['Rock', 'n', 'roll'])
  })
  it('says whether a text matches', () => {
    expect(matchesSearch('Sydney', 'syd')).toBe(true)
    expect(matchesSearch('Sydney', 'ney')).toBe(false)
    expect(matchesSearch(null, 'x')).toBe(false)
  })
})

describe('a snippet keeps the hit in view (beta.9)', () => {
  it('leaves a text whose hit is near its start as it is', () => {
    expect(snippetAround('Rome · Athens', 'rome')).toBe('Rome · Athens')
    expect(snippetAround('Constantinople · Rome', 'rom', 20)).toBe('Constantinople · Rome')
  })
  it('starts at the word before a hit far in, after an ellipsis', () => {
    const answers = 'Alexandria · Antioch · Carthage · Constantinople · Rome · Athens'
    const cut = snippetAround(answers, 'rome')
    expect(cut.startsWith('…')).toBe(true)
    expect(cut.endsWith('Rome · Athens')).toBe(true)
    expect(cut).toBe('…Constantinople · Rome · Athens')
  })
  it('breaks on any non-letter, never starts on a separator, never splits an emoji', () => {
    expect(snippetAround('ABCDEFGHIJKLMNOPQRSTUVWXYZ-Rome', 'rome')).toBe('…Rome')
    expect(snippetAround('Alpha · Beta · 😀😀 · Rome', 'rome', 8)).toBe('…😀😀 · Rome')
    expect(snippetAround('one\nline two and more\nRome', 'rome', 6)).toBe('…and more\nRome')
  })
  it('leaves a text without a hit as it is', () => {
    expect(snippetAround('Alexandria · Antioch · Carthage', 'rome')).toBe('Alexandria · Antioch · Carthage')
  })
})
