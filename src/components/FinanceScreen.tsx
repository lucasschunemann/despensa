import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { ExpensesStore } from '../hooks/useExpenses'
import type { Presence } from '../hooks/usePresence'
import { useViewportFit } from '../hooks/useViewportFit'
import { summarize } from '../lib/balance'
import { haptic } from '../lib/haptics'
import { isCurrentMonth, monthKey, monthLabel, shiftMonth } from '../lib/month'
import { formatBRL } from '../lib/money'
import { sound } from '../lib/sound'
import type { Expense } from '../lib/types'
import { PEOPLE } from '../lib/types'
import { AppHeader } from './AppHeader'
import { Avatar } from './Avatar'
import { CompleteOverlay } from './CompleteOverlay'
import { ExpenseComposer } from './ExpenseComposer'
import { ExpenseRow } from './ExpenseRow'
import { Money, MoneyRain } from './Money'
import { Skeleton } from './Skeleton'

interface Props {
  store: ExpensesStore
  me: string
  month: string
  presence: Presence
  onMonthChange: (month: string) => void
  onOpenMenu: () => void
}

export function FinanceScreen({ store, me, month, presence, onMonthChange, onOpenMenu }: Props) {
  const {
    expenses,
    ready,
    error,
    clearError,
    add,
    togglePaid,
    cycleSplit,
    remove,
    stopRecurring,
    restore,
    settleMonth,
  } = store
  const [openId, setOpenId] = useState<string | null>(null)
  const [rain, setRain] = useState(0)
  const [deleted, setDeleted] = useState<Expense | null>(null)
  const [asking, setAsking] = useState<Expense | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [closing, setClosing] = useState(false)
  const [direction, setDirection] = useState(1)
  const scroller = useRef<HTMLDivElement>(null)
  // começa falso: ao abrir o mês a pessoa precisa ver o resumo, não o fim da lista
  const nearBottom = useRef(false)
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const scrollToEnd = useCallback((behavior: ScrollBehavior = 'smooth') => {
    requestAnimationFrame(() => {
      const el = scroller.current
      if (el) el.scrollTo({ top: el.scrollHeight, behavior })
    })
  }, [])
  const keepAnchored = useCallback(() => {
    if (nearBottom.current) scrollToEnd('auto')
  }, [scrollToEnd])
  useViewportFit(keepAnchored)

  const summary = summarize(expenses, PEOPLE)
  const pending = expenses
    .filter((e) => e.status === 'pendente')
    .sort((a, b) => (a.due_day ?? 99) - (b.due_day ?? 99) || a.created_at.localeCompare(b.created_at))
  const paid = expenses
    .filter((e) => e.status === 'pago')
    .sort((a, b) => (a.paid_at ?? '').localeCompare(b.paid_at ?? ''))
  const done = expenses.length > 0 && pending.length === 0
  const progress = summary.totalCents > 0 ? summary.paidCents / summary.totalCents : 0

  // "mês fechado" só dispara na virada, nunca ao abrir um mês que já estava fechado
  const wasDone = useRef<boolean | null>(null)
  useEffect(() => {
    const previous = wasDone.current
    wasDone.current = done
    if (!ready || previous === null || previous || !done) return
    sound.complete()
    haptic('success')
    setClosing(true)
    const timer = setTimeout(() => setClosing(false), 1900)
    return () => clearTimeout(timer)
  }, [done, ready])

  useEffect(() => {
    wasDone.current = null
  }, [month])

  const goMonth = (delta: number) => {
    setDirection(delta)
    haptic('light')
    onMonthChange(shiftMonth(month, delta))
  }

  const handleTogglePaid = (expense: Expense) => {
    if (expense.status === 'pendente') {
      sound.cash()
      haptic('medium')
      setRain((n) => n + 1)
    } else {
      sound.undo()
      haptic('light')
    }
    togglePaid(expense)
  }

  const removeThisMonth = (expense: Expense) => {
    sound.undo()
    haptic('medium')
    remove(expense)
    setDeleted(expense)
    if (undoTimer.current) clearTimeout(undoTimer.current)
    undoTimer.current = setTimeout(() => setDeleted(null), 5000)
  }

  // conta que se repete pergunta antes: só deste mês, ou deste mês em diante
  const handleRemove = (expense: Expense) => {
    setOpenId(null)
    if (expense.recurrence_id) {
      haptic('light')
      setAsking(expense)
      return
    }
    removeThisMonth(expense)
  }

  const handleStop = (expense: Expense) => {
    sound.undo()
    haptic('medium')
    stopRecurring(expense)
    setAsking(null)
    setNotice(`${expense.title} parou de se repetir`)
    setTimeout(() => setNotice(null), 4000)
  }

  const handleSettle = () => {
    sound.settle()
    haptic('success')
    setRain((n) => n + 1)
    settleMonth()
  }

  return (
    <div className="app">
      <AppHeader title="contas" presence={presence} onOpenMenu={onOpenMenu} />

      <div className="month-bar">
        <button className="month-arrow" onClick={() => goMonth(-1)} aria-label="Mês anterior">
          <svg viewBox="0 0 24 24" aria-hidden>
            <path d="M14.5 5.5 8 12l6.5 6.5" />
          </svg>
        </button>

        <div className="month-name">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={month}
              initial={{ opacity: 0, x: direction * 18 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction * -18 }}
              transition={{ type: 'spring', stiffness: 460, damping: 36 }}
            >
              {monthLabel(month)}
            </motion.span>
          </AnimatePresence>
        </div>

        <button className="month-arrow" onClick={() => goMonth(1)} aria-label="Próximo mês">
          <svg viewBox="0 0 24 24" aria-hidden>
            <path d="M9.5 5.5 16 12l-6.5 6.5" />
          </svg>
        </button>

        <AnimatePresence>
          {!isCurrentMonth(month) && (
            <motion.button
              className="month-today"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={() => {
                setDirection(month < monthKey() ? 1 : -1)
                onMonthChange(monthKey())
              }}
            >
              hoje
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {error && (
        <button className="banner banner-error" onClick={clearError}>
          {error}
        </button>
      )}

      <div
        className="scroll"
        ref={scroller}
        onPointerDown={() => setOpenId(null)}
        onScroll={(e) => {
          const el = e.currentTarget
          nearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80
        }}
      >
        <motion.section
          className="summary"
          layout
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 380, damping: 32 }}
        >
          <p className="summary-label">{summary.pendingCents > 0 ? 'falta pagar' : 'pago no mês'}</p>
          <Money
            className="summary-value"
            cents={summary.pendingCents > 0 ? summary.pendingCents : summary.paidCents}
          />

          <div className="summary-bar" aria-hidden>
            <motion.span
              initial={false}
              animate={{ scaleX: progress }}
              transition={{ type: 'spring', stiffness: 220, damping: 32 }}
            />
          </div>

          <p className="summary-line">
            {formatBRL(summary.paidCents)} de {formatBRL(summary.totalCents)} · {paid.length} de{' '}
            {expenses.length} contas
          </p>

          <AnimatePresence mode="popLayout">
            {summary.debt ? (
              <motion.div
                key="debt"
                className="debt"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.94 }}
                transition={{ type: 'spring', stiffness: 420, damping: 34 }}
              >
                <Avatar person={summary.debt.from} size={26} />
                <span className="debt-text">
                  {summary.debt.from === me ? (
                    <>
                      você deve <strong>{formatBRL(summary.debt.cents)}</strong> para{' '}
                      {summary.debt.to}
                    </>
                  ) : (
                    <>
                      {summary.debt.from} te deve <strong>{formatBRL(summary.debt.cents)}</strong>
                    </>
                  )}
                </span>
                <button className="debt-settle" onClick={handleSettle}>
                  acertamos
                </button>
              </motion.div>
            ) : (
              expenses.length > 0 && (
                <motion.p
                  key="quits"
                  className="debt-clear"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  vocês estão quites
                </motion.p>
              )
            )}
          </AnimatePresence>
        </motion.section>

        {!ready && <Skeleton />}

        {ready && expenses.length === 0 && (
          <motion.div className="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <p className="empty-title">Nenhuma conta em {monthLabel(month)}</p>
            <p className="empty-hint">
              Digite aí embaixo: “luz 180”. Ligue “todo mês” para ela voltar sozinha.
            </p>
          </motion.div>
        )}

        <ul className="list">
          <AnimatePresence initial={false} mode="popLayout">
            {pending.map((expense, index) => (
              <ExpenseRow
                key={expense.id}
                expense={expense}
                me={me}
                open={openId === expense.id}
                enterDelay={index * 0.03}
                onOpenChange={(open) => setOpenId(open ? expense.id : null)}
                onTogglePaid={handleTogglePaid}
                onCycleSplit={cycleSplit}
                onRemove={handleRemove}
              />
            ))}

            {paid.length > 0 && (
              <motion.li
                key="divider"
                layout="position"
                className="divider"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                Pagas · {paid.length}
              </motion.li>
            )}

            {paid.map((expense) => (
              <ExpenseRow
                key={expense.id}
                expense={expense}
                me={me}
                open={openId === expense.id}
                enterDelay={0}
                onOpenChange={(open) => setOpenId(open ? expense.id : null)}
                onTogglePaid={handleTogglePaid}
                onCycleSplit={cycleSplit}
                onRemove={handleRemove}
              />
            ))}
          </AnimatePresence>
        </ul>
      </div>

      <div className="dock">
        <AnimatePresence>
          {asking && (
            <motion.div
              key="asking"
              className="choice"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ type: 'spring', stiffness: 440, damping: 34 }}
            >
              <p className="choice-title">Apagar {asking.title}?</p>
              <p className="choice-hint">Essa conta se repete todo mês.</p>
              <div className="choice-actions">
                <button
                  className="choice-option"
                  onClick={() => {
                    removeThisMonth(asking)
                    setAsking(null)
                  }}
                >
                  <strong>só de {monthLabel(asking.month)}</strong>
                  <small>nos próximos meses ela continua</small>
                </button>
                <button className="choice-option is-danger" onClick={() => handleStop(asking)}>
                  <strong>de {monthLabel(asking.month)} em diante</strong>
                  <small>para de se repetir; as já pagas ficam</small>
                </button>
              </div>
              <button className="choice-cancel" onClick={() => setAsking(null)}>
                cancelar
              </button>
            </motion.div>
          )}
          {notice && (
            <motion.div
              key="notice"
              className="toast"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ type: 'spring', stiffness: 520, damping: 38 }}
            >
              <span>{notice}</span>
            </motion.div>
          )}
          {deleted && (
            <motion.div
              className="toast"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ type: 'spring', stiffness: 520, damping: 38 }}
            >
              <span>{deleted.title} apagada</span>
              <button
                onClick={() => {
                  if (undoTimer.current) clearTimeout(undoTimer.current)
                  haptic('light')
                  restore(deleted)
                  setDeleted(null)
                }}
              >
                Desfazer
              </button>
            </motion.div>
          )}
        </AnimatePresence>
        <ExpenseComposer onAdd={add} onFocus={() => scrollToEnd()} />
      </div>

      <AnimatePresence>{rain > 0 && <MoneyRain key={rain} onDone={() => setRain(0)} />}</AnimatePresence>
      <CompleteOverlay show={closing} label="Mês fechado" />
    </div>
  )
}
