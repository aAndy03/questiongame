import { HOTKEYS } from '@/copy'
import { useSettings } from './queries'

/**
 * The operator's chord for a command: the host's shortcut table over the
 * defaults (beta.13). One answer for the keys that fire and the hints that
 * name them — after a remap the tooltips said the default, which was a lie.
 */
export function useChord(): (command: string) => string {
  const settings = useSettings()
  const shortcuts = settings.data?.globals.shortcuts
  return (command) => shortcuts?.[command] ?? HOTKEYS.defaults[command] ?? ''
}
