import { useCallback, useEffect, useRef, useState } from 'react'
import { applyPending } from '../lib/outbox'
import { supabase } from '../lib/supabase'
import { onRejected, onSynced, outbox } from '../lib/sync'
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
  edit: (item: Item, name: string, quantity: string | null) => void
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
  // tudo que este aparelho criou nesta sessão, para não destacar os próprios itens
  const mine = useRef(new Set<string>())
  const itemsRef = useRef<Item[]>([])
  itemsRef.current = items

  const refetch = useCallback(async () => {
    const { data, error } = await supabase
      .from('items')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at')
    if (error) {
      // sem sinal não é erro para mostrar: a tela segue com o que já tem
      if (!/fetch|network|load failed/i.test(error.message)) setError(error.message)
      return
    }
    // o que ainda está na fila continua valendo por cima do que veio do servidor
    setItems(applyPending(data as Item[], 'items', outbox.pending()))
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
          void refetch()
          void outbox.flush()
        } else if (s === 'CHANNEL_ERROR' || s === 'TIMED_OUT' || s === 'CLOSED') {
          setConnection('offline')
        }
      })

    const onVisible = () => {
      if (document.visibilityState === 'visible') void refetch()
    }
    document.addEventListener('visibilitychange', onVisible)
    const offSynced = onSynced(() => void refetch())
    const offRejected = onRejected((message) => {
      setError(message)
      void refetch()
    })

    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      offSynced()
      offRejected()
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
      mine.current.add(item.id)
      setItems((prev) => [...prev, item])
      outbox.enqueue({
        id: uuid(),
        kind: 'upsert',
        table: 'items',
        values: { ...item },
        notify: { roomId, person: me, kind: 'item', subject: name },
      })
    },
    [roomId, me],
  )

  const toggle = useCallback((item: Item) => {
    const picked = item.status === 'pendente'
    const values = {
      status: picked ? 'pegado' : 'pendente',
      picked_at: picked ? new Date().toISOString() : null,
    } as const
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, ...values } : i)))
    outbox.enqueue({ id: uuid(), kind: 'update', table: 'items', rowId: item.id, values })
  }, [])

  const edit = useCallback((item: Item, name: string, quantity: string | null) => {
    const values = { name, quantity }
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, ...values } : i)))
    outbox.enqueue({ id: uuid(), kind: 'update', table: 'items', rowId: item.id, values })
  }, [])

  const remove = useCallback((item: Item) => {
    setItems((prev) => prev.filter((i) => i.id !== item.id))
    outbox.enqueue({ id: uuid(), kind: 'delete', table: 'items', rowId: item.id })
  }, [])

  const restore = useCallback((item: Item) => {
    mine.current.add(item.id)
    setItems((prev) => (prev.some((i) => i.id === item.id) ? prev : [...prev, item]))
    outbox.enqueue({ id: uuid(), kind: 'upsert', table: 'items', values: { ...item } })
  }, [])

  const finishShopping = useCallback(() => {
    const picked = itemsRef.current.filter((i) => i.status === 'pegado').map((i) => i.id)
    setItems((prev) => prev.filter((i) => i.status !== 'pegado'))
    outbox.enqueue({
      id: uuid(),
      kind: 'rpc',
      rpc: 'finish_shopping',
      args: { p_room: roomId },
      rebase: { table: 'items', removeIds: picked },
    })
  }, [roomId])

  return {
    items,
    arrivals,
    ready,
    connection,
    error,
    clearError: () => setError(null),
    add,
    toggle,
    edit,
    remove,
    restore,
    finishShopping,
  }
}
