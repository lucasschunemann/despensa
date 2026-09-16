export const PEOPLE = ['Bela', 'Lucas'] as const
export type Person = (typeof PEOPLE)[number]

export type ItemStatus = 'pendente' | 'pegado'

export interface Item {
  id: string
  room_id: string
  name: string
  quantity: string | null
  added_by: string
  status: ItemStatus
  created_at: string
  picked_at: string | null
}

export type ExpenseStatus = 'pendente' | 'pago'

/** 'meio' divide ao meio; o nome de uma pessoa deixa a conta inteira com ela. */
export type Split = 'meio' | Person

export interface Expense {
  id: string
  room_id: string
  title: string
  amount_cents: number
  /** sempre o dia 1 do mês, em texto ISO (YYYY-MM-DD) */
  month: string
  due_day: number | null
  split: string
  status: ExpenseStatus
  paid_by: string | null
  paid_at: string | null
  settled: boolean
  recurrence_id: string | null
  created_by: string
  created_at: string
}
