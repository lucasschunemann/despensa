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

/**
 * O contexto é um só no app inteiro. O iPhone limita quantos existem e destravar
 * um não destrava os outros, então o trio da apresentação usa este mesmo.
 */
export function audioContext(): AudioContext | null {
  return context()
}

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

// ruído que varre de uma frequência para outra: papel rasgando
function sweep(c: AudioContext, at: number, from: number, to: number, duration: number, gain: number) {
  const frames = Math.ceil(c.sampleRate * duration)
  const buffer = c.createBuffer(1, frames, c.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < frames; i++) {
    // papel não rasga liso: o ruído vem em pequenas rajadas
    const grain = Math.random() < 0.35 ? 1 : 0.25
    data[i] = (Math.random() * 2 - 1) * grain * (1 - i / frames) ** 1.5
  }
  const source = c.createBufferSource()
  source.buffer = buffer
  const band = c.createBiquadFilter()
  band.type = 'bandpass'
  band.Q.value = 0.9
  band.frequency.setValueAtTime(from, at)
  band.frequency.exponentialRampToValueAtTime(to, at + duration)
  const volume = c.createGain()
  volume.gain.value = gain
  source.connect(band).connect(volume).connect(c.destination)
  source.start(at)
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
  // conta paga: dois tiques secos e uma nota curta subindo, como uma maquininha
  cash: () =>
    play((c, now) => {
      click(c, now, { freq: 2200, decay: 0.03, gain: 0.32, q: 1.7 })
      click(c, now + 0.055, { freq: 3100, decay: 0.025, gain: 0.26, q: 1.8 })
      tone(c, now + 0.1, 1318.5, 0.16, 0.1)
    }),
  // acerto de contas: nota descendo, "zerou"
  settle: () =>
    play((c, now) => {
      click(c, now, { freq: 1600, decay: 0.035, gain: 0.3 })
      tone(c, now + 0.07, 880, 0.14, 0.09)
      tone(c, now + 0.19, 587.3, 0.2, 0.08)
    }),
  // leitor de código de barras
  scan: () =>
    play((c, now) => {
      tone(c, now, 2093, 0.09, 0.07)
    }),
  // carimbo batendo no papel
  stamp: () =>
    play((c, now) => {
      click(c, now, { freq: 220, decay: 0.09, gain: 0.9, q: 0.7 })
      click(c, now + 0.004, { freq: 1200, decay: 0.03, gain: 0.25 })
    }),
  tear: () =>
    play((c, now) => {
      sweep(c, now, 900, 4200, 0.28, 0.5)
    }),
  // impressora soltando o boleto
  print: () =>
    play((c, now) => {
      for (let i = 0; i < 5; i++) click(c, now + i * 0.035, { freq: 3200, decay: 0.012, gain: 0.14, q: 2 })
    }),
  // produto pousando na prateleira
  drop: () =>
    play((c, now) => {
      click(c, now, { freq: 420, decay: 0.06, gain: 0.55, q: 0.8 })
    }),
  // brilho do desejo realizado
  shimmer: () =>
    play((c, now) => {
      ;[1568, 2093, 2637].forEach((f, i) => tone(c, now + i * 0.06, f, 0.22, 0.05))
    }),
  // seleção: o tique quase mudo de uma roda de seleção do iPhone (pasta, mês, chavinha)
  tick: () =>
    play((c, now) => {
      click(c, now, { freq: 1900, decay: 0.012, gain: 0.14, q: 2.2 })
    }),
  // abrir um módulo: um sopro curto de papel subindo; voltar faz o caminho contrário
  open: () =>
    play((c, now) => {
      sweep(c, now, 500, 1800, 0.13, 0.07)
    }),
  close: () =>
    play((c, now) => {
      sweep(c, now, 1600, 450, 0.12, 0.06)
    }),
  complete: () =>
    play((c, now) => {
      click(c, now, { freq: 2400, decay: 0.03, gain: 0.3, q: 1.6 })
      click(c, now + 0.075, { freq: 2400, decay: 0.03, gain: 0.3, q: 1.6 })
      tone(c, now + 0.15, 1046.5, 0.22, 0.12)
    }),
}
