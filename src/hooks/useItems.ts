import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Item } from '../lib/types'
import { uuid } from '../lib/uuid'

type Status = 'loading' | 'live' | 'offline'

export function useItems(roomId: string, me: string) {
  const [items, setItems] = useState<Item[]>([])
  const [status, setStatus] = useState<Status>('loading')
  const [error, setError] = useState<string | null>(null)
  // Inserts otimistas ainda não confirmados: um refetch no meio não pode apagá-los.
  const pending = useRef(new Map<string, Item>())

  const refetch = useCallback(async () => {
    const { data, error } = await supabase
      .from('items')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at')
    if (error) return setError(error.message)
    const server = data as Item[]
    const ids = new Set(server.map((i) => i.id))
    setItems([...server, ...[...pending.current.values()].filter((i) => !ids.has(i.id))])
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
        (p) => upsert(p.new as Item),
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
          setStatus('live')
          void refetch() // cobre qualquer evento perdido enquanto estava desconectado
        } else if (s === 'CHANNEL_ERROR' || s === 'TIMED_OUT' || s === 'CLOSED') {
          setStatus('offline')
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
    async (name: string, quantity: string | null) => {
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
      setItems((prev) => [...prev, item])

      const { error } = await supabase.from('items').insert({
        id: item.id,
        room_id: roomId,
        name,
        quantity,
        added_by: me,
      })
      pending.current.delete(item.id)
      if (error) {
        setItems((prev) => prev.filter((i) => i.id !== item.id))
        setError(error.message)
      }
    },
    [roomId, me],
  )

  const toggle = useCallback(async (item: Item) => {
    const picked = item.status === 'pendente'
    const patch = {
      status: picked ? 'pegado' : 'pendente',
      picked_at: picked ? new Date().toISOString() : null,
    } as const
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, ...patch } : i)))

    const { error } = await supabase.from('items').update(patch).eq('id', item.id)
    if (error) {
      setItems((prev) => prev.map((i) => (i.id === item.id ? item : i)))
      setError(error.message)
    }
  }, [])

  const remove = useCallback(async (item: Item) => {
    setItems((prev) => prev.filter((i) => i.id !== item.id))
    const { error } = await supabase.from('items').delete().eq('id', item.id)
    if (error) {
      setItems((prev) => [...prev, item])
      setError(error.message)
    }
  }, [])

  const finishShopping = useCallback(async () => {
    const { error } = await supabase.rpc('finish_shopping', { p_room: roomId })
    if (error) setError(error.message)
    await refetch()
  }, [roomId, refetch])

  return { items, status, error, clearError: () => setError(null), add, toggle, remove, finishShopping }
}
