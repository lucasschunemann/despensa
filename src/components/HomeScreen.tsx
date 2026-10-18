import { useRef, useState } from 'react'
import type { ExpensesStore } from '../hooks/useExpenses'
import type { ItemsStore } from '../hooks/useItems'
import { useViewportFit } from '../hooks/useViewportFit'
import type { WishesStore } from '../hooks/useWishes'
import { summarize } from '../lib/balance'
import { haptic } from '../lib/haptics'
import { monthLabel } from '../lib/month'
import { formatBRL, parseExpenseEntry } from '../lib/money'
import { parseEntry } from '../lib/parse'
import { productEmoji } from '../lib/products'
import { sound } from '../lib/sound'
import { PEOPLE } from '../lib/types'
import { forecast, sortWishes, whenLabel } from '../lib/wishes'
import type { View } from './TabBar'
import { Accessory, Composer, Glyph, Icon, PullDown, Screen, Toast, type FilledName } from './ui'

type Destination = 'lista' | 'contas' | 'desejos'

interface Props {
  me: string
  items: ItemsStore
  expenses: ExpensesStore
  wishes: WishesStore
  onOpen: (view: View) => void
}

const TODAY = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })

const DESTINATIONS: Record<Destination, { name: string; icon: FilledName; tint: string; placeholder: string; aria: string; action: string }> = {
  lista: { name: 'Mercado', icon: 'cart', tint: 't-green', placeholder: '2 leites', aria: 'Adicionar ao mercado', action: 'Adicionar à lista' },
  contas: { name: 'Contas', icon: 'doc', tint: 't-blue', placeholder: 'Internet 129,90 dia 15', aria: 'Adicionar conta', action: 'Adicionar conta' },
  desejos: { name: 'Desejos', icon: 'heart', tint: 't-pink', placeholder: 'Poltrona 1.490', aria: 'Adicionar desejo', action: 'Adicionar desejo' },
}

