import { useSyncExternalStore } from 'react'
import { load, save } from './storage'

const SOUND_KEY = 'despensa:som'

let soundOn = load(SOUND_KEY) !== 'off'
const listeners = new Set<() => void>()

export const prefs = {
  soundOn: () => soundOn,
  setSoundOn(value: boolean) {
    soundOn = value
    save(SOUND_KEY, value ? 'on' : 'off')
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
