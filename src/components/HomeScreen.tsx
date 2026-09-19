import { motion, useReducedMotion } from 'motion/react'
import { useState } from 'react'
import type { ExpensesStore } from '../hooks/useExpenses'
import type { ItemsStore } from '../hooks/useItems'
import type { Presence } from '../hooks/usePresence'
import type { WishesStore } from '../hooks/useWishes'
import { summarize } from '../lib/balance'
import { haptic } from '../lib/haptics'
import { formatBRL } from '../lib/money'
import { parseEntry } from '../lib/parse'
import { sound } from '../lib/sound'
import { useViewportFit } from '../hooks/useViewportFit'
import { productEmoji } from '../lib/products'
import { PEOPLE } from '../lib/types'
import { forecast, sortWishes, totalDream, whenLabel } from '../lib/wishes'
import { AppHeader } from './AppHeader'
import { Avatar } from './Avatar'
import { Barcode } from './Barcode'
import type { View } from './MenuSheet'
import { Money } from './Money'
import { Rolling } from './Rolling'

interface Props {
  me: string
  presence: Presence
  items: ItemsStore
  expenses: ExpensesStore
  wishes: WishesStore
  onOpen: (view: View) => void
  onOpenMenu: () => void
}

function greeting(date = new Date()): string {
  const hour = date.getHours()
  if (hour < 5) return 'boa madrugada'
  if (hour < 12) return 'bom dia'
  if (hour < 18) return 'boa tarde'
  return 'boa noite'
}

const TODAY = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })

export function HomeScreen({ me, presence, items, expenses, wishes, onOpen, onOpenMenu }: Props) {
  const reduced = useReducedMotion()
  const [scrolled, setScrolled] = useState(false)
  const [entry, setEntry] = useState('')
  const [added, setAdded] = useState('')
  useViewportFit()
  const parsed = parseEntry(entry)
  const ready = items.ready && expenses.ready && wishes.ready

  const onShelf = items.items.filter((i) => i.status === 'pendente')
  const inCart = items.items.filter((i) => i.status === 'pegado')

  const month = summarize(expenses.expenses, PEOPLE)
  const nextBill = expenses.expenses
    .filter((e) => e.status === 'pendente')
    .sort((a, b) => (a.due_day ?? 99) - (b.due_day ?? 99))[0]

  const queue = sortWishes(wishes.wishes.filter((w) => w.status === 'querendo'))
  const plan = forecast(queue, wishes.savingsCents)
  const nextWish = queue[0]
  const nextWhen = nextWish ? whenLabel(plan.get(nextWish.id)?.monthsAway ?? null) : null

  const card = (index: number) => ({
    initial: reduced ? false : { opacity: 0, y: 10, scale: 0.99 },
    animate: { opacity: 1, y: 0, scale: 1 },
    transition: { type: 'spring' as const, stiffness: 320, damping: 28, delay: index * 0.025 },
    whileTap: reduced ? undefined : { scale: 0.975 },
  })

  const open = (view: View) => {
    haptic('light')
    onOpen(view)
  }

  return (
    <div className="app home">
      <AppHeader title="despensa" presence={presence} onOpenMenu={onOpenMenu} scrolled={scrolled} />

      <div className="scroll" onScroll={(e) => setScrolled(e.currentTarget.scrollTop > 6)}>
        <section className="home-intro">
        <motion.div
          className="hello"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 30 }}
        >
          <p className="hello-date">{TODAY.format(new Date())}</p>
          <h2 className="hello-title">
            {greeting()},
            <br />
            {me}<span className="hello-period">.</span>
            <motion.span
              className="hello-avatar"
              initial={{ scale: 0, rotate: -30 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 420, damping: 14, delay: 0.35 }}
            >
              <Avatar person={me} size={40} />
            </motion.span>
          </h2>
          {presence.online.length > 0 && (
            <motion.p className="hello-together" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <span className="pulse-dot" aria-hidden />
              {presence.online.join(' e ')} está com o app aberto agora
            </motion.p>
          )}
        </motion.div>

        <form className="quick-entry" onSubmit={(e) => {
          e.preventDefault()
          if (!parsed || !items.ready) return
          items.add(parsed.name, parsed.quantity)
          sound.unlock(); sound.add(); haptic('light')
          setAdded(`${parsed.name} na lista`); setEntry('')
        }}>
          <span className="quick-entry-mark" aria-hidden>{parsed ? productEmoji(parsed.name) || '+' : '+'}</span>
          <input aria-label="Adicionar ao mercado" placeholder="o que está faltando em casa?" value={entry} onChange={(e) => { setEntry(e.target.value); setAdded('') }} maxLength={160} enterKeyHint="send" />
          <motion.button type="submit" aria-label="Adicionar à lista" disabled={!parsed || !items.ready} whileTap={reduced ? undefined : { scale: 0.9 }}><svg viewBox="0 0 24 24" aria-hidden><path d="m7 12 5-5 5 5M12 7v11" /></svg></motion.button>
        </form>
        <p className="quick-entry-feedback" role="status">{added || (parsed?.quantity ? `${parsed.quantity} · ${parsed.name}` : 'anote aqui. a lista é de vocês dois.')}</p>
        </section>
        <div className="home-section-title"><h3>sua casa, em dia</h3><span>{ready ? 'visão geral' : 'atualizando…'}</span></div>
        <div className="home-dashboard">

        {/* ─── Mercado: uma prateleira com o que falta ─── */}
        <motion.button className="home-card home-market" onClick={() => open('lista')} {...card(0)}>
          <span className="home-awning" aria-hidden />
          <span className="home-card-head">
            <span className="home-card-name">mercado</span>
            <span className="home-card-arrow" aria-hidden>
              →
            </span>
          </span>
          <span className="home-big">
            {onShelf.length === 0 ? (
              !items.ready ? 'carregando…' : items.items.length > 0 ? 'tudo no carrinho' : 'nada faltando'
            ) : (
              <>
                faltam <Rolling value={onShelf.length} />
              </>
            )}
          </span>
          <span className="home-shelf">
            {onShelf.slice(0, 7).map((item, i) => (
              <motion.span
                key={item.id}
                initial={reduced ? false : { y: -30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 520, damping: 15, delay: 0.35 + i * 0.05 }}
              >
                {productEmoji(item.name) ?? <b className="home-initial">{item.name.charAt(0)}</b>}
              </motion.span>
            ))}
            {onShelf.length > 7 && <small>+{onShelf.length - 7}</small>}
          </span>
          {inCart.length > 0 && <span className="home-foot">{inCart.length} no carrinho</span>}
        </motion.button>

        {/* ─── Contas: um bilhete com o que falta pagar ─── */}
        <motion.button className="home-card home-bills" onClick={() => open('contas')} {...card(1)}>
          <span className="home-bills-main">
            <span className="home-card-head">
              <span className="home-card-name">contas do mês</span>
            </span>
            <small>{month.pendingCents > 0 ? 'falta pagar' : month.totalCents > 0 ? 'tudo pago' : 'nenhuma conta'}</small>
            <Money className="home-money" cents={month.pendingCents} />
            <Barcode seed="despensa-contas" width={112} height={16} />
          </span>
          <span className="home-bills-stub">
            {nextBill ? (
              <>
                <small>{nextBill.due_day && nextBill.due_day < new Date().getDate() ? 'em atraso' : nextBill.due_day === new Date().getDate() ? 'vence hoje' : 'próxima'}</small>
                <strong>{nextBill.due_day ?? '—'}</strong>
                <em>{nextBill.title}</em>
              </>
            ) : (
              <>
                <small>mês</small>
                <strong>✓</strong>
              </>
            )}
          </span>
          <span className="ticket-notch is-top home-notch" aria-hidden />
          <span className="ticket-notch is-bottom home-notch" aria-hidden />
        </motion.button>

        {month.debt && (
          <motion.button className="home-debt" onClick={() => open('contas')} {...card(2)}>
            <Avatar person={month.debt.from} size={22} />
            <span>
              {month.debt.from === me ? `você deve ${formatBRL(month.debt.cents)} para ${month.debt.to}` : `${month.debt.from} te deve ${formatBRL(month.debt.cents)}`}
            </span>
          </motion.button>
        )}

        {/* ─── Desejos: vidro sobre névoa ─── */}
        <motion.button className="home-card home-wishes" onClick={() => open('desejos')} {...card(3)}>
          <span className="home-mist" aria-hidden />
          <span className="home-card-head">
            <span className="home-card-name">
              <motion.span
                className="twinkle"
                animate={reduced ? undefined : { opacity: [0.4, 1, 0.4], rotate: [0, 90] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                aria-hidden
              >
                ✦
              </motion.span>{' '}
              desejos
            </span>
            <span className="home-card-arrow" aria-hidden>
              →
            </span>
          </span>
          <small>{queue.length ? `${queue.length} ${queue.length === 1 ? 'plano para realizar' : 'planos para realizar'}` : 'um espaço para os próximos planos'}</small>
          <Money className="home-money" cents={totalDream(queue)} />
          {nextWish && (
            <span className="home-foot">
              próximo: {nextWish.title}
              {nextWhen ? ` · ${nextWhen === 'já dá' ? 'já dá' : `dá em ${nextWhen}`}` : ''}
            </span>
          )}
        </motion.button>
        </div>
        <button className="home-notifications" onClick={onOpenMenu}><span aria-hidden>◉</span><span><strong>a casa avisa você</strong><small>conecte os avisos no celular</small></span><span aria-hidden>↗</span></button>
      </div>
    </div>
  )
}
