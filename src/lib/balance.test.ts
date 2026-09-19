import { describe, expect, it } from 'vitest'
import { summarize } from './balance'
import type { Expense } from './types'

const PEOPLE = ['Lucas', 'Bela'] as const

function expense(partial: Partial<Expense>): Expense {
  return {
    id: crypto.randomUUID(),
    room_id: 'r',
    title: 'Conta',
    amount_cents: 10000,
    month: '2026-09-01',
    due_day: null,
    split: 'meio',
    status: 'pendente',
    paid_by: null,
    paid_at: null,
    settled: false,
    recurrence_id: null,
    folder_id: null,
    created_by: 'Lucas',
    created_at: '2026-09-01T00:00:00Z',
    ...partial,
  }
}

describe('summarize', () => {
  it('soma o mês e separa o que falta pagar', () => {
    const s = summarize(
      [
        expense({ amount_cents: 20000, status: 'pago', paid_by: 'Lucas' }),
        expense({ amount_cents: 5000 }),
      ],
      PEOPLE,
    )
    expect(s.totalCents).toBe(25000)
    expect(s.paidCents).toBe(20000)
    expect(s.pendingCents).toBe(5000)
    expect(s.paidByPerson).toEqual({ Lucas: 20000, Bela: 0 })
  })

  it('conta dividida: quem pagou fica credor da metade', () => {
    const s = summarize([expense({ amount_cents: 20000, status: 'pago', paid_by: 'Lucas' })], PEOPLE)
    expect(s.debt).toEqual({ from: 'Bela', to: 'Lucas', cents: 10000 })
  })

  it('conta de uma pessoa só, paga pela outra, deve o valor inteiro', () => {
    const s = summarize(
      [expense({ amount_cents: 9000, split: 'Bela', status: 'pago', paid_by: 'Lucas' })],
      PEOPLE,
    )
    expect(s.debt).toEqual({ from: 'Bela', to: 'Lucas', cents: 9000 })
  })

  it('pagamentos dos dois se compensam', () => {
    const s = summarize(
      [
        expense({ amount_cents: 20000, status: 'pago', paid_by: 'Lucas' }),
        expense({ amount_cents: 20000, status: 'pago', paid_by: 'Bela' }),
      ],
      PEOPLE,
    )
    expect(s.debt).toBeNull()
  })

  it('acertado não entra na dívida, mas continua no total pago', () => {
    const s = summarize(
      [expense({ amount_cents: 20000, status: 'pago', paid_by: 'Lucas', settled: true })],
      PEOPLE,
    )
    expect(s.debt).toBeNull()
    expect(s.paidCents).toBe(20000)
  })

  it('conta pendente não gera dívida', () => {
    const s = summarize([expense({ amount_cents: 30000 })], PEOPLE)
    expect(s.debt).toBeNull()
  })
})
