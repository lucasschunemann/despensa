import { useRef, useState } from 'react'
import type { ExpensesStore } from '../hooks/useExpenses'
import type { ItemsStore } from '../hooks/useItems'
import { useViewportFit } from '../hooks/useViewportFit'
import type { WishesStore } from '../hooks/useWishes'
import { summarize } from '../lib/balance'
import { haptic } from '../lib/haptics'
import { formatBRL, parseExpenseEntry } from '../lib/money'
import { parseEntry } from '../lib/parse'
import { productEmoji } from '../lib/products'
import { sound } from '../lib/sound'
import { PEOPLE } from '../lib/types'
import { forecast, sortWishes, whenLabel } from '../lib/wishes'
import { PAGE_ICON, type View } from './TabBar'
import { Callout, Composer, GroupHead, Icon, Menu, Page } from './ui'

type Destination = 'lista' | 'contas' | 'desejos'

interface Props {
  me: string
  items: ItemsStore
  expenses: ExpensesStore
  wishes: WishesStore
  onOpen: (view: View) => void
}

const TODAY = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })

function greeting(date = new Date()) {
  const hour = date.getHours()
  if (hour < 5) return 'Boa madrugada'
  if (hour < 12) return 'Bom dia'
  if (hour < 18) return 'Boa tarde'
  return 'Boa noite'
}

const DESTINATIONS: Record<Destination, { name: string; placeholder: string; aria: string; action: string }> = {
  lista: { name: 'Mercado', placeholder: '2 leites', aria: 'Adicionar ao mercado', action: 'Adicionar à lista' },
  contas: { name: 'Contas', placeholder: 'Internet 129,90 dia 15', aria: 'Adicionar conta', action: 'Adicionar conta' },
  desejos: { name: 'Desejos', placeholder: 'Poltrona 1.490', aria: 'Adicionar desejo', action: 'Adicionar desejo' },
}

