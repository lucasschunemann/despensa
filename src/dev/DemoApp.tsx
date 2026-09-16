// Só existe em desenvolvimento (?demo=1): roda a interface com dados de mentira,
// sem Supabase e sem tocar na lista real.
// Variações: &vazio=1, &quem=1, &digitando=1, &contas=1
import { useCallback, useMemo, useState } from 'react'
import { PersonPicker } from '../App'
import { FinanceScreen } from '../components/FinanceScreen'
import { ListScreen } from '../components/ListScreen'
import { MenuSheet, type View } from '../components/MenuSheet'
import type { ExpensesStore } from '../hooks/useExpenses'
import type { ItemsStore } from '../hooks/useItems'
import { monthKey } from '../lib/month'
import type { Expense, Item } from '../lib/types'
import { uuid } from '../lib/uuid'

const ITEMS: Array<[string, string | null, string, boolean]> = [
  ['Leite integral', '2', 'Lucas', false],
  ['Pão de forma', null, 'Bela', false],
  ['Queijo minas', '500 g', 'Bela', false],
  ['Café em grão', '1 kg', 'Lucas', false],
  ['Tomate', null, 'Bela', true],
  ['Papel toalha', '2', 'Lucas', true],
]

const MONTH = monthKey()

const EXPENSES: Array<Partial<Expense>> = [
  { title: 'Aluguel', amount_cents: 185000, due_day: 10, recurrence_id: 'r1' },
  { title: 'Luz', amount_cents: 18740, due_day: 20, recurrence_id: 'r2' },
  { title: 'Academia', amount_cents: 17900, due_day: 5, split: 'Lucas' },
  {
    title: 'Internet',
    amount_cents: 12990,
    due_day: 15,
    recurrence_id: 'r3',
    status: 'pago',
    paid_by: 'Bela',
    paid_at: '2026-09-15T10:00:00Z',
  },
  {
    title: 'Mercado',
    amount_cents: 34590,
    status: 'pago',
    paid_by: 'Lucas',
    paid_at: '2026-09-16T18:00:00Z',
  },
]

