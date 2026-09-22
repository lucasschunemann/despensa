import { prefs } from './prefs'
import { audioContext } from './sound'

/**
 * O trio do camarão: um saxofone sintetizado, contrabaixo caminhando e vassourinha.
 *
 * Fica fora de `sound.ts` de propósito. O som do app é seco e mecânico por decisão
 * de design; a apresentação é o único lugar onde o camarão toca de verdade, e a
 * pessoa vai montando um lick conforme faz os gestos.
 *
 * Nada de arquivo de áudio: tudo é sintetizado, como no resto do app.
 */

let mestre: GainNode | null = null
let relogio: number | null = null
let proxima = 0
let batida = 0

const BPM = 96
const PULSO = 60 / BPM
const SWING = 0.64 // onde cai a colcheia de trás: jazz não divide o tempo ao meio

/** Frequência de uma nota MIDI. 69 é o lá de 440 Hz. */
export function freq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12)
}

/**
 * Contrabaixo andando em fá, quatro compassos: F7, Bb7, F7, C7.
 *
 * Anda de grau em grau e chega na tônica do compasso seguinte por meio tom ou
 * um tom, que é o que faz a linha soar caminhando em vez de pular. Nenhum passo
 * passa de um tom — inclusive na volta do fim para o começo.
 */
export const CAMINHADA = [
  41, 43, 45, 47, // F  G  A  B   → aproxima o Bb por meio tom
  46, 48, 50, 51, // Bb C  D  Eb
  53, 51, 50, 48, // F  Eb D  C
  48, 46, 45, 43, // C  Bb A  G   → volta ao F por um tom
]

/** Escala de blues em fá: o lick que a pessoa vai montando gesto a gesto. */
export const LICK = [65, 68, 70, 71, 72, 75, 77]

let passoDoLick = 0

/** Próxima nota do lick; volta ao começo uma oitava acima do sentido, não do tom. */
export function proximaNota(): number {
  const nota = LICK[passoDoLick % LICK.length]
  passoDoLick += 1
  return nota
}

export function reiniciarLick() {
  passoDoLick = 0
}

function contexto(): AudioContext | null {
  try {
    const c = audioContext()
    if (!c) return null
    if (!mestre) {
      mestre = c.createGain()
      mestre.gain.value = 1
      mestre.connect(c.destination)
    }
    return c
  } catch {
    return null
  }
}

function ruido(c: AudioContext, segundos: number): AudioBuffer {
  const quadros = Math.max(1, Math.ceil(c.sampleRate * segundos))
  const buffer = c.createBuffer(1, quadros, c.sampleRate)
  const dados = buffer.getChannelData(0)
  for (let i = 0; i < quadros; i++) dados[i] = Math.random() * 2 - 1
  return buffer
}

interface OpcoesSax {
  ganho?: number
  /** entra na nota deslizando de baixo, como quem embuça a palheta */
  escorrega?: boolean
}

/**
 * Uma nota de sax. O timbre vem de três coisas somadas: duas serras levemente
 * desafinadas (corpo), dois filtros estreitos nas formantes do instrumento (a
 * "voz" do sax) e um sopro curto de ruído no ataque (a palheta pegando).
 */