export function HomeScreen({ me, items, expenses, wishes, onOpen }: Props) {
  useViewportFit()
  const input = useRef<HTMLInputElement>(null)
  const [dest, setDest] = useState<Destination>('lista')
  const [entry, setEntry] = useState('')
  const [feedback, setFeedback] = useState('')

  const pendingItems = items.items.filter((item) => item.status === 'pendente')
  const cartItems = items.items.filter((item) => item.status === 'pegado')
  const pendingBills = expenses.expenses.filter((expense) => expense.status === 'pendente')
  const month = summarize(expenses.expenses, PEOPLE)
  const nextBill = [...pendingBills].sort((a, b) => (a.due_day ?? 99) - (b.due_day ?? 99))[0]
  const overdue = pendingBills.filter((bill) => bill.due_day && bill.due_day < new Date().getDate())
  const queue = sortWishes(wishes.wishes.filter((wish) => wish.status === 'querendo'))
  const nextWish = queue[0]
  const plan = forecast(queue, wishes.savingsCents)
  const nextWhen = nextWish ? whenLabel(plan.get(nextWish.id)?.monthsAway ?? null) : null
  const ready = items.ready && expenses.ready && wishes.ready

  const parsedMarket = dest === 'lista' ? parseEntry(entry) : null
  const parsedMoney = dest !== 'lista' ? parseExpenseEntry(entry) : null
  const canSubmit = dest === 'lista' ? Boolean(parsedMarket && items.ready) : Boolean(parsedMoney && (dest === 'contas' ? expenses.ready : wishes.ready))

  const submit = () => {
    if (!canSubmit) return
    let name = ''
    if (dest === 'lista' && parsedMarket) {
      items.add(parsedMarket.name, parsedMarket.quantity)
      name = parsedMarket.name
    } else if (dest === 'contas' && parsedMoney) {
      expenses.add(parsedMoney, {})
      name = parsedMoney.title
    } else if (dest === 'desejos' && parsedMoney) {
      wishes.add(parsedMoney.title, parsedMoney.amountCents)
      name = parsedMoney.title
    }
    setFeedback(`${name} foi para ${DESTINATIONS[dest].name}`)
    sound.unlock()
    sound.add()
    haptic('success')
    setEntry('')
  }

  // o que o app entendeu do que está escrito
  const understood = parsedMoney
    ? `${parsedMoney.title}${parsedMoney.amountCents ? ` · ${formatBRL(parsedMoney.amountCents)}` : ''}${parsedMoney.dueDay ? ` · dia ${parsedMoney.dueDay}` : ''}`
    : parsedMarket
      ? `${productEmoji(parsedMarket.name) ?? ''} ${parsedMarket.name}${parsedMarket.quantity ? ` · ${parsedMarket.quantity}` : ''}`.trim()
      : ''

  const open = (view: View) => {
    haptic('light')
    onOpen(view)
  }

  const list = pendingItems.slice(0, 3).map((item) => item.name).join(', ')

  return (
    <Page title={`${greeting()}, ${me}`} eyebrow={TODAY.format(new Date())}>
      <div className="capture">
        <Composer
          inputRef={input}
          value={entry}
          onChange={(value) => { setEntry(value); setFeedback('') }}
          onSubmit={submit}
          canSubmit={canSubmit}
          placeholder={DESTINATIONS[dest].placeholder}
          label={DESTINATIONS[dest].aria}
          sendLabel={DESTINATIONS[dest].action}
          leading={
            <Menu<Destination>
              label="Onde adicionar"
              value={dest}
              placement="down"
              onChange={(next) => { setDest(next); setFeedback(''); requestAnimationFrame(() => input.current?.focus()) }}
              options={(Object.keys(DESTINATIONS) as Destination[]).map((key) => ({ value: key, label: DESTINATIONS[key].name, icon: PAGE_ICON[key] }))}
            >
              <span className="dest"><span aria-hidden>{PAGE_ICON[dest]}</span>{DESTINATIONS[dest].name}<Icon name="down" size={14} /></span>
            </Menu>
          }
        />
        <p className="capture-hint" role="status">{entry ? understood : feedback}</p>
      </div>

      {overdue.length > 0 && (
        <Callout icon="⏰" tone="red">
          <button type="button" onClick={() => open('contas')} style={{ textAlign: 'left' }}>
            {overdue.length === 1 ? `${overdue[0].title} venceu dia ${overdue[0].due_day}` : `${overdue.length} contas atrasadas`}
          </button>
        </Callout>
      )}
      {month.debt && (
        <Callout icon="🤝">
          {month.debt.from === me ? `Você deve ${formatBRL(month.debt.cents)} para ${month.debt.to}.` : `${month.debt.from} te deve ${formatBRL(month.debt.cents)}.`}
        </Callout>
      )}

      <GroupHead>Páginas</GroupHead>
      <ul className="links">
        <li>
          <button type="button" className="link-row" onClick={() => open('lista')}>
            <span className="link-icon" aria-hidden>{PAGE_ICON.lista}</span>
            <span className="link-text">
              <span className="link-title">Mercado</span>
              <span className="link-detail">{list ? `${list}${pendingItems.length > 3 ? '…' : ''}` : cartItems.length ? `${cartItems.length} no carrinho` : 'Nada faltando'}</span>
            </span>
            <span className="link-value">{ready ? (pendingItems.length ? `${pendingItems.length} ${pendingItems.length === 1 ? 'item' : 'itens'}` : '') : ''}</span>
          </button>
        </li>
        <li>
          <button type="button" className="link-row" onClick={() => open('contas')}>
            <span className="link-icon" aria-hidden>{PAGE_ICON.contas}</span>
            <span className="link-text">
              <span className="link-title">Contas</span>
              <span className="link-detail">{nextBill ? `Próxima: ${nextBill.title}${nextBill.due_day ? `, dia ${nextBill.due_day}` : ''}` : month.totalCents ? 'Tudo pago no mês' : 'Nada lançado no mês'}</span>
            </span>
            <span className="link-value">{ready && month.pendingCents ? formatBRL(month.pendingCents) : ''}</span>
          </button>
        </li>
        <li>
          <button type="button" className="link-row" onClick={() => open('desejos')}>
            <span className="link-icon" aria-hidden>{PAGE_ICON.desejos}</span>
            <span className="link-text">
              <span className="link-title">Desejos</span>
              <span className="link-detail">{nextWish ? `${nextWish.title}${nextWhen ? (nextWhen === 'já dá' ? ', já dá para comprar' : `, sai em ${nextWhen}`) : ''}` : 'Nenhum desejo na fila'}</span>
            </span>
            <span className="link-value">{ready && queue.length ? `${queue.length} na fila` : ''}</span>
          </button>
        </li>
      </ul>
    </Page>
  )
}
