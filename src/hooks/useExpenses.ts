import { useCallback, useEffect, useRef, useState } from 'react'
import { applyPending } from '../lib/outbox'
import { supabase } from '../lib/supabase'
import { onRejected, onSynced, outbox } from '../lib/sync'
import type { Expense, ExpenseFolder, Split } from '../lib/types'
import { uuid } from '../lib/uuid'
import type { Connection } from './useItems'

export interface NewExpense {
  title: string
  amountCents: number
  dueDay: number | null
}

export type EditScope = 'mes' | 'futuro'

export interface ExpensesStore {
  expenses: Expense[]
  folders: ExpenseFolder[]
  ready: boolean
  connection: Connection
  error: string | null
  clearError: () => void
  add: (entry: NewExpense, options: { recurring?: boolean; paid?: boolean; folderId?: string | null }) => void
  togglePaid: (expense: Expense) => void
  cycleSplit: (expense: Expense) => void
  /** muda nome, valor e vencimento; em conta que se repete, "futuro" vale para os próximos meses */
  edit: (expense: Expense, changes: NewExpense, scope: EditScope) => void
  remove: (expense: Expense) => void
  /** apaga esta e as próximas contas pendentes dessa recorrência, e ela para de se repetir */
  stopRecurring: (expense: Expense) => void
  restore: (expense: Expense) => void
  settleMonth: () => void
  addFolder: (name: string, color: string) => void
  editFolder: (folder: ExpenseFolder, name: string, color: string) => void
  removeFolder: (folder: ExpenseFolder) => void
  moveExpenses: (expenseIds: string[], folderId: string | null) => void
}

const isOffline = (message: string) => /fetch|network|load failed/i.test(message)