function sax(c: AudioContext, em: number, midi: number, duracao: number, { ganho = 0.13, escorrega = false }: OpcoesSax = {}) {
  const destino = mestre
  if (!destino) return
  const f = freq(midi)

  const envelope = c.createGain()
  envelope.gain.setValueAtTime(0.0001, em)
  envelope.gain.exponentialRampToValueAtTime(ganho, em + 0.055)
  envelope.gain.setValueAtTime(ganho, em + duracao * 0.6)
  envelope.gain.exponentialRampToValueAtTime(0.0001, em + duracao)
  envelope.connect(destino)

  // corpo: o filtro abre junto com o ataque, que é o "florescer" da palheta
  const corpo = c.createBiquadFilter()
  corpo.type = 'lowpass'
  corpo.Q.value = 0.9
  corpo.frequency.setValueAtTime(760, em)
  corpo.frequency.exponentialRampToValueAtTime(Math.min(4200, f * 7), em + 0.09)
  corpo.frequency.exponentialRampToValueAtTime(Math.max(900, f * 3), em + duracao)
  corpo.connect(envelope)

  // formantes: é o que separa "serra com filtro" de "sax"
  for (const [centro, q, peso] of [[720, 7, 0.5], [1680, 9, 0.34]] as const) {
    const formante = c.createBiquadFilter()
    formante.type = 'bandpass'
    formante.frequency.value = centro
    formante.Q.value = q
    const peso2 = c.createGain()
    peso2.gain.value = peso
    formante.connect(peso2).connect(envelope)
    ;(corpo as unknown as { _formantes?: BiquadFilterNode[] })._formantes ??= []
    ;(corpo as unknown as { _formantes: BiquadFilterNode[] })._formantes.push(formante)
  }
  const formantes = (corpo as unknown as { _formantes: BiquadFilterNode[] })._formantes

  // vibrato: entra depois do ataque, como um sopro humano
  const lfo = c.createOscillator()
  lfo.type = 'sine'
  lfo.frequency.value = 5.4
  const profundidade = c.createGain()
  profundidade.gain.setValueAtTime(0, em)
  profundidade.gain.linearRampToValueAtTime(14, em + Math.min(0.28, duracao * 0.5))
  lfo.connect(profundidade)
  lfo.start(em)
  lfo.stop(em + duracao + 0.1)

  for (const desafina of [-6, 7]) {
    const osc = c.createOscillator()
    osc.type = 'sawtooth'
    osc.frequency.value = f
    if (escorrega) {
      osc.frequency.setValueAtTime(f * 0.86, em)
      osc.frequency.exponentialRampToValueAtTime(f, em + 0.13)
    }
    osc.detune.value = desafina
    profundidade.connect(osc.detune)
    osc.connect(corpo)
    for (const formante of formantes) osc.connect(formante)
    osc.start(em)
    osc.stop(em + duracao + 0.1)
  }

  // sopro da palheta
  const ar = c.createBufferSource()
  ar.buffer = ruido(c, 0.07)
  const agudo = c.createBiquadFilter()
  agudo.type = 'highpass'
  agudo.frequency.value = 1400
  const volumeAr = c.createGain()
  volumeAr.gain.setValueAtTime(ganho * 0.45, em)
  volumeAr.gain.exponentialRampToValueAtTime(0.0001, em + 0.07)
  ar.connect(agudo).connect(volumeAr).connect(destino)
  ar.start(em)
}

/** Contrabaixo: onda macia com ataque de dedo e decaimento curto. */
function baixo(c: AudioContext, em: number, midi: number) {
  const destino = mestre
  if (!destino) return
  const osc = c.createOscillator()
  osc.type = 'triangle'
  osc.frequency.value = freq(midi)
  const envelope = c.createGain()
  envelope.gain.setValueAtTime(0.0001, em)
  envelope.gain.exponentialRampToValueAtTime(0.09, em + 0.014)
  envelope.gain.exponentialRampToValueAtTime(0.0001, em + PULSO * 0.92)
  const macio = c.createBiquadFilter()
  macio.type = 'lowpass'
  macio.frequency.value = 420
  osc.connect(macio).connect(envelope).connect(destino)
  osc.start(em)
  osc.stop(em + PULSO)
}

/** Vassourinha: chiado curtíssimo, bem baixo, só para marcar o tempo. */
function vassoura(c: AudioContext, em: number, forca: number) {
  const destino = mestre
  if (!destino) return
  const fonte = c.createBufferSource()
  fonte.buffer = ruido(c, 0.05)
  const agudo = c.createBiquadFilter()
  agudo.type = 'highpass'
  agudo.frequency.value = 5200
  const envelope = c.createGain()
  envelope.gain.setValueAtTime(forca, em)
  envelope.gain.exponentialRampToValueAtTime(0.0001, em + 0.05)
  fonte.connect(agudo).connect(envelope).connect(destino)
  fonte.start(em)
}