export function HomeScreen({ me, items, expenses, wishes, onOpen }: Props) {
  useViewportFit()
  const input = useRef<HTMLInputElement>(null)
  const [dest, setDest] = useState<Destination>('lista')
  const [entry, setEntry] = useState('')
  const [notice, setNotice] = useState<string | null>(null)

  const pendingItems = items.items.filter((item) => item.status === 'pendente')
  const cartItems = items.items.filter((item) => item.status === 'pegado')
  const pendingBills = expenses.expenses.filter((expense) => expense.status === 'pendente')
  const month = summarize(expenses.expenses, PEOPLE)
  const nextBill = [...pendingBills].sort((a, b) => (a.due_day ?? 99) - (b.due_day ?? 99))[0]
  const overdue = pendingBills.filter((bill) => bill.due_day && bill.due_day < new Date().getDate()).length
  const queue = sortWishes(wishes.wishes.filter((wish) => wish.status === 'querendo'))
  const nextWish = queue[0]
  const plan = forecast(queue, wishes.savingsCents)
  const nextWhen = nextWish ? whenLabel(plan.get(nextWish.id)?.monthsAway ?? null) : null
  const currentMonth = expenses.expenses[0]?.month

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
    setNotice(`${name} adicionado em ${DESTINATIONS[dest].name}`)
    sound.unlock()
    sound.add()
    haptic('success')
    setEntry('')
  }

  // o campo mostra o que entendeu enquanto se escreve
  const chip = parsedMoney
    ? [parsedMoney.amountCents ? formatBRL(parsedMoney.amountCents) : null, parsedMoney.dueDay ? `dia ${parsedMoney.dueDay}` : null].filter(Boolean).join(' · ') || null
    : parsedMarket
      ? [productEmoji(parsedMarket.name), parsedMarket.quantity].filter(Boolean).join(' ') || null
      : null

  const open = (view: View) => {
    haptic('light')
    onOpen(view)
  }

  const emojis = pendingItems.map((item) => productEmoji(item.name)).filter((emoji): emoji is string => Boolean(emoji))
  const shownEmojis = emojis.slice(0, 7)
  const destination = DESTINATIONS[dest]

  return (
    <Screen
      title="Início"
      eyebrow={TODAY.format(new Date())}
      accessory={
        <Accessory toasts={notice && <Toast key={notice} duration={2600} onDismiss={() => setNotice(null)}>{notice}</Toast>}>
          <div className={destination.tint}>
            <Composer
              inputRef={input}
              value={entry}
              onChange={setEntry}
              onSubmit={submit}
              canSubmit={canSubmit}
              placeholder={destination.placeholder}
              label={destination.aria}
              sendLabel={destination.action}
              chip={chip}
              leading={
                <PullDown<Destination>
                  label="Onde adicionar"
                  value={dest}
                  onChange={(next) => { setDest(next); requestAnimationFrame(() => input.current?.focus()) }}
                  options={(Object.keys(DESTINATIONS) as Destination[]).map((key) => ({
                    value: key,
                    label: DESTINATIONS[key].name,
                    icon: <span className={DESTINATIONS[key].tint} style={{ color: 'var(--tint)' }}><Glyph name={DESTINATIONS[key].icon} size={20} /></span>,
                  }))}
                >
                  <span className="composer-dest">
                    <Glyph name={destination.icon} size={16} />
                    {destination.name}
                    <Icon name="down" size={13} weight={2.6} />
                  </span>
                </PullDown>
              }
            />
          </div>
        </Accessory>
      }
    >
      <div className="cards">
        <button className="card t-green" onClick={() => open('lista')} aria-label={`Mercado: ${pendingItems.length} ${pendingItems.length === 1 ? 'item' : 'itens'} para comprar`}>
          <span className="card-head">
            <Glyph name="cart" />Mercado
            <span className="card-side">{cartItems.length > 0 && `${cartItems.length} no carrinho`}<Icon name="right" size={13} weight={2.6} /></span>
          </span>
          {pendingItems.length > 0 ? (
            <span className="card-value"><strong>{pendingItems.length}</strong><span>{pendingItems.length === 1 ? 'item' : 'itens'}</span></span>
          ) : (
            <span className="card-value"><strong>{items.ready ? 'Nada faltando' : '–'}</strong></span>
          )}
          {shownEmojis.length > 0 && (
            <span className="card-stack" aria-hidden>
              {shownEmojis.map((emoji, i) => <span key={i}>{emoji}</span>)}
              {pendingItems.length > shownEmojis.length && <span className="more">+{pendingItems.length - shownEmojis.length}</span>}
            </span>
          )}
        </button>

        <button className="card t-blue" onClick={() => open('contas')} aria-label={`Contas: ${month.pendingCents ? `${formatBRL(month.pendingCents)} a pagar` : 'tudo pago'}`}>
          <span className="card-head">
            <Glyph name="doc" />Contas
            <span className="card-side">{currentMonth && monthLabel(currentMonth).replace(/^./, (c) => c.toUpperCase())}<Icon name="right" size={13} weight={2.6} /></span>
          </span>
          <span className="card-value">
            <strong>{month.pendingCents ? formatBRL(month.pendingCents) : month.totalCents ? 'Tudo pago' : 'Nada lançado'}</strong>
            {month.pendingCents > 0 && <span>a pagar</span>}
          </span>
          {overdue > 0 && <span className="card-detail is-alert">{overdue} {overdue === 1 ? 'conta atrasada' : 'contas atrasadas'}</span>}
          {nextBill && overdue === 0 && <span className="card-detail">Próxima: {nextBill.title}{nextBill.due_day ? `, dia ${nextBill.due_day}` : ''}</span>}
          {month.debt && (
            <span className="card-detail">
              {month.debt.from === me ? `Você deve ${formatBRL(month.debt.cents)} para ${month.debt.to}` : `${month.debt.from} te deve ${formatBRL(month.debt.cents)}`}
            </span>
          )}
        </button>

        <button className="card t-pink" onClick={() => open('desejos')} aria-label={`Desejos: ${queue.length} na fila`}>
          <span className="card-head">
            <Glyph name="heart" />Desejos
            <span className="card-side"><Icon name="right" size={13} weight={2.6} /></span>
          </span>
          <span className="card-value">
            <strong>{queue.length || (wishes.ready ? 'Nenhum' : '–')}</strong>
            {queue.length > 0 && <span>{queue.length === 1 ? 'desejo' : 'desejos'}</span>}
          </span>
          {nextWish && <span className="card-detail">{nextWish.title}{nextWhen ? (nextWhen === 'já dá' ? ' já dá para comprar' : ` sai em ${nextWhen}`) : ''}</span>}
        </button>
      </div>
    </Screen>
  )
}
