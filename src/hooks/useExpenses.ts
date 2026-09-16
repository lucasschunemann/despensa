import { useCallback, useEffect, useRef, useState } from 'react'
import { notifyOthers } from '../lib/notify'
import { supabase } from '../lib/supabase'
import type { Expense, Split } from '../lib/types'
import { uuid } from '../lib/uuid'
import type { Connection } from './useItems'

export interface NewExpense {
  title: string
  amountCents: number
  dueDay: number | null
}

export interface ExpensesStore {
  expenses: Expense[]
  ready: boolean
  connection: Connection
  error: string | null
  clearError: () => void
  add: (entry: NewExpense, options: { recurring?: boolean; paid?: boolean }) => void
  togglePaid: (expense: Expense) => void
  cycleSplit: (expense: Expense) => void
  remove: (expense: Expense) => void
  restore: (expense: Expense) => void
  settleMonth: () => void
}

export function useExpenses(roomId: string, me: string, month: string): ExpensesStore {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [ready, setReady] = useState(false)
  const [connection, setConnection] = useState<Connection>('connecting')
  const [error, setError] = useState<string | null>(null)
  const pending = useRef(new Map<string, Expense>())

  const refetch = useCallback(async () => {
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('room_id', roomId)
      .eq('month', month)
      .order('created_at')
    if (error) {
      setError(error.message)
      return
    }
    const server = data as Expense[]
    const ids = new Set(server.map((e) => e.id))
    setExpenses([...server, ...[...pending.current.values()].filter((e) => !ids.has(e.id))])
    setReady(true)
  }, [roomId, month])

  // ao abrir um mês, lança as contas que se repetem (o banco garante uma vez só)
  useEffect(() => {
    let cancelled = false
    setReady(false)
    void supabase.rpc('ensure_month', { p_room: roomId, p_month: month }).then(({ error }) => {
      if (cancelled) return
      if (error) setError(error.message)
      void refetch()
    })
    return () => {
      cancelled = true
    }
  }, [roomId, month, refetch])

  useEffect(() => {
    const belongs = (row: Expense) => row.room_id === roomId && row.month === month

    const upsert = (row: Expense) =>
      setExpenses((prev) => {
        if (!belongs(row)) return prev
        const idx = prev.findIndex((e) => e.id === row.id)
        if (idx === -1) return [...prev, row]
        const next = prev.slice()
        next[idx] = row
        return next
      })

    const channel = supabase
      .channel(`expenses:${roomId}:${month}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'expenses', filter: `room_id=eq.${roomId}` },
        (p) => upsert(p.new as Expense),
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'expenses', filter: `room_id=eq.${roomId}` },
        (p) => upsert(p.new as Expense),
      )
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'expenses' }, (p) => {
        const id = (p.old as Partial<Expense>).id
        if (id) setExpenses((prev) => prev.filter((e) => e.id !== id))
      })
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
  }, [roomId, month, refetch])

  const add = useCallback(
    (entry: NewExpense, { recurring = false, paid = false }: { recurring?: boolean; paid?: boolean }) => {
      if (recurring) {
        void supabase
          .rpc('create_recurring', {
            p_room: roomId,
            p_title: entry.title,
            p_amount: entry.amountCents,
            p_due_day: entry.dueDay,
            p_split: 'meio',
            p_person: me,
            p_month: month,
          })
          .then(({ error }) => {
            if (error) setError(error.message)
            void refetch()
          })
        return
      }

      const expense: Expense = {
        id: uuid(),
        room_id: roomId,
        title: entry.title,
        amount_cents: entry.amountCents,
        month,
        due_day: entry.dueDay,
        split: 'meio',
        status: paid ? 'pago' : 'pendente',
        paid_by: paid ? me : null,
        paid_at: paid ? new Date().toISOString() : null,
        settled: false,
        recurrence_id: null,
        created_by: me,
        created_at: new Date().toISOString(),
      }
      pending.current.set(expense.id, expense)
      setExpenses((prev) => [...prev, expense])

      void supabase
        .from('expenses')
        .insert({
          id: expense.id,
          room_id: roomId,
          title: expense.title,
          amount_cents: expense.amount_cents,
          month,
          due_day: expense.due_day,
          status: expense.status,
          paid_by: expense.paid_by,
          paid_at: expense.paid_at,
          created_by: me,
        })
        .then(({ error }) => {
          pending.current.delete(expense.id)
          if (error) {
            setExpenses((prev) => prev.filter((e) => e.id !== expense.id))
            setError(error.message)
          }
        })
    },
    [roomId, me, month, refetch],
  )

  const patch = useCallback((expense: Expense, changes: Partial<Expense>) => {
    setExpenses((prev) => prev.map((e) => (e.id === expense.id ? { ...e, ...changes } : e)))
    void supabase
      .from('expenses')
      .update(changes)
      .eq('id', expense.id)
      .then(({ error }) => {
        if (error) {
          setExpenses((prev) => prev.map((e) => (e.id === expense.id ? expense : e)))
          setError(error.message)
        }
      })
  }, [])

  const togglePaid = useCallback(
    (expense: Expense) => {
      const paying = expense.status === 'pendente'
      if (paying) notifyOthers(roomId, me, 'conta', expense.title)
      patch(expense, {
        status: paying ? 'pago' : 'pendente',
        paid_by: paying ? me : null,
        paid_at: paying ? new Date().toISOString() : null,
        settled: false,
      })
    },
    [patch, me, roomId],
  )

  // toca no chip da divisão: meio a meio → só minha → só dela → meio a meio
  const cycleSplit = useCallback(
    (expense: Expense) => {
      const other = expense.created_by === me ? null : expense.created_by
      const order: Split[] = ['meio', me as Split, (other ?? me) as Split]
      const current = order.indexOf(expense.split as Split)
      patch(expense, { split: order[(current + 1) % order.length] })
    },
    [patch, me],
  )

  const remove = useCallback((expense: Expense) => {
    setExpenses((prev) => prev.filter((e) => e.id !== expense.id))
    void supabase
      .from('expenses')
      .delete()
      .eq('id', expense.id)
      .then(({ error }) => {
        if (error) {
          setExpenses((prev) => [...prev, expense])
          setError(error.message)
        }
      })
  }, [])

  const restore = useCallback((expense: Expense) => {
    pending.current.set(expense.id, expense)
    setExpenses((prev) => [...prev, expense])
    void supabase
      .from('expenses')
      .insert(expense)
      .then(({ error }) => {
        pending.current.delete(expense.id)
        if (error) {
          setExpenses((prev) => prev.filter((e) => e.id !== expense.id))
          setError(error.message)
        }
      })
  }, [])

  const settleMonth = useCallback(() => {
    setExpenses((prev) => prev.map((e) => (e.status === 'pago' ? { ...e, settled: true } : e)))
    void supabase
      .rpc('settle_month', { p_room: roomId, p_month: month })
      .then(({ error }) => {
        if (error) setError(error.message)
        void refetch()
      })
  }, [roomId, month, refetch])

  return {
    expenses,
    ready,
    connection,
    error,
    clearError: () => setError(null),
    add,
    togglePaid,
    cycleSplit,
    remove,
    restore,
    settleMonth,
  }
}