function agendar() {
  const c = contexto()
  if (!c || !mestre) return
  if (!prefs.soundOn()) { parar(); return }
  while (proxima < c.currentTime + 0.3) {
    const passo = batida % CAMINHADA.length
    baixo(c, proxima, CAMINHADA[passo])
    // 2 e 4 levam a vassourinha; a colcheia de trás vem atrasada, que é o suingue
    vassoura(c, proxima, batida % 4 === 1 || batida % 4 === 3 ? 0.035 : 0.014)
    vassoura(c, proxima + PULSO * SWING, 0.01)
    proxima += PULSO
    batida += 1
  }
}

function parar() {
  if (relogio !== null) { clearInterval(relogio); relogio = null }
}

export const jazz = {
  /** Começa o trio. Só pode ser chamado de dentro de um gesto (regra do iPhone). */
  comecar() {
    if (relogio !== null || !prefs.soundOn()) return
    const c = contexto()
    if (!c || !mestre) return
    mestre.gain.cancelScheduledValues(c.currentTime)
    mestre.gain.setValueAtTime(0.0001, c.currentTime)
    mestre.gain.exponentialRampToValueAtTime(1, c.currentTime + 1.2)
    proxima = c.currentTime + 0.12
    batida = 0
    reiniciarLick()
    relogio = window.setInterval(agendar, 60)
    agendar()
  },

  /** Desliga com um fade, para não cortar a nota no meio. */
  terminar() {
    parar()
    const c = mestre ? audioContext() : null
    if (!c || !mestre) return
    mestre.gain.cancelScheduledValues(c.currentTime)
    mestre.gain.setValueAtTime(mestre.gain.value, c.currentTime)
    mestre.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.5)
  },

  /** A próxima nota do lick: cada gesto da pessoa acrescenta uma. */
  nota(opcoes: OpcoesSax = {}) {
    if (!prefs.soundOn()) return
    const c = contexto()
    if (!c) return
    sax(c, c.currentTime, proximaNota(), 0.42, opcoes)
  },

  /** Nota escorregada, para o momento do carimbo. */
  bend() {
    if (!prefs.soundOn()) return
    const c = contexto()
    if (!c) return
    sax(c, c.currentTime, 68, 0.72, { escorrega: true, ganho: 0.15 })
  },

  /** Duas notas juntas: usado quando os dois querem a mesma coisa. */
  dupla() {
    if (!prefs.soundOn()) return
    const c = contexto()
    if (!c) return
    sax(c, c.currentTime, 65, 0.6, { ganho: 0.1 })
    sax(c, c.currentTime + 0.01, 72, 0.6, { ganho: 0.09 })
  },

  /** Frases curtas: abertura, virada entre cenas e a resolução do fim. */
  frase(tipo: 'abertura' | 'virada' | 'final') {
    if (!prefs.soundOn()) return
    const c = contexto()
    if (!c) return
    const agora = c.currentTime
    const linhas: Record<typeof tipo, Array<[number, number, number]>> = {
      // [nota, atraso, duração]
      abertura: [[65, 0, 0.2], [68, 0.16, 0.2], [72, 0.32, 0.55]],
      virada: [[70, 0, 0.16], [72, 0.13, 0.3]],
      final: [[72, 0, 0.18], [75, 0.15, 0.18], [77, 0.3, 0.2], [72, 0.48, 0.9]],
    }
    for (const [nota, atraso, duracao] of linhas[tipo]) {
      sax(c, agora + atraso, nota, duracao, { ganho: tipo === 'final' ? 0.15 : 0.12 })
    }
  },
}
