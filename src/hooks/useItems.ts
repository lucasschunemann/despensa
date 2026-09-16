import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Item } from '../lib/types'
import { uuid } from '../lib/uuid'

export type Connection = 'connecting' | 'live' | 'offline'

export interface ItemsStore {
  items: Item[]
  /** ids que acabaram de chegar da outra pessoa, para destacar por alguns segundos */
  arrivals: string[]
  ready: boolean
  connection: Connection
  error: string | null
  clearError: () => void
  add: (name: string, quantity: string | null) => void
  toggle: (item: Item) => void
  remove: (item: Item) => void
  restore: (item: Item) => void
  finishShopping: () => void
}

export function useItems(roomId: string, me: string): ItemsStore {
  const [items, setItems] = useState<Item[]>([])
  const [ready, setReady] = useState(false)
  const [connection, setConnection] = useState<Connection>('connecting')
  const [error, setError] = useState<string | null>(null)
  const [arrivals, setArrivals] = useState<string[]>([])
  // Inserts otimistas ainda não confirmados: um refetch no meio não pode apagá-los.
  const pending = useRef(new Map<string, Item>())
  // Tudo que este aparelho criou nesta sessão, para não destacar os próprios itens.
  const mine = useRef(new Set<string>())

  const refetch = useCallback(async () => {
    const { data, error } = await supabase
      .from('items')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at')
    if (error) {
      setError(error.message)
      return
    }
    const server = data as Item[]
    const ids = new Set(server.map((i) => i.id))
    setItems([...server, ...[...pending.current.values()].filter((i) => !ids.has(i.id))])
    setReady(true)
  }, [roomId])

  useEffect(() => {
    const upsert = (row: Item) =>
      setItems((prev) => {
        const idx = prev.findIndex((i) => i.id === row.id)
        if (idx === -1) return [...prev, row]
        const next = prev.slice()
        next[idx] = row
        return next
      })

    const channel = supabase
      .channel(`items:${roomId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'items', filter: `room_id=eq.${roomId}` },
        (p) => {
          const row = p.new as Item
          upsert(row)
          if (mine.current.has(row.id)) return
          setArrivals((prev) => [...prev, row.id])
          setTimeout(() => setArrivals((prev) => prev.filter((id) => id !== row.id)), 2400)
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'items', filter: `room_id=eq.${roomId}` },
        (p) => upsert(p.new as Item),
      )
      // DELETE não aceita filtro no Realtime; só chega o id, então remove se existir aqui.
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'items' }, (p) => {
        const id = (p.old as Partial<Item>).id
        if (id) setItems((prev) => prev.filter((i) => i.id !== id))
      })
      .subscribe((s) => {
        if (s === 'SUBSCRIBED') {
          setConnection('live')
          void refetch() // cobre qualquer evento perdido enquanto estava desconectado
        } else if (s === 'CHANNEL_ERROR' || s === 'TIMED_OUT' || s === 'CLOSED') {
          setConnection('offline')
        }
      })

    const onVisible = () => {
      if (document.visibilityState === 'visible') void refetch()
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      void supabase.removeChannel(channel)
    }
  }, [roomId, refetch])

  const add = useCallback(
    (name: string, quantity: string | null) => {
      const item: Item = {
        id: uuid(),
        room_id: roomId,
        name,
        quantity,
        added_by: me,
        status: 'pendente',
        created_at: new Date().toISOString(),
        picked_at: null,
      }
      pending.current.set(item.id, item)
      mine.current.add(item.id)
      setItems((prev) => [...prev, item])

      void supabase
        .from('items')
        .insert({ id: item.id, room_id: roomId, name, quantity, added_by: me })
        .then(({ error }) => {
          pending.current.delete(item.id)
          if (error) {
            setItems((prev) => prev.filter((i) => i.id !== item.id))
            setError(error.message)
          }
        })
    },
    [roomId, me],
  )

  const toggle = useCallback((item: Item) => {
    const picked = item.status === 'pendente'
    const patch = {
      status: picked ? 'pegado' : 'pendente',
      picked_at: picked ? new Date().toISOString() : null,
    } as const
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, ...patch } : i)))

    void supabase
      .from('items')
      .update(patch)
      .eq('id', item.id)
      .then(({ error }) => {
        if (error) {
          setItems((prev) => prev.map((i) => (i.id === item.id ? item : i)))
          setError(error.message)
        }
      })
  }, [])

  const remove = useCallback((item: Item) => {
    setItems((prev) => prev.filter((i) => i.id !== item.id))
    void supabase
      .from('items')
      .delete()
      .eq('id', item.id)
      .then(({ error }) => {
        if (error) {
          setItems((prev) => [...prev, item])
          setError(error.message)
        }
      })
  }, [])

  // volta um item apagado exatamente como estava (inclusive o id)
  const restore = useCallback((item: Item) => {
    pending.current.set(item.id, item)
    mine.current.add(item.id)
    setItems((prev) => [...prev, item])

    void supabase
      .from('items')
      .insert({
        id: item.id,
        room_id: item.room_id,
        name: item.name,
        quantity: item.quantity,
        added_by: item.added_by,
        status: item.status,
        created_at: item.created_at,
        picked_at: item.picked_at,
      })
      .then(({ error }) => {
        pending.current.delete(item.id)
        if (error) {
          setItems((prev) => prev.filter((i) => i.id !== item.id))
          setError(error.message)
        }
      })
  }, [])

  const finishShopping = useCallback(() => {
    void supabase.rpc('finish_shopping', { p_room: roomId }).then(({ error }) => {
      if (error) setError(error.message)
      void refetch()
    })
  }, [roomId, refetch])

  return {
    items,
    arrivals,
    ready,
    connection,
    error,
    clearError: () => setError(null),
    add,
    toggle,
    remove,
    restore,
    finishShopping,
  }
}
