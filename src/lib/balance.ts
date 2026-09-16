import type { Expense } from './types'

export interface MonthSummary {
  totalCents: number
  paidCents: number
  pendingCents: number
  /** quanto cada um desembolsou no mês */
  paidByPerson: Record<string, number>
  /** quem deve para quem, considerando só o que já foi pago e ainda não foi acertado */
  debt: { from: string; to: string; cents: number } | null
}

// Como a conta é dividida: 'meio' é metade para cada um; senão é toda da pessoa nomeada.
function shareOf(expense: Expense, person: string): number {
  if (expense.split === 'meio') return Math.round(expense.amount_cents / 2)
  return expense.split === person ? expense.amount_cents : 0
}

export function summarize(expenses: Expense[], people: readonly string[]): MonthSummary {
  const net: Record<string, number> = {}
  const paidByPerson: Record<string, number> = {}
  for (const person of people) {
    net[person] = 0
    paidByPerson[person] = 0
  }

  let totalCents = 0
  let paidCents = 0

  for (const expense of expenses) {
    totalCents += expense.amount_cents
    if (expense.status !== 'pago') continue
    paidCents += expense.amount_cents

    const payer = expense.paid_by
    if (payer && payer in paidByPerson) paidByPerson[payer] += expense.amount_cents
    if (expense.settled || !payer || !(payer in net)) continue

    // quem pagou fica no positivo pela parte que não era dele
    for (const person of people) {
      const share = shareOf(expense, person)
      if (person === payer) net[person] += expense.amount_cents - share
      else net[person] -= share
    }
  }

  const [a, b] = people
  const diff = net[a] ?? 0
  const debt =
    diff > 0
      ? { from: b, to: a, cents: diff }
      : diff < 0
        ? { from: a, to: b, cents: -diff }
        : null

  return {
    totalCents,
    paidCents,
    pendingCents: totalCents - paidCents,
    paidByPerson,
    debt,
  }
}
