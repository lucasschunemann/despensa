import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useRef, useState, type FormEvent, type ReactNode } from 'react'
import type { ExpensesStore } from '../hooks/useExpenses'
import type { ItemsStore } from '../hooks/useItems'
import type { Presence } from '../hooks/usePresence'
import type { WishesStore } from '../hooks/useWishes'
import { useViewportFit } from '../hooks/useViewportFit'
import { summarize } from '../lib/balance'
import { haptic } from '../lib/haptics'
import { formatBRL, parseExpenseEntry } from '../lib/money'
import { parseEntry } from '../lib/parse'
import { sound } from '../lib/sound'
import { PEOPLE } from '../lib/types'
import { forecast, sortWishes, whenLabel } from '../lib/wishes'
import { AppHeader } from './AppHeader'
import { Avatar, Mascot } from './Avatar'
import type { View } from './MenuSheet'

type CaptureMode = 'lista' | 'contas' | 'desejos'

interface Props {
  me: string
  presence: Presence
  items: ItemsStore
  expenses: ExpensesStore
  wishes: WishesStore
  onOpen: (view: View) => void
  onOpenMenu: () => void
  onOpenSettings: () => void
}

const TODAY = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })

function greeting(date = new Date()) {
  const hour = date.getHours()
  if (hour < 5) return 'boa madrugada'
  if (hour < 12) return 'bom dia'
  if (hour < 18) return 'boa tarde'
  return 'boa noite'
}

const CAPTURE: Record<CaptureMode, { label: string; aria: string; placeholder: string; action: string }> = {
  lista: { label: 'mercado', aria: 'Adicionar ao mercado', placeholder: 'ex.: 2 leites', action: 'Adicionar à lista' },
  contas: { label: 'conta', aria: 'Adicionar conta', placeholder: 'ex.: internet 129,90 dia 15', action: 'Adicionar conta' },
  desejos: { label: 'desejo', aria: 'Adicionar desejo', placeholder: 'ex.: poltrona 1.490', action: 'Adicionar desejo' },
}

