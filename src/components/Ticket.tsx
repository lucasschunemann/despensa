import { animate, motion, useMotionValue, useReducedMotion, useTransform } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { haptic } from '../lib/haptics'
import { formatAmount } from '../lib/money'
import { sound } from '../lib/sound'
import type { Expense } from '../lib/types'
import { Avatar } from './Avatar'
import { Barcode } from './Barcode'

const ACTION_WIDTH = 96
const OPEN_THRESHOLD = 46
const PAY_WIDTH = 110
const PAY_THRESHOLD = 66

type Phase = 'idle' | 'scan' | 'stamp' | 'tear'

interface TicketProps {
  expense: Expense
  me: string
  open: boolean
  /** true quando a conta acabou de ser lançada: o ticket "sai da impressora" */
  printing: boolean
  enterDelay: number
  onOpenChange: (open: boolean) => void
  /** chamado no carimbo, antes do canhoto rasgar (é quando chove dinheiro) */
  onStamp: () => void
  /** chamado no fim da animação, quando a conta vira paga de fato */
  onPaid: (expense: Expense) => void
  onCycleSplit: (expense: Expense) => void
  onRemove: (expense: Expense) => void
}

export function Ticket({
  expense,
  me,
  open,
  printing,
  enterDelay,
  onOpenChange,
  onStamp,
  onPaid,
  onCycleSplit,
  onRemove,
}: TicketProps) {
  const reduced = useReducedMotion()
  const [phase, setPhase] = useState<Phase>('idle')
  const timers = useRef<Array<ReturnType<typeof setTimeout>>>([])
  const x = useMotionValue(0)
  const crossed = useRef(false)
  // arrastar começando em cima de um botão não pode virar toque nele ao soltar
  const dragged = useRef(false)
  const wasDrag = () => dragged.current || Math.abs(x.get()) > 2

  const spring = reduced
    ? { duration: 0.12 }
    : { type: 'spring' as const, stiffness: 420, damping: 34, mass: 0.8 }
  const payOpacity = useTransform(x, [0, PAY_THRESHOLD * 0.5, PAY_THRESHOLD], [0, 0.5, 1])

  useEffect(() => {
    animate(x, open ? -ACTION_WIDTH : 0, spring)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, x])

  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  // leitura → carimbo → canhoto rasgando → conta paga
  const pay = () => {
    if (phase !== 'idle') return
    onOpenChange(false)
    if (reduced) {
      onStamp()
      onPaid(expense)
      return
    }
    setPhase('scan')
    sound.scan()
    haptic('light')
    timers.current.push(
      setTimeout(() => {
        setPhase('stamp')
        sound.stamp()
        haptic('medium')
        onStamp()
      }, 460),
      setTimeout(() => {
        setPhase('tear')
        sound.tear()
      }, 900),
      setTimeout(() => onPaid(expense), 1350),
    )
  }

  const stubVariants = {
    idle: { x: 0, y: 0, rotate: 0, opacity: 1 },
    tear: { x: 26, y: 70, rotate: 22, opacity: 0 },
  }

  return (
    <motion.li
      layout={reduced ? false : 'position'}
      className="ticket-wrap"
      initial={
        printing
          ? { clipPath: 'inset(0 0 100% 0)', y: -10, opacity: 1 }
          : { opacity: 0, y: 10 }
      }
      animate={{ clipPath: 'inset(0 0 0% 0)', y: 0, opacity: 1 }}
      exit={{ opacity: 0, height: 0, marginBottom: 0, transition: { duration: 0.24 } }}
      transition={
        printing
          ? { duration: reduced ? 0 : 0.55, ease: [0.3, 0.7, 0.3, 1] }
          : { ...spring, delay: enterDelay }
      }
    >
      {/* as camadas de trás só existem parado: quando o canhoto rasga, atrás dele é papel em branco */}
      {phase === 'idle' && (
        <>
          <motion.span className="ticket-behind is-pay" style={{ opacity: payOpacity }} aria-hidden>
            pagar
          </motion.span>
          <button
            className="ticket-behind is-delete"
            tabIndex={open ? 0 : -1}
            aria-hidden={!open}
            onClick={() => onRemove(expense)}
          >
            Apagar
          </button>
        </>
      )}

      <motion.div
        className={`ticket phase-${phase}`}
        style={{ x }}
        drag={phase === 'idle' ? 'x' : false}
        dragDirectionLock
        dragConstraints={{ left: -ACTION_WIDTH, right: PAY_WIDTH }}
        dragElastic={{ left: 0.04, right: 0.12 }}
        dragMomentum={false}
        animate={phase === 'stamp' ? { y: [0, 3, -1, 0] } : { y: 0 }}
        transition={{ duration: 0.22 }}
        onPointerDown={() => {
          dragged.current = false
        }}
        onDragStart={() => {
          dragged.current = true
        }}
        onDrag={(_, info) => {
          const past = info.offset.x > PAY_THRESHOLD
          if (past !== crossed.current) {
            crossed.current = past
            if (past) haptic('light')
          }
        }}
        onDragEnd={(_, info) => {
          crossed.current = false
          if (info.offset.x > PAY_THRESHOLD) {
            animate(x, 0, spring)
            pay()
            return
          }
          const shouldOpen = info.offset.x < -OPEN_THRESHOLD || info.velocity.x < -450
          animate(x, shouldOpen ? -ACTION_WIDTH : 0, spring)
          onOpenChange(shouldOpen)
        }}
      >
        <div className="ticket-main">
          <div className="ticket-head">
            <span className="ticket-title">{expense.title}</span>
            {expense.recurrence_id && <span className="ticket-tag">todo mês</span>}
          </div>

          <div className="ticket-grid">
            <div>
              <small>valor</small>
              <strong className="ticket-amount">{formatAmount(expense.amount_cents)}</strong>
            </div>
            <div>
              <small>divisão</small>
              <button
                className="ticket-split"
                onClick={() => {
                  if (wasDrag()) return
                  onCycleSplit(expense)
                }}
                aria-label={`Divisão: ${expense.split === 'meio' ? 'meio a meio' : `só ${expense.split}`}`}
              >
                {expense.split === 'meio' ? (
                  '½'
                ) : (
                  <>
                    <Avatar person={expense.split} size={16} />
                    {expense.split === me ? 'sua' : expense.split}
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="ticket-code">
            <Barcode seed={expense.id} width={132} height={22} />
            {phase === 'scan' && (
              <motion.span
                className="ticket-laser"
                initial={{ x: -8, opacity: 0 }}
                animate={{ x: 140, opacity: [0, 1, 1, 0] }}
                transition={{ duration: 0.42, ease: 'easeInOut' }}
                aria-hidden
              />
            )}
          </div>
        </div>

        <motion.button
          className="ticket-stub"
          variants={stubVariants}
          initial={false}
          animate={phase === 'tear' ? 'tear' : 'idle'}
          transition={{ duration: 0.45, ease: [0.4, 0, 0.7, 0.3] }}
          onClick={() => {
            if (wasDrag()) {
              // tocar com a gaveta aberta só fecha
              if (!dragged.current) onOpenChange(false)
              return
            }
            pay()
          }}
          aria-label={`Pagar ${expense.title}`}
        >
          <small>vence</small>
          <strong>{expense.due_day ?? '—'}</strong>
          <span className="ticket-pay">pagar</span>
        </motion.button>

        <span className="ticket-notch is-top" aria-hidden />
        <span className="ticket-notch is-bottom" aria-hidden />

        {(phase === 'stamp' || phase === 'tear') && (
          <motion.span
            className="stamp"
            initial={{ scale: 2.2, opacity: 0, rotate: -4 }}
            animate={{ scale: 1, opacity: 1, rotate: -11 }}
            transition={{ type: 'spring', stiffness: 700, damping: 22 }}
            aria-hidden
          >
            pago
          </motion.span>
        )}
      </motion.div>
    </motion.li>
  )
}

interface PaidProps {
  expense: Expense
  me: string
  enterDelay: number
  onUnpay: (expense: Expense) => void
}

/** O que sobra da conta depois de paga: o bilhete sem canhoto, com o carimbo. */
export function PaidTicket({ expense, me, enterDelay, onUnpay }: PaidProps) {
  const reduced = useReducedMotion()

  return (
    <motion.li
      layout={reduced ? false : 'position'}
      className="paid"
      initial={{ opacity: 0, scale: 0.96, y: -8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.2 } }}
      transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 32, delay: enterDelay }}
    >
      <div className="paid-text">
        <span className="paid-title">{expense.title}</span>
        <span className="paid-meta">
          {expense.paid_by && (
            <>
              <Avatar person={expense.paid_by} size={14} />
              {expense.paid_by === me ? 'você' : expense.paid_by}
            </>
          )}
          {expense.recurrence_id && <span>· todo mês</span>}
          {expense.settled && <span>· acertado</span>}
        </span>
      </div>
      <span className="paid-amount">{formatAmount(expense.amount_cents)}</span>
      <button className="paid-stamp" onClick={() => onUnpay(expense)} aria-label={`Desmarcar ${expense.title}`}>
        pago
      </button>
    </motion.li>
  )
}
