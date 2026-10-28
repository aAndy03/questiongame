import { useEffect, useState } from 'react'
import { WindowGlyph } from '@/atoms'
import { CHROME } from '@/copy'
import { isMac } from '@/chrome/platform'
import { appWindow } from '@/host/appWindow'
import { useSettings } from '@/host/queries'

/** The room a Mac's traffic lights take at the window's top-left, with Studio's own bar (beta.10). */
export const TRAFFIC_LIGHTS = 80

/**
 * Whether Studio draws the title bar (beta.10): inside the desktop app, with
 * the system bar not chosen (`window.native_title_bar`). `mac` says which
 * kind: a Mac keeps its traffic lights over Studio's bar, Windows gets
 * Studio's caption buttons.
 */
export function useTitleBar(): { readonly custom: boolean; readonly mac: boolean } {
  const settings = useSettings()
  const native = settings.data?.globals.window?.native_title_bar ?? false
  return { custom: appWindow() !== null && !native, mac: isMac() }
}

/**
 * Minimize · Maximize/Restore · Close, at the end of Studio's bar on Windows
 * (beta.10): 46×48 like Windows' own, Close red under the pointer, the
 * middle one's glyph following the window, none of them in full screen.
 * Close is the window's close — the host's quit guard asks first, as the OS
 * close box did.
 */
export function WindowControls() {
  const win = appWindow()
  const [maximized, setMaximized] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)

  useEffect(() => {
    if (!win) return
    let alive = true
    let unlisten: (() => void) | null = null
    const read = async () => {
      const [max, full] = await Promise.all([win.isMaximized(), win.isFullscreen()])
      if (alive) {
        setMaximized(max)
        setFullscreen(full)
      }
    }
    void read()
    void win.onResized(() => void read()).then((off) => {
      if (alive) unlisten = off
      else off()
    })
    return () => {
      alive = false
      unlisten?.()
    }
  }, [win])

  if (!win || fullscreen) return null
  const button = 'inline-flex h-12 w-[46px] items-center justify-center text-[var(--foreground)] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--focus)]'
  return (
    <div className="-mr-3 flex shrink-0 items-stretch self-stretch" data-window-controls>
      <button type="button" aria-label={CHROME.windowMinimize} title={CHROME.windowMinimize} className={`${button} hover:bg-[var(--surface-secondary)]`} onClick={() => void win.minimize()}>
        <WindowGlyph name="minimize" />
      </button>
      <button
        type="button"
        aria-label={maximized ? CHROME.windowRestore : CHROME.windowMaximize}
        title={maximized ? CHROME.windowRestore : CHROME.windowMaximize}
        className={`${button} hover:bg-[var(--surface-secondary)]`}
        onClick={() => void win.toggleMaximize()}
      >
        <WindowGlyph name={maximized ? 'restore' : 'maximize'} />
      </button>
      <button type="button" aria-label={CHROME.windowClose} title={CHROME.windowCloseTip} className={`${button} hover:bg-[var(--danger)] hover:text-[var(--danger-foreground)]`} onClick={() => void win.close()}>
        <WindowGlyph name="close" />
      </button>
    </div>
  )
}
