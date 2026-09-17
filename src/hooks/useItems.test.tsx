// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createFakeSupabase } from '../test/fakeSupabase'

const fake = createFakeSupabase()
vi.mock('../lib/supabase', () => ({ supabase: fake.client }))

const { useItems } = await import('./useItems')
const { outbox } = await import('../lib/sync')

const ROOM = 'sala-1'

beforeEach(async () => {
  fake.setOnline(true)
  fake.tables.items = [
    { id: 'leite', room_id: ROOM, name: 'Leite', quantity: '2', added_by: 'Bela', status: 'pendente', created_at: '2026-09-17T10:00:00Z', picked_at: null },
  ]
  fake.calls.length = 0
  await outbox.flush()
})

describe('mercado sem sinal', () => {
  it('pegar, adicionar e apagar sem sinal aparecem na hora e chegam quando o sinal volta', async () => {
    const { result } = renderHook(() => useItems(ROOM, 'Lucas'))
    await waitFor(() => expect(result.current.ready).toBe(true))

    fake.setOnline(false)
    act(() => {
      result.current.toggle(result.current.items[0])
      result.current.add('Pão', null)
    })

    // na tela, na hora
    expect(result.current.items.map((i) => [i.name, i.status])).toEqual([
      ['Leite', 'pegado'],
      ['Pão', 'pendente'],
    ])
    // e nada chegou ao servidor
    await waitFor(() => expect(outbox.getState()).toMatchObject({ pending: 2, offline: true }))
    expect(fake.tables.items).toHaveLength(1)
    expect(fake.tables.items[0].status).toBe('pendente')

    // o app tenta atualizar sem sinal: a tela não pode perder o que foi feito
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    expect(result.current.items.map((i) => i.name)).toEqual(['Leite', 'Pão'])

    // sinal volta
    fake.setOnline(true)
    await act(async () => {
      await outbox.flush()
    })
    expect(outbox.getState().pending).toBe(0)
    expect(fake.tables.items.map((r) => [r.name, r.status])).toEqual([
      ['Leite', 'pegado'],
      ['Pão', 'pendente'],
    ])
    expect(fake.calls).toEqual(['update items', 'upsert items'])
  })

  it('atualização do servidor chegando antes da fila não desfaz o que você fez', async () => {
    const { result } = renderHook(() => useItems(ROOM, 'Lucas'))
    await waitFor(() => expect(result.current.ready).toBe(true))

    // escrita falha (sem sinal), mas a leitura vem de um cache ou reconexão parcial
    fake.setOnline(false)
    act(() => result.current.remove(result.current.items[0]))
    fake.setOnline(true)
    // o servidor ainda tem o Leite, porque o apagar não chegou
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'))
      await new Promise((r) => setTimeout(r, 0))
    })
    expect(result.current.items.map((i) => i.name)).not.toContain('Leite')
  })

  it('finalizar a compra sem sinal tira os pegos da tela e fecha a compra quando volta', async () => {
    fake.tables.items.push({ id: 'cafe', room_id: ROOM, name: 'Café', quantity: null, added_by: 'Lucas', status: 'pegado', created_at: '2026-09-17T10:01:00Z', picked_at: '2026-09-17T11:00:00Z' })
    const { result } = renderHook(() => useItems(ROOM, 'Lucas'))
    await waitFor(() => expect(result.current.items).toHaveLength(2))

    fake.setOnline(false)
    act(() => result.current.finishShopping())
    expect(result.current.items.map((i) => i.name)).toEqual(['Leite'])

    fake.setOnline(true)
    await act(async () => {
      await outbox.flush()
    })
    expect(fake.tables.items.map((r) => r.name)).toEqual(['Leite'])
  })

  it('servidor recusando: mostra o erro e a tela volta ao que o servidor tem', async () => {
    const { result } = renderHook(() => useItems(ROOM, 'Lucas'))
    await waitFor(() => expect(result.current.ready).toBe(true))

    fake.rejectNextWrite('new row violates row-level security policy')
    await act(async () => {
      result.current.add('Coisa proibida', null)
      await new Promise((r) => setTimeout(r, 10))
    })
    await waitFor(() => expect(result.current.error).toMatch(/row-level security/))
    await waitFor(() => expect(result.current.items.map((i) => i.name)).toEqual(['Leite']))
    expect(outbox.getState().pending).toBe(0)
  })
})
