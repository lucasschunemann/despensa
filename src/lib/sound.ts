import { prefs } from './prefs'

// Sons sintetizados na hora (nenhum arquivo de áudio para baixar): ruído curtíssimo
// passado por um filtro estreito vira um clique seco, mecânico.
let ctx: AudioContext | null = null
let unlocked = false

// Safari 16.4+: declarar a sessão como "playback" faz o áudio tocar mesmo com a
// chavinha de silencioso do iPhone ligada — que é onde o som sumia.
interface AudioSession {
  type: string
}
type NavigatorWithSession = Navigator & { audioSession?: AudioSession }

function context(): AudioContext | null {
  type WithWebkit = typeof window & { webkitAudioContext?: typeof AudioContext }
  const Ctor = window.AudioContext ?? (window as WithWebkit).webkitAudioContext
  if (!Ctor) return null
  ctx ??= new Ctor()
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

interface ClickOptions {
  freq: number
  decay: number
  gain: number
  q?: number
}

function click(c: AudioContext, at: number, { freq, decay, gain, q = 1.1 }: ClickOptions) {
  const frames = Math.max(1, Math.ceil(c.sampleRate * decay))
  const buffer = c.createBuffer(1, frames, c.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < frames; i++) {
    // envelope bem íngreme: é o que dá o caráter "seco" em vez de "nota"
    data[i] = (Math.random() * 2 - 1) * (1 - i / frames) ** 14
  }

  const source = c.createBufferSource()
  source.buffer = buffer
  const band = c.createBiquadFilter()
  band.type = 'bandpass'
  band.frequency.value = freq
  band.Q.value = q
  const volume = c.createGain()
  volume.gain.value = gain

  source.connect(band).connect(volume).connect(c.destination)
  source.start(at)
}

function tone(c: AudioContext, at: number, freq: number, duration: number, gain: number) {
  const osc = c.createOscillator()
  osc.type = 'triangle'
  osc.frequency.value = freq
  const volume = c.createGain()
  volume.gain.setValueAtTime(0.0001, at)
  volume.gain.exponentialRampToValueAtTime(gain, at + 0.008)
  volume.gain.exponentialRampToValueAtTime(0.0001, at + duration)
  osc.connect(volume).connect(c.destination)
  osc.start(at)
  osc.stop(at + duration + 0.02)
}

function play(fn: (c: AudioContext, now: number) => void) {
  if (!prefs.soundOn()) return
  try {
    const c = context()
    if (!c) return
    fn(c, c.currentTime)
  } catch {
    /* áudio é bônus: nunca pode derrubar a interação */
  }
}

export const sound = {
  // O navegador só libera áudio dentro de um toque do usuário: aqui tocamos um buffer
  // mudo de 1 frame, que é o que "destrava" o áudio no iOS pelo resto da sessão.
  unlock() {
    try {
      const session = (navigator as NavigatorWithSession).audioSession
      if (session) session.type = 'playback'

      const c = context()
      if (!c || unlocked) return

      const source = c.createBufferSource()
      source.buffer = c.createBuffer(1, 1, c.sampleRate)
      source.connect(c.destination)
      source.start(0)
      unlocked = true
    } catch {
      /* ignora */
    }
  },

  // iOS suspende o contexto quando o app vai para segundo plano.
  installUnlockListeners() {
    const unlock = () => sound.unlock()
    window.addEventListener('pointerdown', unlock, { passive: true })
    window.addEventListener('touchend', unlock, { passive: true })
    window.addEventListener('keydown', unlock)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && ctx?.state === 'suspended') void ctx.resume()
    })
  },
  add: () =>
    play((c, now) => {
      click(c, now, { freq: 850, decay: 0.05, gain: 0.5 })
    }),
  pick: () =>
    play((c, now) => {
      click(c, now, { freq: 2600, decay: 0.028, gain: 0.34, q: 1.6 })
    }),
  undo: () =>
    play((c, now) => {
      click(c, now, { freq: 520, decay: 0.045, gain: 0.3 })
    }),
  complete: () =>
    play((c, now) => {
      click(c, now, { freq: 2400, decay: 0.03, gain: 0.3, q: 1.6 })
      click(c, now + 0.075, { freq: 2400, decay: 0.03, gain: 0.3, q: 1.6 })
      tone(c, now + 0.15, 1046.5, 0.22, 0.12)
    }),
}
