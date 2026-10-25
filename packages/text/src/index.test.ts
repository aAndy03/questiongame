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

import { highlightRanges, matchesSearch, searchTerms } from './index'

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
  it('says whether a text matches', () => {
    expect(matchesSearch('Sydney', 'syd')).toBe(true)
    expect(matchesSearch('Sydney', 'ney')).toBe(false)
    expect(matchesSearch(null, 'x')).toBe(false)
  })
})