export function useExpenses(roomId: string, me: string, month: string): ExpensesStore {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [folders, setFolders] = useState<ExpenseFolder[]>([])
  const [ready, setReady] = useState(false)
  const [connection, setConnection] = useState<Connection>('connecting')
  const [error, setError] = useState<string | null>(null)
  const expensesRef = useRef<Expense[]>([])
  expensesRef.current = expenses

  const refetch = useCallback(async () => {
    const [expenseResult, folderResult] = await Promise.all([
      supabase.from('expenses').select('*').eq('room_id', roomId).eq('month', month).order('created_at'),
      supabase.from('expense_folders').select('*').eq('room_id', roomId).order('position'),
    ])
    if (expenseResult.error || folderResult.error) {
      const message = expenseResult.error?.message ?? folderResult.error?.message ?? 'não foi possível carregar'
      if (!isOffline(message)) setError(message)
      return
    }
    const merged = applyPending(expenseResult.data as Expense[], 'expenses', outbox.pending())
    const mergedFolders = applyPending(folderResult.data as ExpenseFolder[], 'expense_folders', outbox.pending())
    setExpenses(merged.filter((e) => e.month === month))
    setFolders(mergedFolders.sort((a, b) => a.position - b.position || a.created_at.localeCompare(b.created_at)))
    setReady(true)
  }, [roomId, month])

  // ao abrir um mês, lança as contas que se repetem (o banco garante uma vez só)
  useEffect(() => {
    let cancelled = false
    setReady(false)
    void supabase.rpc('ensure_month', { p_room: roomId, p_month: month }).then(({ error }) => {
      if (cancelled) return
      if (error && !isOffline(error.message)) setError(error.message)
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expense_folders', filter: `room_id=eq.${roomId}` }, () => {
        void refetch()
      })
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
  }, [roomId, month, refetch])

  const add = useCallback(
    (entry: NewExpense, { recurring = false, paid = false, folderId = null }: { recurring?: boolean; paid?: boolean; folderId?: string | null }) => {
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
        recurrence_id: recurring ? uuid() : null,
        folder_id: folderId,
        created_by: me,
        created_at: new Date().toISOString(),
      }
      setExpenses((prev) => [...prev, expense])

      if (recurring) {
        // ids escolhidos aqui: se o envio repetir sem sinal, não nasce uma segunda recorrência
        outbox.enqueue({
          id: uuid(),
          kind: 'rpc',
          rpc: 'create_recurring_with_ids',
          args: {
            p_room: roomId,
            p_recurrence: expense.recurrence_id,
            p_expense: expense.id,
            p_title: expense.title,
            p_amount: expense.amount_cents,
            p_due_day: expense.due_day,
            p_split: 'meio',
            p_person: me,
            p_month: month,
          },
          rebase: { table: 'expenses', insert: { ...expense } },
        })
        if (folderId) {
          outbox.enqueue({
            id: uuid(),
            kind: 'rpc',
            rpc: 'move_expenses_folder',
            args: { p_expenses: [expense.id], p_folder: folderId },
            rebase: { table: 'expenses', patch: { ids: [expense.id], set: { folder_id: folderId } } },
          })
        }
        return
      }

      outbox.enqueue({
        id: uuid(),
        kind: 'upsert',
        table: 'expenses',
        values: { ...expense },
        notify: paid ? { roomId, person: me, kind: 'conta', subject: expense.title } : undefined,
      })
    },
    [roomId, me, month],
  )

  const update = useCallback((expense: Expense, values: Partial<Expense>) => {
    setExpenses((prev) => prev.map((e) => (e.id === expense.id ? { ...e, ...values } : e)))
    outbox.enqueue({ id: uuid(), kind: 'update', table: 'expenses', rowId: expense.id, values })
  }, [])

  const togglePaid = useCallback(
    (expense: Expense) => {
      const paying = expense.status === 'pendente'
      const values = {
        status: paying ? 'pago' : 'pendente',
        paid_by: paying ? me : null,
        paid_at: paying ? new Date().toISOString() : null,
        settled: false,
      } as const
      setExpenses((prev) => prev.map((e) => (e.id === expense.id ? { ...e, ...values } : e)))
      outbox.enqueue({
        id: uuid(),
        kind: 'update',
        table: 'expenses',
        rowId: expense.id,
        values,
        notify: paying ? { roomId, person: me, kind: 'conta', subject: expense.title } : undefined,
      })
    },
    [roomId, me],
  )

  // toca no chip da divisão: meio a meio → só minha → só dela → meio a meio
  const cycleSplit = useCallback(
    (expense: Expense) => {
      const other = expense.created_by === me ? null : expense.created_by
      const order: Split[] = ['meio', me as Split, (other ?? me) as Split]
      const current = order.indexOf(expense.split as Split)
      update(expense, { split: order[(current + 1) % order.length] })
    },
    [update, me],
  )

  const edit = useCallback(
    (expense: Expense, changes: NewExpense, scope: EditScope) => {
      const values = { title: changes.title, amount_cents: changes.amountCents, due_day: changes.dueDay }
      if (scope === 'mes' || !expense.recurrence_id) {
        update(expense, values)
        return
      }
      setExpenses((prev) => prev.map((e) => (e.id === expense.id ? { ...e, ...values } : e)))
      outbox.enqueue({
        id: uuid(),
        kind: 'rpc',
        rpc: 'update_recurring',
        args: {
          p_expense: expense.id,
          p_title: changes.title,
          p_amount: changes.amountCents,
          p_due_day: changes.dueDay,
        },
        rebase: { table: 'expenses', patch: { ids: [expense.id], set: values } },
      })
    },
    [update],
  )

  const remove = useCallback((expense: Expense) => {
    setExpenses((prev) => prev.filter((e) => e.id !== expense.id))
    outbox.enqueue({ id: uuid(), kind: 'delete', table: 'expenses', rowId: expense.id })
  }, [])

  const stopRecurring = useCallback((expense: Expense) => {
    setExpenses((prev) => prev.filter((e) => e.id !== expense.id))
    outbox.enqueue({
      id: uuid(),
      kind: 'rpc',
      rpc: 'stop_recurring',
      args: { p_expense: expense.id },
      rebase: { table: 'expenses', removeIds: [expense.id] },
    })
  }, [])

  const restore = useCallback((expense: Expense) => {
    setExpenses((prev) => (prev.some((e) => e.id === expense.id) ? prev : [...prev, expense]))
    outbox.enqueue({ id: uuid(), kind: 'upsert', table: 'expenses', values: { ...expense } })
  }, [])

  const settleMonth = useCallback(() => {
    const ids = expensesRef.current.filter((e) => e.status === 'pago' && !e.settled).map((e) => e.id)
    setExpenses((prev) => prev.map((e) => (e.status === 'pago' ? { ...e, settled: true } : e)))
    outbox.enqueue({
      id: uuid(),
      kind: 'rpc',
      rpc: 'settle_month',
      args: { p_room: roomId, p_month: month },
      rebase: { table: 'expenses', patch: { ids, set: { settled: true } } },
    })
  }, [roomId, month])

  const addFolder = useCallback((name: string, color: string) => {
    const folder: ExpenseFolder = {
      id: uuid(), room_id: roomId, name: name.trim(), color,
      position: folders.length ? Math.max(...folders.map((f) => f.position)) + 1 : 0,
      created_by: me, created_at: new Date().toISOString(),
    }
    setFolders((prev) => [...prev, folder])
    outbox.enqueue({ id: uuid(), kind: 'upsert', table: 'expense_folders', values: { ...folder } })
  }, [folders, me, roomId])

  const editFolder = useCallback((folder: ExpenseFolder, name: string, color: string) => {
    const values = { name: name.trim(), color }
    setFolders((prev) => prev.map((f) => f.id === folder.id ? { ...f, ...values } : f))
    outbox.enqueue({ id: uuid(), kind: 'update', table: 'expense_folders', rowId: folder.id, values })
  }, [])

  const removeFolder = useCallback((folder: ExpenseFolder) => {
    setFolders((prev) => prev.filter((f) => f.id !== folder.id))
    setExpenses((prev) => prev.map((e) => e.folder_id === folder.id ? { ...e, folder_id: null } : e))
    outbox.enqueue({ id: uuid(), kind: 'delete', table: 'expense_folders', rowId: folder.id })
  }, [])

  const moveExpenses = useCallback((expenseIds: string[], folderId: string | null) => {
    if (!expenseIds.length) return
    const ids = new Set(expenseIds)
    setExpenses((prev) => prev.map((e) => ids.has(e.id) ? { ...e, folder_id: folderId } : e))
    outbox.enqueue({
      id: uuid(), kind: 'rpc', rpc: 'move_expenses_folder',
      args: { p_expenses: expenseIds, p_folder: folderId },
      rebase: { table: 'expenses', patch: { ids: expenseIds, set: { folder_id: folderId } } },
    })
  }, [])

  return {
    expenses,
    folders,
    ready,
    connection,
    error,
    clearError: () => setError(null),
    add,
    togglePaid,
    cycleSplit,
    edit,
    remove,
    stopRecurring,
    restore,
    settleMonth,
    addFolder,
    editFolder,
    removeFolder,
    moveExpenses,
  }
}
