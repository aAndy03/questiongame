import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { App } from '@/App'
import { useChromeStore } from '@/chrome/chrome'
import { HOME, useNavStore } from '@/chrome/nav'
import { useNoticeStore } from '@/chrome/notices'
import { setAppWindow, type AppWindow } from '@/host/appWindow'
import { createFakeHost, type FakeHost } from '@/host/fake'
import { demoLibrary, demoRecipe } from '@/host/devFake'
import { setHostTransport } from '@/host/host'
import { receivePlayState } from '@/host/playState'

/**
 * beta.10: Studio's header is the window's title bar — it moves the window,
 * and on Windows it carries minimize, maximize/restore and close; on a Mac
 * the traffic lights stay and the bar leaves them room. The system bar can be
 * chosen instead. jsdom has no window to drive, so a fake one is installed.
 */
let fake: FakeHost
let calls: string[]
let maximized: boolean
let fullscreen: boolean
let resized: (() => void) | null
const ua = navigator.userAgent

function fakeWindow(): AppWindow {
  return {
    minimize: async () => void calls.push('minimize'),
    toggleMaximize: async () => {
      calls.push('toggleMaximize')
      maximized = !maximized
      resized?.()
    },
    close: async () => void calls.push('close'),
    isMaximized: async () => maximized,
    isFullscreen: async () => fullscreen,
    onResized: async (handler) => {
      resized = handler
      return () => (resized = null)
    },
  }
}

const as = (agent: string) => Object.defineProperty(navigator, 'userAgent', { value: agent, configurable: true })

beforeEach(() => {
  calls = []
  maximized = false
  fullscreen = false
  resized = null
  useNavStore.setState({ route: HOME, back: [], forward: [], guard: null })
  useNoticeStore.setState({ notices: [] })
  useChromeStore.setState({ listState: {}, prefs: {}, operatorId: '', archiveScope: {} })
  receivePlayState(null)
  fake = createFakeHost()
  fake.seed(demoLibrary(), [demoRecipe()])
  setHostTransport(fake)
  setAppWindow(fakeWindow())
})
afterEach(() => {
  setAppWindow(null)
  setHostTransport(null)
  as(ua)
  cleanup()
})

const bar = () => document.querySelector<HTMLElement>('header')!

describe('Studio’s title bar on Windows (beta.10)', () => {
  it('moves the window from its empty parts and carries the caption buttons', async () => {
    as('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')
    render(<App />)
    await waitFor(() => expect(bar().getAttribute('data-title-bar')).toBe('windows'))
    expect(bar().hasAttribute('data-tauri-drag-region')).toBe(true)
    expect(document.querySelector('nav [data-tauri-drag-region]'), 'the sidebar’s top row too').toBeTruthy()
    fireEvent.click(await screen.findByRole('button', { name: 'Minimize' }))
    fireEvent.click(screen.getByRole('button', { name: 'Maximize' }))
    expect(await screen.findByRole('button', { name: 'Restore down' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Close window' }))
    expect(calls).toEqual(['minimize', 'toggleMaximize', 'close'])
  })

  it('draws no caption buttons in full screen', async () => {
    as('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')
    fullscreen = true
    render(<App />)
    await waitFor(() => expect(bar().getAttribute('data-title-bar')).toBe('windows'))
    await act(async () => {})
    expect(document.querySelector('[data-window-controls]')).toBeNull()
  })
})

describe('Studio’s title bar on a Mac (beta.10)', () => {
  it('keeps the traffic lights: no caption buttons, and room left for them', async () => {
    as('Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0)')
    render(<App />)
    await waitFor(() => expect(bar().getAttribute('data-title-bar')).toBe('mac'))
    expect(document.querySelector('[data-window-controls]')).toBeNull()
    expect(bar().hasAttribute('data-tauri-drag-region')).toBe(true)
    // The sidebar is expanded: its brand row starts after the lights.
    expect(document.querySelector<HTMLElement>('nav [data-tauri-drag-region]')!.style.paddingLeft).toBe('80px')
  })
})

describe('the system title bar instead (beta.10)', () => {
  it('drops Studio’s own controls and drag region, and the switch writes the setting', async () => {
    as('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')
    await fake.invoke('settings_set_global', { setting: { key: 'window_native_title_bar', value: true } })
    render(<App />)
    await act(async () => {
      await useNavStore.getState().go({ tab: 'settings', inner: 'settings' })
    })
    const toggle = await screen.findByRole('switch', { name: 'Use the system title bar' })
    expect(bar().hasAttribute('data-title-bar')).toBe(false)
    expect(bar().hasAttribute('data-tauri-drag-region')).toBe(false)
    expect(document.querySelector('[data-window-controls]')).toBeNull()
    fireEvent.click(toggle)
    await waitFor(() => expect(bar().getAttribute('data-title-bar')).toBe('windows'))
    expect(fake.calls.some((c) => c.name === 'settings_set_global' && JSON.stringify(c.args).includes('window_native_title_bar'))).toBe(true)
  })

  it('draws none outside the desktop app', async () => {
    setAppWindow(null)
    render(<App />)
    await waitFor(() => expect(bar()).toBeTruthy())
    expect(bar().hasAttribute('data-title-bar')).toBe(false)
  })
})