export default function DemoApp() {
  const params = new URLSearchParams(location.search)
  const vazio = params.has('vazio')
  const [view, setView] = useState<View>(params.has('contas') ? 'contas' : 'lista')
  const [menuOpen, setMenuOpen] = useState(params.has('menu'))
  const [month, setMonth] = useState(MONTH)

  const [items, setItems] = useState<Item[]>(() =>
    (vazio ? [] : ITEMS).map(([name, quantity, added_by, picked], i) => ({
      id: uuid(),
      room_id: 'demo',
      name,
      quantity,
      added_by,
      status: picked ? 'pegado' : 'pendente',
      created_at: new Date(Date.now() - (ITEMS.length - i) * 60000).toISOString(),
      picked_at: picked ? new Date().toISOString() : null,
    })),
  )

  const [expenses, setExpenses] = useState<Expense[]>(() =>
    (vazio ? [] : EXPENSES).map((e, i) => ({
      id: uuid(),
      room_id: 'demo',
      title: 'Conta',
      amount_cents: 0,
      month: MONTH,
      due_day: null,
      split: 'meio',
      status: 'pendente',
      paid_by: null,
      paid_at: null,
      settled: false,
      recurrence_id: null,
      created_by: 'Lucas',
      created_at: new Date(Date.now() - (EXPENSES.length - i) * 60000).toISOString(),
      ...e,
    })),
  )

  const addItem = useCallback((name: string, quantity: string | null) => {
    setItems((prev) => [
      ...prev,
      {
        id: uuid(),
        room_id: 'demo',
        name,
        quantity,
        added_by: 'Lucas',
        status: 'pendente',
        created_at: new Date().toISOString(),
        picked_at: null,
      },
    ])
  }, [])

  const itemsStore: ItemsStore = useMemo(
    () => ({
      items,
      arrivals: [],
      ready: true,
      connection: 'live',
      error: null,
      clearError: () => {},
      add: addItem,
      toggle: (item) =>
        setItems((prev) =>
          prev.map((i) =>
            i.id === item.id
              ? {
                  ...i,
                  status: i.status === 'pendente' ? 'pegado' : 'pendente',
                  picked_at: i.status === 'pendente' ? new Date().toISOString() : null,
                }
              : i,
          ),
        ),
      remove: (item) => setItems((prev) => prev.filter((i) => i.id !== item.id)),
      restore: (item) => setItems((prev) => [...prev, item]),
      finishShopping: () => setItems((prev) => prev.filter((i) => i.status === 'pendente')),
    }),
    [items, addItem],
  )

  const expensesStore: ExpensesStore = useMemo(
    () => ({
      expenses: expenses.filter((e) => e.month === month),
      ready: true,
      connection: 'live',
      error: null,
      clearError: () => {},
      add: (entry, options) =>
        setExpenses((prev) => [
          ...prev,
          {
            id: uuid(),
            room_id: 'demo',
            title: entry.title,
            amount_cents: entry.amountCents,
            month,
            due_day: entry.dueDay,
            split: 'meio',
            status: options.paid ? 'pago' : 'pendente',
            paid_by: options.paid ? 'Lucas' : null,
            paid_at: options.paid ? new Date().toISOString() : null,
            settled: false,
            recurrence_id: options.recurring ? uuid() : null,
            created_by: 'Lucas',
            created_at: new Date().toISOString(),
          },
        ]),
      togglePaid: (expense) =>
        setExpenses((prev) =>
          prev.map((e) =>
            e.id === expense.id
              ? {
                  ...e,
                  status: e.status === 'pendente' ? 'pago' : 'pendente',
                  paid_by: e.status === 'pendente' ? 'Lucas' : null,
                  paid_at: e.status === 'pendente' ? new Date().toISOString() : null,
                  settled: false,
                }
              : e,
          ),
        ),
      cycleSplit: (expense) =>
        setExpenses((prev) =>
          prev.map((e) =>
            e.id === expense.id
              ? { ...e, split: e.split === 'meio' ? 'Lucas' : e.split === 'Lucas' ? 'Bela' : 'meio' }
              : e,
          ),
        ),
      remove: (expense) => setExpenses((prev) => prev.filter((e) => e.id !== expense.id)),
      restore: (expense) => setExpenses((prev) => [...prev, expense]),
      settleMonth: () =>
        setExpenses((prev) => prev.map((e) => (e.status === 'pago' ? { ...e, settled: true } : e))),
    }),
    [expenses, month],
  )

  const presence = {
    online: ['Bela'],
    typing: params.has('digitando') ? 'Bela' : null,
    notifyTyping: () => {},
  }

  if (params.has('quem')) {
    return (
      <div className="app gate">
        <div className="gate-inner">
          <h1>quem é você?</h1>
          <PersonPicker onPick={() => {}} />
        </div>
      </div>
    )
  }

  return (
    <>
      {view === 'lista' ? (
        <ListScreen
          store={itemsStore}
          me="Lucas"
          presence={presence}
          onOpenMenu={() => setMenuOpen(true)}
          onRegisterMarket={(amountCents) =>
            expensesStore.add({ title: 'Mercado', amountCents, dueDay: null }, { paid: true })
          }
        />
      ) : (
        <FinanceScreen
          store={expensesStore}
          me="Lucas"
          month={month}
          presence={presence}
          onMonthChange={setMonth}
          onOpenMenu={() => setMenuOpen(true)}
        />
      )}

      <MenuSheet
        open={menuOpen}
        view={view}
        me="Lucas"
        onClose={() => setMenuOpen(false)}
        onChangeView={setView}
        onSwitchPerson={() => {}}
      />
    </>
  )
}
