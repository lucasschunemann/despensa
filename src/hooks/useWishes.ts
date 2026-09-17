import { useCallback, useEffect, useRef, useState } from 'react'
import { uploadWishImage } from '../lib/image'
import { applyPending } from '../lib/outbox'
import { supabase } from '../lib/supabase'
import { onRejected, onSynced, outbox } from '../lib/sync'
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
  rename: (wish: Wish, title: string) => void
  setImage: (wish: Wish, file: File) => void
  markBought: (wish: Wish) => void
  remove: (wish: Wish) => void
  restore: (wish: Wish) => void
  setSavings: (cents: number) => void
}

const isOffline = (message: string) => !navigator.onLine || /fetch|network|load failed/i.test(message)

export function useWishes(roomId: string, me: string): WishesStore {
  const [wishes, setWishes] = useState<Wish[]>([])
  const [savingsCents, setSavingsCents] = useState(0)
  const [ready, setReady] = useState(false)
  const [connection, setConnection] = useState<Connection>('connecting')
  const [error, setError] = useState<string | null>(null)
  const wishesRef = useRef<Wish[]>([])
  wishesRef.current = wishes

  const refetch = useCallback(async () => {
    const [list, settings] = await Promise.all([
      supabase.from('wishes').select('*').eq('room_id', roomId).order('created_at'),
      supabase.from('room_settings').select('monthly_savings_cents').eq('room_id', roomId).maybeSingle(),
    ])

    if (list.error) {
      if (!isOffline(list.error.message)) setError(list.error.message)
      return
    }
    setWishes(applyPending(list.data as Wish[], 'wishes', outbox.pending()))
    // a meta guardada sem sinal vale até chegar
    const queuedSavings = [...outbox.pending()].reverse().find((op) => op.table === 'room_settings')
    if (queuedSavings?.values) setSavingsCents(queuedSavings.values.monthly_savings_cents as number)
    else if (settings.data) setSavingsCents(settings.data.monthly_savings_cents)
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
          void outbox.flush()
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
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

  const update = useCallback((wish: Wish, values: Partial<Wish>) => {
    setWishes((prev) => prev.map((w) => (w.id === wish.id ? { ...w, ...values } : w)))
    outbox.enqueue({ id: uuid(), kind: 'update', table: 'wishes', rowId: wish.id, values })
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
      setWishes((prev) => [...prev, wish])
      outbox.enqueue({
        id: uuid(),
        kind: 'upsert',
        table: 'wishes',
        values: { ...wish },
        notify: { roomId, person: me, kind: 'desejo', subject: title },
      })
    },
    [roomId, me],
  )

  // o coração vai com o valor final ("quero" / "não quero"): reenviar sem sinal não desfaz o toque
  const toggleWant = useCallback(
    (wish: Wish) => {
      const current = wishesRef.current.find((w) => w.id === wish.id) ?? wish
      const want = !current.wanted_by.includes(me)
      const wantedBy = want ? [...current.wanted_by, me] : current.wanted_by.filter((p) => p !== me)
      setWishes((prev) => prev.map((w) => (w.id === wish.id ? { ...w, wanted_by: wantedBy } : w)))
      outbox.enqueue({
        id: uuid(),
        kind: 'rpc',
        rpc: 'set_want',
        args: { p_wish: wish.id, p_person: me, p_want: want },
        rebase: { table: 'wishes', patch: { ids: [wish.id], set: { wanted_by: wantedBy } } },
      })
    },
    [me],
  )

  const cycleLevel = useCallback((wish: Wish) => update(wish, { want_level: (wish.want_level % 3) + 1 }), [update])
  const setPrice = useCallback((wish: Wish, priceCents: number) => update(wish, { price_cents: priceCents }), [update])
  const rename = useCallback((wish: Wish, title: string) => update(wish, { title }), [update])

  // foto precisa de sinal: é arquivo, não cabe na fila
  const setImage = useCallback(
    (wish: Wish, file: File) => {
      if (!navigator.onLine) {
        setError('Sem sinal agora: a foto precisa de internet para subir')
        return
      }
      void uploadWishImage(roomId, wish.id, file)
        .then((url) => update(wish, { image_url: url }))
        .catch((e: Error) => setError(isOffline(e.message) ? 'Sem sinal agora: a foto precisa de internet para subir' : e.message))
    },
    [roomId, update],
  )

  const markBought = useCallback(
    (wish: Wish) =>
      update(wish, {
        status: wish.status === 'querendo' ? 'comprado' : 'querendo',
        bought_at: wish.status === 'querendo' ? new Date().toISOString() : null,
        bought_by: wish.status === 'querendo' ? me : null,
      }),
    [update, me],
  )

  const remove = useCallback((wish: Wish) => {
    setWishes((prev) => prev.filter((w) => w.id !== wish.id))
    outbox.enqueue({ id: uuid(), kind: 'delete', table: 'wishes', rowId: wish.id })
  }, [])

  const restore = useCallback((wish: Wish) => {
    setWishes((prev) => (prev.some((w) => w.id === wish.id) ? prev : [...prev, wish]))
    outbox.enqueue({ id: uuid(), kind: 'upsert', table: 'wishes', values: { ...wish } })
  }, [])

  const setSavings = useCallback(
    (cents: number) => {
      setSavingsCents(cents)
      outbox.enqueue({
        id: uuid(),
        kind: 'upsert',
        table: 'room_settings',
        onConflict: 'room_id',
        values: { room_id: roomId, monthly_savings_cents: cents, updated_at: new Date().toISOString() },
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
    rename,
    setImage,
    markBought,
    remove,
    restore,
    setSavings,
  }
}
