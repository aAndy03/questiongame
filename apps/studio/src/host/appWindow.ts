import { hasTauri } from './host'

/**
 * Studio's own window, for its title bar (beta.10): minimize, maximize or
 * restore, close, and whether it is maximized or full screen right now.
 *
 * A seam, as the host transport is: the real one talks to Tauri's window
 * API (the `operator` capability grants exactly these calls), a test installs
 * a fake, and a plain browser (`?fake`) has none — so Studio draws no window
 * controls there. `close()` goes through the host's quit guard, as the OS
 * close box always has.
 */
export interface AppWindow {
  minimize(): Promise<void>
  toggleMaximize(): Promise<void>
  close(): Promise<void>
  isMaximized(): Promise<boolean>
  isFullscreen(): Promise<boolean>
  /** Called on every resize, maximize, restore and full-screen change; returns its unlisten. */
  onResized(handler: () => void): Promise<() => void>
}

const tauriWindow: AppWindow = {
  async minimize() {
    const { getCurrentWindow } = await import('@tauri-apps/api/window')
    await getCurrentWindow().minimize()
  },
  async toggleMaximize() {
    const { getCurrentWindow } = await import('@tauri-apps/api/window')
    await getCurrentWindow().toggleMaximize()
  },
  async close() {
    const { getCurrentWindow } = await import('@tauri-apps/api/window')
    await getCurrentWindow().close()
  },
  async isMaximized() {
    const { getCurrentWindow } = await import('@tauri-apps/api/window')
    return getCurrentWindow().isMaximized()
  },
  async isFullscreen() {
    const { getCurrentWindow } = await import('@tauri-apps/api/window')
    return getCurrentWindow().isFullscreen()
  },
  async onResized(handler) {
    const { getCurrentWindow } = await import('@tauri-apps/api/window')
    return getCurrentWindow().onResized(() => handler())
  },
}

let current: AppWindow | null = hasTauri() ? tauriWindow : null

/** The window, or `null` outside the desktop app. */
export function appWindow(): AppWindow | null {
  return current
}

/** Swap the window. Tests install a fake; the app never calls this. */
export function setAppWindow(next: AppWindow | null): void {
  current = next
}
