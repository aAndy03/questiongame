/**
 * A canvas element's name in the operator's words (beta.13): "Question ▸
 * Question text", "Team order ▸ Row · Red" — the Inspector and the handles
 * used to say `teamOrder.row.6f3e…`. Read off the preview the canvas draws,
 * so a row is named by the team it shows. The id stays beside it, small.
 */

import { parseNodeId, type NodeId, type PlayStateForStage } from '@questiongame/contract'
import { SCREENS, SCREENS_TAB } from '@/copy'

export function nodeName(id: NodeId, preview: PlayStateForStage | null): string {
  const parsed = parseNodeId(id)
  if (!parsed) return id
  const slots: Readonly<Record<string, string>> = SCREENS_TAB.slots
  const slot = slots[parsed.slot] ?? parsed.slot
  const key = parsed.key === null ? null : keyName(parsed.screen, parsed.slot, parsed.key, preview)
  return `${SCREENS[parsed.screen]} ▸ ${slot}${key ? ` · ${key}` : ''}`
}

function keyName(screen: string, slot: string, key: string, preview: PlayStateForStage | null): string {
  if (slot === 'row' && screen === 'finalLeaderboard') return SCREENS_TAB.place(Number(key))
  if (slot === 'row') return preview?.teams.find((t) => t.id === key)?.name ?? key
  if (slot === 'card') return preview?.domains.find((d) => d.id === key)?.name ?? key
  if (slot === 'option') {
    const at = preview?.session?.options.findIndex((o) => o.id === key) ?? -1
    return at >= 0 ? String.fromCharCode(65 + at) : key
  }
  return key
}

/** What a style edit on this element reaches, when it is one of many (beta.13). */
export function nodeScope(id: NodeId): string | null {
  const parsed = parseNodeId(id)
  if (!parsed || parsed.key === null) return null
  if (parsed.slot === 'row') return parsed.kind === 'ranked' ? SCREENS_TAB.rankOnly : SCREENS_TAB.rowOnly
  if (parsed.slot === 'option') return SCREENS_TAB.optionOnly
  if (parsed.slot === 'card') return SCREENS_TAB.cardOnly
  return null
}
