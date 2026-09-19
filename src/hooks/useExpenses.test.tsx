// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createFakeSupabase } from '../test/fakeSupabase'

const fake = createFakeSupabase()
vi.mock('../lib/supabase', () => ({ supabase: fake.client }))

const { useExpenses } = await import('./useExpenses')
const { useWishes } = await import('./useWishes')
const { outbox } = await import('../lib/sync')

const ROOM = 'sala-1'
const MONTH = '2026-09-01'

beforeEach(async () => {
  fake.setOnline(true)
  fake.tables.expenses = [
    { id: 'luz', room_id: ROOM, title: 'Luz', amount_cents: 18000, month: MONTH, due_day: 20, split: 'meio', status: 'pendente', paid_by: null, paid_at: null, settled: false, recurrence_id: 'r-luz', folder_id: null, created_by: 'Lucas', created_at: '2026-09-01T00:00:00Z' },
  ]
  fake.tables.expense_folders = []
  fake.tables.recurrences = [{ id: 'r-luz', room_id: ROOM, folder_id: null }]
  fake.tables.wishes = [
    { id: 'abajur', room_id: ROOM, title: 'Abajur', price_cents: 32000, link: null, image_url: null, want_level: 2, wanted_by: [], status: 'querendo', bought_at: null, bought_by: null, created_by: 'Bela', created_at: '2026-09-01T00:00:00Z' },
  ]
  fake.calls.length = 0
  await outbox.flush()
})

describe('contas', () => {
  it('pagar sem sinal chega quando volta', async () => {
    const { result } = renderHook(() => useExpenses(ROOM, 'Lucas', MONTH))
    await waitFor(() => expect(result.current.expenses).toHaveLength(1))

    fake.setOnline(false)
    act(() => result.current.togglePaid(result.current.expenses[0]))
    expect(result.current.expenses[0].status).toBe('pago')

    fake.setOnline(true)
    await act(async () => {
      await outbox.flush()
    })
    expect(fake.tables.expenses[0]).toMatchObject({ status: 'pago', paid_by: 'Lucas' })
  })

  it('editar só deste mês muda a linha; em diante chama a função da recorrência', async () => {
    const { result } = renderHook(() => useExpenses(ROOM, 'Lucas', MONTH))
    await waitFor(() => expect(result.current.expenses).toHaveLength(1))

    await act(async () => {
      result.current.edit(result.current.expenses[0], { title: 'Luz', amountCents: 21350, dueDay: 22 }, 'mes')
      await outbox.flush()
    })
    expect(fake.tables.expenses[0]).toMatchObject({ amount_cents: 21350, due_day: 22 })
    expect(fake.calls).toContain('update expenses')

    await act(async () => {
      result.current.edit(result.current.expenses[0], { title: 'Energia', amountCents: 19900, dueDay: 20 }, 'futuro')
      await outbox.flush()
    })
    expect(result.current.expenses[0]).toMatchObject({ title: 'Energia', amount_cents: 19900 })
    expect(fake.calls).toContain('rpc update_recurring')
  })

  it('cria pasta e move contas mantendo a recorrência organizada', async () => {
    const { result } = renderHook(() => useExpenses(ROOM, 'Lucas', MONTH))
    await waitFor(() => expect(result.current.expenses).toHaveLength(1))

    await act(async () => {
      result.current.addFolder('casa', 'blue')
      await outbox.flush()
    })
    expect(result.current.folders).toHaveLength(1)
    expect(fake.tables.expense_folders[0]).toMatchObject({ name: 'casa', color: 'blue' })

    const folder = result.current.folders[0]
    await act(async () => {
      result.current.moveExpenses(['luz'], folder.id)
      await outbox.flush()
    })
    expect(fake.tables.expenses[0].folder_id).toBe(folder.id)
    expect(fake.tables.recurrences[0].folder_id).toBe(folder.id)
  })
})

describe('desejos', () => {
  it('coração sem sinal: manda o valor final, não "alternar"', async () => {
    const { result } = renderHook(() => useWishes(ROOM, 'Lucas'))
    await waitFor(() => expect(result.current.wishes).toHaveLength(1))

    fake.setOnline(false)
    act(() => result.current.toggleWant(result.current.wishes[0]))
    act(() => result.current.toggleWant(result.current.wishes[0]))
    act(() => result.current.toggleWant(result.current.wishes[0]))
    expect(result.current.wishes[0].wanted_by).toEqual(['Lucas'])

    const args = outbox.pending().map((op) => op.args?.p_want)
    expect(args).toEqual([true, false, true])

    fake.setOnline(true)
    await act(async () => {
      await outbox.flush()
    })
    expect(outbox.getState().pending).toBe(0)
  })

  it('renomear chega ao servidor', async () => {
    const { result } = renderHook(() => useWishes(ROOM, 'Lucas'))
    await waitFor(() => expect(result.current.wishes).toHaveLength(1))
    await act(async () => {
      result.current.rename(result.current.wishes[0], 'Abajur de mesa')
      await outbox.flush()
    })
    expect(fake.tables.wishes[0].title).toBe('Abajur de mesa')
  })
})