export function HomeScreen({ me, presence, items, expenses, wishes, onOpen, onOpenMenu, onOpenSettings }: Props) {
  const reduced = useReducedMotion()
  const input = useRef<HTMLInputElement>(null)
  const [scrolled, setScrolled] = useState(false)
  const [mode, setMode] = useState<CaptureMode>('lista')
  const [entry, setEntry] = useState('')
  const [feedback, setFeedback] = useState('')
  useViewportFit()

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

  // A linha só existe quando tem o que dizer. Sem pendência, o lugar dela vira respiro.
  const note = !ready
    ? 'sincronizando a casa.'
    : overdue
      ? `${overdue} ${overdue === 1 ? 'conta atrasada' : 'contas atrasadas'}.`
      : pendingItems.length + pendingBills.length === 0
        ? 'nada pendente por aqui.'
        : null

  const parsedMarket = mode === 'lista' ? parseEntry(entry) : null
  const parsedMoney = mode !== 'lista' ? parseExpenseEntry(entry) : null
  const canSubmit = mode === 'lista' ? Boolean(parsedMarket && items.ready) : Boolean(parsedMoney && (mode === 'contas' ? expenses.ready : wishes.ready))

  const open = (view: View) => {
    haptic('light')
    sound.tick()
    onOpen(view)
  }

  const selectMode = (next: CaptureMode) => {
    setMode(next)
    setFeedback('')
    haptic('light')
    sound.tick()
    requestAnimationFrame(() => input.current?.focus())
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!canSubmit) return
    if (mode === 'lista' && parsedMarket) {
      items.add(parsedMarket.name, parsedMarket.quantity)
      setFeedback(`${parsedMarket.name} na lista`)
    } else if (mode === 'contas' && parsedMoney) {
      expenses.add(parsedMoney, {})
      setFeedback(`${parsedMoney.title} nas contas`)
    } else if (mode === 'desejos' && parsedMoney) {
      wishes.add(parsedMoney.title, parsedMoney.amountCents)
      setFeedback(`${parsedMoney.title} nos desejos`)
    }
    sound.unlock(); sound.add(); haptic('success'); setEntry('')
  }

  const reveal = (index: number) => ({
    initial: reduced ? false : { opacity: 0, y: 14, filter: 'blur(4px)' },
    animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
    transition: { type: 'spring' as const, stiffness: 330, damping: 30, delay: index * .06 },
  })

  return (
    <div className="app home home-v3">
      <AppHeader
        title="despensa"
        presence={presence}
        onOpenMenu={onOpenMenu}
        scrolled={scrolled}
        accessory={<button className="home-profile" onClick={onOpenSettings} aria-label="Abrir configurações"><Avatar person={me} size={28} /></button>}
      />

      <div className="scroll" onScroll={(event) => setScrolled(event.currentTarget.scrollTop > 6)}>
        <motion.section className="home-hello" {...reveal(0)}>
          <div className="home-hello-text">
            <span className="home-kicker">{TODAY.format(new Date())}</span>
            <h2>{greeting()}, {me}.</h2>
            <AnimatePresence initial={false}>
              {note && <motion.p key={note} className="home-hello-note" initial={reduced ? false : { opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: .22 }}>{note}</motion.p>}
            </AnimatePresence>
          </div>
          <motion.div
            className="home-brand"
            initial={reduced ? false : { opacity: 0, scale: .88 }}
            animate={{ opacity: 1, scale: 1, y: reduced ? 0 : [0, -5, 0], rotate: reduced ? 0 : [0, -1.6, 1, 0] }}
            transition={{ opacity: { duration: .4 }, scale: { type: 'spring', stiffness: 260, damping: 22 }, y: { duration: 4.6, repeat: Infinity, ease: 'easeInOut' }, rotate: { duration: 6.4, repeat: Infinity, ease: 'easeInOut' } }}
          >
            <Mascot size={78} />
          </motion.div>
        </motion.section>

        <motion.section className="home-capture" {...reveal(1)}>
          <div className="capture-modes" role="tablist" aria-label="Onde adicionar">
            {(Object.keys(CAPTURE) as CaptureMode[]).map((value) => (
              <button key={value} type="button" role="tab" aria-selected={mode === value} onClick={() => selectMode(value)}>
                <span>{CAPTURE[value].label}</span>
                {mode === value && <motion.span className="capture-selection" layoutId="capture-selection" transition={{ type: 'spring', stiffness: 520, damping: 40 }} />}
              </button>
            ))}
          </div>
          <form className="capture-form" onSubmit={submit}>
            <CaptureIcon mode={mode} />
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.input key={mode} ref={input} aria-label={CAPTURE[mode].aria} placeholder={CAPTURE[mode].placeholder} value={entry} onChange={(event) => { setEntry(event.target.value); setFeedback('') }} maxLength={160} enterKeyHint="send" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -6 }} transition={{ duration: .16 }} />
            </AnimatePresence>
            <motion.button type="submit" aria-label={CAPTURE[mode].action} disabled={!canSubmit} animate={{ rotate: canSubmit ? 0 : -45, scale: canSubmit ? 1 : .88 }} whileTap={{ scale: .84 }}><svg viewBox="0 0 24 24" aria-hidden><path d="M12 5v14M5 12h14" /></svg></motion.button>
          </form>
          <p className="capture-feedback" role="status">{feedback || (entry && parsedMoney ? `${parsedMoney.title}${parsedMoney.amountCents ? ` · ${formatBRL(parsedMoney.amountCents)}` : ''}` : 'escreva do jeito que você lembra.')}</p>
        </motion.section>

        <motion.section className="home-flow" {...reveal(2)}>
          <div className="home-dashboard">
            <HomeRow className="home-market" label="mercado" value={pendingItems.length ? `${pendingItems.length} ${pendingItems.length === 1 ? 'item' : 'itens'}` : 'lista limpa'} detail={cartItems.length ? `${cartItems.length} no carrinho` : 'pronto para a próxima compra'} onClick={() => open('lista')} icon={<BasketIcon />} index={0} />
            <HomeRow className="home-bills" label="contas" value={month.pendingCents ? formatBRL(month.pendingCents) : 'tudo pago'} detail={nextBill ? `${nextBill.title}${nextBill.due_day ? ` · dia ${nextBill.due_day}` : ''}` : 'nenhuma pendência neste mês'} onClick={() => open('contas')} icon={<BillIcon />} index={1} />
            <HomeRow className="home-wishes" label="desejos" value={queue.length ? `${queue.length} ${queue.length === 1 ? 'plano' : 'planos'}` : 'nenhum plano'} detail={nextWish ? `${nextWish.title}${nextWhen ? ` · ${nextWhen}` : ''}` : 'guarde aqui o que vem depois'} onClick={() => open('desejos')} icon={<HeartIcon />} index={2} />
          </div>
          {month.debt && <motion.button className="home-balance-note" onClick={() => open('contas')} whileTap={{ scale: .985 }}><Avatar person={month.debt.from} size={22} /><span>{month.debt.from === me ? `você deve ${formatBRL(month.debt.cents)} para ${month.debt.to}` : `${month.debt.from} te deve ${formatBRL(month.debt.cents)}`}</span><Chevron /></motion.button>}
        </motion.section>
      </div>
    </div>
  )
}

function HomeRow({ className, label, value, detail, icon, onClick, index }: { className: string; label: string; value: string; detail: string; icon: ReactNode; onClick: () => void; index: number }) {
  return (
    <motion.button
      className={`home-module-row ${className}`}
      onClick={onClick}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 360, damping: 31, delay: .18 + index * .05 }}
      whileTap={{ scale: .99 }}
    >
      <span className="home-module-icon" aria-hidden>{icon}</span>
      <span className="home-module-copy"><strong>{label}</strong><em>{detail}</em></span>
      <span className="home-module-value">{value}</span>
      <Chevron />
    </motion.button>
  )
}

function CaptureIcon({ mode }: { mode: CaptureMode }) { return <span className="capture-icon" aria-hidden>{mode === 'lista' ? <BasketIcon /> : mode === 'contas' ? <BillIcon /> : <HeartIcon />}</span> }
function BasketIcon() { return <svg viewBox="0 0 24 24" aria-hidden><path d="M4 8h16l-1.4 11H5.4Z"/><path d="M8.5 8A3.5 3.5 0 0 1 12 4.5 3.5 3.5 0 0 1 15.5 8"/></svg> }
function BillIcon() { return <svg viewBox="0 0 24 24" aria-hidden><path d="M6 3h12v18l-3-2-3 2-3-2-3 2Z"/><path d="M9 8h6M9 12h6"/></svg> }
function HeartIcon() { return <svg viewBox="0 0 24 24" aria-hidden><path d="M12 20 4.8 13a4.6 4.6 0 0 1 6.5-6.5l.7.7.7-.7A4.6 4.6 0 0 1 19.2 13Z"/></svg> }
function Chevron() { return <svg className="home-chevron" viewBox="0 0 24 24" aria-hidden><path d="m9 5 7 7-7 7" /></svg> }
