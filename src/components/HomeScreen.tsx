import { useRef, useState } from 'react'
import type { ExpensesStore } from '../hooks/useExpenses'
import type { ItemsStore } from '../hooks/useItems'
import type { WishesStore } from '../hooks/useWishes'
import { useViewportFit } from '../hooks/useViewportFit'
import { summarize } from '../lib/balance'
import { haptic } from '../lib/haptics'
import { formatBRL, parseExpenseEntry } from '../lib/money'
import { parseEntry } from '../lib/parse'
import { sound } from '../lib/sound'
import { PEOPLE } from '../lib/types'
import { forecast, sortWishes, whenLabel } from '../lib/wishes'
import { Avatar } from './Avatar'
import type { View } from './TabBar'
import { Composer, Group, Icon, Row, Screen, Segmented } from './ui'

type CaptureMode = 'lista' | 'contas' | 'desejos'

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
  if (hour < 5) return 'boa madrugada'
  if (hour < 12) return 'bom dia'
  if (hour < 18) return 'boa tarde'
  return 'boa noite'
}

const CAPTURE: Record<CaptureMode, { aria: string; placeholder: string; action: string; where: string }> = {
  lista: { aria: 'Adicionar ao mercado', placeholder: '2 leites', action: 'Adicionar à lista', where: 'na lista' },
  contas: { aria: 'Adicionar conta', placeholder: 'internet 129,90 dia 15', action: 'Adicionar conta', where: 'nas contas' },
  desejos: { aria: 'Adicionar desejo', placeholder: 'poltrona 1.490', action: 'Adicionar desejo', where: 'nos desejos' },
}

export function HomeScreen({ me, items, expenses, wishes, onOpen }: Props) {
  useViewportFit()
  const input = useRef<HTMLInputElement>(null)
  const [mode, setMode] = useState<CaptureMode>('lista')
  const [entry, setEntry] = useState('')
  const [feedback, setFeedback] = useState('')

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
  const ready = items.ready && expenses.ready && wishes.ready

  const parsedMarket = mode === 'lista' ? parseEntry(entry) : null
  const parsedMoney = mode !== 'lista' ? parseExpenseEntry(entry) : null
  const canSubmit = mode === 'lista' ? Boolean(parsedMarket && items.ready) : Boolean(parsedMoney && (mode === 'contas' ? expenses.ready : wishes.ready))

  const selectMode = (next: CaptureMode) => {
    setMode(next)
    setFeedback('')
    requestAnimationFrame(() => input.current?.focus())
  }

  const submit = () => {
    if (!canSubmit) return
    if (mode === 'lista' && parsedMarket) {
      items.add(parsedMarket.name, parsedMarket.quantity)
      setFeedback(`${parsedMarket.name} ${CAPTURE.lista.where}`)
    } else if (mode === 'contas' && parsedMoney) {
      expenses.add(parsedMoney, {})
      setFeedback(`${parsedMoney.title} ${CAPTURE.contas.where}`)
    } else if (mode === 'desejos' && parsedMoney) {
      wishes.add(parsedMoney.title, parsedMoney.amountCents)
      setFeedback(`${parsedMoney.title} ${CAPTURE.desejos.where}`)
    }
    sound.unlock()
    sound.add()
    haptic('success')
    setEntry('')
  }

  // o campo devolve o que o app entendeu do que está escrito
  const understood = parsedMoney
    ? `${parsedMoney.title}${parsedMoney.amountCents ? ` · ${formatBRL(parsedMoney.amountCents)}` : ''}${parsedMoney.dueDay ? ` · dia ${parsedMoney.dueDay}` : ''}`
    : parsedMarket
      ? `${parsedMarket.name}${parsedMarket.quantity ? ` · ${parsedMarket.quantity}` : ''}`
      : ''
  const hint = entry ? understood : feedback

  const open = (view: View) => {
    haptic('light')
    onOpen(view)
  }

  return (
    <Screen title={`${greeting()}, ${me}`} subtitle={TODAY.format(new Date())}>
      <Group title="adicionar" className="capture">
        <div className="capture-body">
          <Segmented
            label="Onde adicionar"
            value={mode}
            onChange={selectMode}
            options={[
              { value: 'lista', label: 'mercado' },
              { value: 'contas', label: 'conta' },
              { value: 'desejos', label: 'desejo' },
            ]}
          />
          <Composer
            inputRef={input}
            value={entry}
            onChange={(value) => { setEntry(value); setFeedback('') }}
            onSubmit={submit}
            canSubmit={canSubmit}
            placeholder={CAPTURE[mode].placeholder}
            label={CAPTURE[mode].aria}
            sendLabel={CAPTURE[mode].action}
          />
          <p className="capture-hint" role="status">{hint}</p>
        </div>
      </Group>

      <Group title="resumo">
        <Row
          icon={<Icon name="basket" size={20} />}
          title="mercado"
          detail={cartItems.length ? `${cartItems.length} no carrinho` : undefined}
          value={!ready ? '' : pendingItems.length ? `${pendingItems.length} ${pendingItems.length === 1 ? 'item' : 'itens'}` : 'lista limpa'}
          chevron
          onClick={() => open('lista')}
        />
        <Row
          icon={<Icon name="receipt" size={20} />}
          title="contas"
          detail={nextBill ? `${nextBill.title}${nextBill.due_day ? ` · dia ${nextBill.due_day}` : ''}` : undefined}
          value={!ready ? '' : month.pendingCents ? formatBRL(month.pendingCents) : 'tudo pago'}
          chevron
          onClick={() => open('contas')}
        />
        <Row
          icon={<Icon name="heart" size={20} />}
          title="desejos"
          detail={nextWish ? `${nextWish.title}${nextWhen ? ` · ${nextWhen === 'já dá' ? nextWhen : `dá em ${nextWhen}`}` : ''}` : undefined}
          value={!ready ? '' : queue.length ? `${queue.length} ${queue.length === 1 ? 'desejo' : 'desejos'}` : 'nenhum'}
          chevron
          onClick={() => open('desejos')}
        />
      </Group>

      {(overdue > 0 || month.debt) && (
        <Group title="atenção">
          {overdue > 0 && (
            <Row
              icon={<Icon name="bell" size={20} />}
              title={`${overdue} ${overdue === 1 ? 'conta atrasada' : 'contas atrasadas'}`}
              danger
              chevron
              onClick={() => open('contas')}
            />
          )}
          {month.debt && (
            <Row
              icon={<Avatar person={month.debt.from} size={26} />}
              title={month.debt.from === me ? `você deve ${formatBRL(month.debt.cents)} para ${month.debt.to}` : `${month.debt.from} te deve ${formatBRL(month.debt.cents)}`}
              chevron
              onClick={() => open('contas')}
            />
          )}
        </Group>
      )}
    </Screen>
  )
}
