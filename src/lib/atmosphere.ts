/** Contas puras do colofão e do letreiro: fase da lua e número da edição do dia. */

const SYNODIC = 29.530588853
// uma lua nova conhecida: 6 de janeiro de 2000, 18h14 UTC
const KNOWN_NEW = Date.UTC(2000, 0, 6, 18, 14)

/** Fase da lua de 0 a 1: 0 nova, 0,25 crescente, 0,5 cheia, 0,75 minguante. */
export function moonPhase(date = new Date()): number {
  const days = (date.getTime() - KNOWN_NEW) / 86_400_000
  const phase = (days % SYNODIC) / SYNODIC
  return phase < 0 ? phase + 1 : phase
}

export function moonName(phase: number): string {
  if (phase < 0.03 || phase > 0.97) return 'lua nova'
  if (phase < 0.22) return 'lua crescente'
  if (phase < 0.28) return 'quarto crescente'
  if (phase < 0.47) return 'crescente gibosa'
  if (phase < 0.53) return 'lua cheia'
  if (phase < 0.72) return 'minguante gibosa'
  if (phase < 0.78) return 'quarto minguante'
  return 'lua minguante'
}

/**
 * Caminho SVG da parte acesa da lua, num círculo de raio `r` centrado em (r, r).
 * A borda de fora é um semicírculo; o terminador é uma meia elipse que abre e fecha.
 */
export function moonPath(phase: number, r = 10): string {
  const waxing = phase < 0.5
  // 1 na nova e na cheia (terminador colado na borda), 0 nos quartos (reto)
  const k = Math.cos(phase * 2 * Math.PI)
  const rx = Math.abs(k) * r
  const top = `${r} 0`
  const bottom = `${r} ${2 * r}`
  // lado aceso: direita quando cresce, esquerda quando míngua (hemisfério sul inverte,
  // mas o desenho clássico é o que as pessoas reconhecem)
  const outerSweep = waxing ? 1 : 0
  // antes do quarto o terminador curva para o lado aceso (fatia fina);
  // depois, para o lado escuro (gibosa)
  const innerSweep = (k > 0) === waxing ? 0 : 1
  return `M${top} A${r} ${r} 0 0 ${outerSweep} ${bottom} A${rx.toFixed(2)} ${r} 0 0 ${innerSweep} ${top}Z`
}

/** Cada dia é uma edição: o número é o dia do ano. */
export function editionNumber(date = new Date()): number {
  const start = new Date(date.getFullYear(), 0, 0)
  return Math.floor((date.getTime() - start.getTime()) / 86_400_000)
}
