/**
 * Which desktop Studio runs on (beta.10), for what differs in words and keys:
 * ⌘ for Ctrl, Option for Alt, a Mac's own display settings. Read from the
 * webview's user agent — WKWebView says `Macintosh` — so a test sets it.
 */
export function isMac(): boolean {
  return typeof navigator !== 'undefined' && /Macintosh|Mac OS X/.test(navigator.userAgent)
}
