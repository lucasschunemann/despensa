import type { Wish } from './types'

// Ordem do cofre: o que os dois querem vem primeiro, depois o nível de vontade,
// e o empate é desfeito pelo mais antigo. É essa ordem que define a fila da poupança.
export function sortWishes(wishes: Wish[]): Wish[] {
  return [...wishes].sort(
    (a, b) =>
      b.wanted_by.length - a.wanted_by.length ||
      b.want_level - a.want_level ||
      a.created_at.localeCompare(b.created_at),
  )
}

export interface Forecast {
  /** soma deste desejo com todos os que estão na frente dele na fila */
  cumulativeCents: number
  /** quantos meses guardando até dar para comprar; null quando não há meta definida */
  monthsAway: number | null
}

export function forecast(ordered: Wish[], monthlySavingsCents: number): Map<string, Forecast> {
  const result = new Map<string, Forecast>()
  let cumulative = 0

  for (const wish of ordered) {
    cumulative += wish.price_cents
    result.set(wish.id, {
      cumulativeCents: cumulative,
      monthsAway:
        monthlySavingsCents > 0 ? Math.ceil(cumulative / monthlySavingsCents) : null,
    })
  }

  return result
}

const MONTH = new Intl.DateTimeFormat('pt-BR', { month: 'long' })
const MONTH_YEAR = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' })

/** "dá em março" — o mês em que a fila alcança este desejo. */
export function whenLabel(monthsAway: number | null, from = new Date()): string | null {
  if (monthsAway === null) return null
  if (monthsAway <= 0) return 'já dá'

  const target = new Date(from.getFullYear(), from.getMonth() + monthsAway, 1)
  const sameYear = target.getFullYear() === from.getFullYear()
  return (sameYear ? MONTH : MONTH_YEAR).format(target)
}

export function totalDream(wishes: Wish[]): number {
  return wishes.reduce((sum, wish) => sum + wish.price_cents, 0)
}
