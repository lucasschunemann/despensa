import { useSyncExternalStore } from 'react'
import { load, save } from './storage'

const SOUND_KEY = 'despensa:som'
const THEME_KEY = 'despensa:tema'

export type ThemePreference = 'system' | 'light' | 'dark'

let soundOn = load(SOUND_KEY) !== 'off'
let theme: ThemePreference = (() => {
  const stored = load(THEME_KEY)
  return stored === 'light' || stored === 'dark' ? stored : 'system'
})()
const listeners = new Set<() => void>()

function resolvedTheme() {
  if (theme !== 'system') return theme
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyTheme() {
  const resolved = resolvedTheme()
  document.documentElement.dataset.theme = resolved
  document.documentElement.style.colorScheme = resolved
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', resolved === 'dark' ? '#101010' : '#f7f7f5')
}

let installed = false

export function installTheme() {
  applyTheme()
  if (installed) return
  installed = true
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (theme === 'system') applyTheme()
  })
}

export const prefs = {
  soundOn: () => soundOn,
  setSoundOn(value: boolean) {
    soundOn = value
    save(SOUND_KEY, value ? 'on' : 'off')
    listeners.forEach((l) => l())
  },
  theme: () => theme,
  setTheme(value: ThemePreference) {
    theme = value
    save(THEME_KEY, value)
    applyTheme()
    listeners.forEach((l) => l())
  },
  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
}

export function useSoundOn() {
  return useSyncExternalStore(prefs.subscribe, prefs.soundOn, () => true)
}

export function useThemePreference() {
  return useSyncExternalStore(prefs.subscribe, prefs.theme, () => 'system' as ThemePreference)
}
