import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { uploadWishImage } from '../lib/image'
import { notifyOthers } from '../lib/notify'
import type { Wish } from '../lib/types'
import { uuid } from '../lib/uuid'
import type { Connection } from './useItems'

export interface WishesStore {
  wishes: Wish[]
  savingsCents: number
  ready: boolean
  connection: Connection
  error: string | null
  clearError: () => void
  add: (title: string, priceCents: number) => void
  toggleWant: (wish: Wish) => void
  cycleLevel: (wish: Wish) => void
  setPrice: (wish: Wish, priceCents: number) => void
  setImage: (wish: Wish, file: File) => void
  markBought: (wish: Wish) => void
  remove: (wish: Wish) => void
  restore: (wish: Wish) => void
  setSavings: (cents: number) => void
}

export function useWishes(roomId: string, me: string): WishesStore {
  const [wishes, setWishes] = useState<Wish[]>([])
  const [savingsCents, setSavingsCents] = useState(0)
  const [ready, setReady] = useState(false)
  const [connection, setConnection] = useState<Connection>('connecting')
  const [error, setError] = useState<string | null>(null)
  const pending = useRef(new Map<string, Wish>())

  const refetch = useCallback(async () => {
    const [list, settings] = await Promise.all([
      supabase.from('wishes').select('*').eq('room_id', roomId).order('created_at'),
      supabase.from('room_settings').select('monthly_savings_cents').eq('room_id', roomId).maybeSingle(),
    ])

    if (list.error) {
      setError(list.error.message)
      return
    }
    const server = list.data as Wish[]
    const ids = new Set(server.map((w) => w.id))
    setWishes([...server, ...[...pending.current.values()].filter((w) => !ids.has(w.id))])
    if (settings.data) setSavingsCents(settings.data.monthly_savings_cents)
    setReady(true)
  }, [roomId])

  useEffect(() => {
    const upsert = (row: Wish) =>
      setWishes((prev) => {
        const idx = prev.findIndex((w) => w.id === row.id)
        if (idx === -1) return [...prev, row]
        const next = prev.slice()
        next[idx] = row
        return next
      })

    const channel = supabase
      .channel(`wishes:${roomId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'wishes', filter: `room_id=eq.${roomId}` },
        (p) => upsert(p.new as Wish),
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'wishes', filter: `room_id=eq.${roomId}` },
        (p) => upsert(p.new as Wish),
      )
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'wishes' }, (p) => {
        const id = (p.old as Partial<Wish>).id
        if (id) setWishes((prev) => prev.filter((w) => w.id !== id))
      })
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'room_settings', filter: `room_id=eq.${roomId}` },
        (p) => {
          const row = p.new as { monthly_savings_cents?: number }
          if (typeof row.monthly_savings_cents === 'number') setSavingsCents(row.monthly_savings_cents)
        },
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setConnection('live')
          void refetch()
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
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

  const patch = useCallback((wish: Wish, changes: Partial<Wish>) => {
    setWishes((prev) => prev.map((w) => (w.id === wish.id ? { ...w, ...changes } : w)))
    void supabase
      .from('wishes')
      .update(changes)
      .eq('id', wish.id)
      .then(({ error }) => {
        if (error) {
          setWishes((prev) => prev.map((w) => (w.id === wish.id ? wish : w)))
          setError(error.message)
        }
      })
  }, [])

  const add = useCallback(
    (title: string, priceCents: number) => {
      const wish: Wish = {
        id: uuid(),
        room_id: roomId,
        title,
        price_cents: priceCents,
        link: null,
        image_url: null,
        want_level: 2,
        wanted_by: [me],
        status: 'querendo',
        bought_at: null,
        bought_by: null,
        created_by: me,
        created_at: new Date().toISOString(),
      }
      pending.current.set(wish.id, wish)
      setWishes((prev) => [...prev, wish])

      void supabase
        .from('wishes')
        .insert({
          id: wish.id,
          room_id: roomId,
          title,
          price_cents: priceCents,
          wanted_by: [me],
          created_by: me,
        })
        .then(({ error }) => {
          pending.current.delete(wish.id)
          if (error) {
            setWishes((prev) => prev.filter((w) => w.id !== wish.id))
            setError(error.message)
            return
          }
          notifyOthers(roomId, me, 'desejo', title)
        })
    },
    [roomId, me],
  )

  const toggleWant = useCallback(
    (wish: Wish) => {
      const mine = wish.wanted_by.includes(me)
      setWishes((prev) =>
        prev.map((w) =>
          w.id === wish.id
            ? { ...w, wanted_by: mine ? w.wanted_by.filter((p) => p !== me) : [...w.wanted_by, me] }
            : w,
        ),
      )
      void supabase.rpc('toggle_want', { p_wish: wish.id, p_person: me }).then(({ data, error }) => {
        if (error) {
          setWishes((prev) => prev.map((w) => (w.id === wish.id ? wish : w)))
          setError(error.message)
          return
        }
        if (Array.isArray(data)) {
          setWishes((prev) => prev.map((w) => (w.id === wish.id ? { ...w, wanted_by: data } : w)))
        }
      })
    },
    [me],
  )

  const cycleLevel = useCallback(
    (wish: Wish) => patch(wish, { want_level: (wish.want_level % 3) + 1 }),
    [patch],
  )

  const setPrice = useCallback(
    (wish: Wish, priceCents: number) => patch(wish, { price_cents: priceCents }),
    [patch],
  )

  const setImage = useCallback(
    (wish: Wish, file: File) => {
      void uploadWishImage(roomId, wish.id, file)
        .then((url) => patch(wish, { image_url: url }))
        .catch((e: Error) => setError(e.message))
    },
    [roomId, patch],
  )

  const markBought = useCallback(
    (wish: Wish) =>
      patch(wish, {
        status: wish.status === 'querendo' ? 'comprado' : 'querendo',
        bought_at: wish.status === 'querendo' ? new Date().toISOString() : null,
        bought_by: wish.status === 'querendo' ? me : null,
      }),
    [patch, me],
  )

  const remove = useCallback((wish: Wish) => {
    setWishes((prev) => prev.filter((w) => w.id !== wish.id))
    void supabase
      .from('wishes')
      .delete()
      .eq('id', wish.id)
      .then(({ error }) => {
        if (error) {
          setWishes((prev) => [...prev, wish])
          setError(error.message)
        }
      })
  }, [])

  const restore = useCallback((wish: Wish) => {
    pending.current.set(wish.id, wish)
    setWishes((prev) => [...prev, wish])
    void supabase
      .from('wishes')
      .insert(wish)
      .then(({ error }) => {
        pending.current.delete(wish.id)
        if (error) {
          setWishes((prev) => prev.filter((w) => w.id !== wish.id))
          setError(error.message)
        }
      })
  }, [])

  const setSavings = useCallback(
    (cents: number) => {
      setSavingsCents(cents)
      void supabase
        .from('room_settings')
        .upsert({ room_id: roomId, monthly_savings_cents: cents, updated_at: new Date().toISOString() })
        .then(({ error }) => {
          if (error) setError(error.message)
        })
    },
    [roomId],
  )

  return {
    wishes,
    savingsCents,
    ready,
    connection,
    error,
    clearError: () => setError(null),
    add,
    toggleWant,
    cycleLevel,
    setPrice,
    setImage,
    markBought,
    remove,
    restore,
    setSavings,
  }
}
