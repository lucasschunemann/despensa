// O mês é sempre o dia 1, em texto ISO, igual ao que o banco guarda.
export function monthKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`
}

export function shiftMonth(key: string, delta: number): string {
  const [year, month] = key.split('-').map(Number)
  return monthKey(new Date(year, month - 1 + delta, 1))
}

const LONG = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' })
const SHORT = new Intl.DateTimeFormat('pt-BR', { month: 'long' })

export function monthLabel(key: string): string {
  const [year, month] = key.split('-').map(Number)
  const date = new Date(year, month - 1, 1)
  const thisYear = new Date().getFullYear() === year
  return (thisYear ? SHORT : LONG).format(date)
}

export function isCurrentMonth(key: string): boolean {
  return key === monthKey()
}
