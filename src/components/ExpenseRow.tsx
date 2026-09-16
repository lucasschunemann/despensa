import { animate, motion, useMotionValue, useReducedMotion, useTransform } from 'motion/react'
import { useEffect, useRef } from 'react'
import { haptic } from '../lib/haptics'
import { formatAmount } from '../lib/money'
import type { Expense } from '../lib/types'
import { Avatar } from './Avatar'

const ACTION_WIDTH = 92
const OPEN_THRESHOLD = 44
const PAY_WIDTH = 104
const PAY_THRESHOLD = 62

interface Props {
  expense: Expense
  me: string
  open: boolean
  enterDelay: number
  onOpenChange: (open: boolean) => void
  onTogglePaid: (expense: Expense) => void
  onCycleSplit: (expense: Expense) => void
  onRemove: (expense: Expense) => void
}

export function ExpenseRow({
  expense,
  me,
  open,
  enterDelay,
  onOpenChange,
  onTogglePaid,
  onCycleSplit,
  onRemove,
}: Props) {
  const paid = expense.status === 'pago'
  const reduced = useReducedMotion()
  const x = useMotionValue(0)
  const crossed = useRef(false)

  const spring = reduced
    ? { duration: 0.12 }
    : { type: 'spring' as const, stiffness: 420, damping: 34, mass: 0.8 }

  const payOpacity = useTransform(x, [0, PAY_THRESHOLD * 0.5, PAY_THRESHOLD], [0, 0.5, 1])
  const payScale = useTransform(x, [0, PAY_THRESHOLD], [0.6, 1])

  useEffect(() => {
    animate(x, open ? -ACTION_WIDTH : 0, spring)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, x])

  return (
    <motion.li
      layout={reduced ? false : 'position'}
      className={`row exp${paid ? ' is-paid' : ''}`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0, transition: { duration: 0.22 } }}
      transition={{ ...spring, delay: enterDelay }}
    >
      <motion.span className="row-pick" style={{ opacity: payOpacity, scale: payScale }} aria-hidden>
        <svg viewBox="0 0 24 24">
          <path d="M5 12.5 10 17.5 19 7.5" />
        </svg>
      </motion.span>

      <button className="row-delete" tabIndex={open ? 0 : -1} aria-hidden={!open} onClick={() => onRemove(expense)}>
        Apagar
      </button>

      <motion.div
        className="row-face"
        style={{ x }}
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: -ACTION_WIDTH, right: PAY_WIDTH }}
        dragElastic={{ left: 0.04, right: 0.12 }}
        dragMomentum={false}
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
            onOpenChange(false)
            onTogglePaid(expense)
            return
          }
          const shouldOpen = info.offset.x < -OPEN_THRESHOLD || info.velocity.x < -450
          animate(x, shouldOpen ? -ACTION_WIDTH : 0, spring)
          onOpenChange(shouldOpen)
        }}
      >
        <div className="exp-main">
          <button
            className="exp-check"
            aria-pressed={paid}
            aria-label={paid ? `Desmarcar ${expense.title}` : `Marcar ${expense.title} como paga`}
            onClick={() => {
              if (Math.abs(x.get()) > 2) {
                onOpenChange(false)
                return
              }
              onTogglePaid(expense)
            }}
          >
            <span className="row-check" aria-hidden>
              <svg viewBox="0 0 24 24">
                <circle className="check-ring" cx="12" cy="12" r="10.6" />
                <motion.circle
                  className="check-fill"
                  cx="12"
                  cy="12"
                  r="10.6"
                  initial={false}
                  animate={{ scale: paid ? 1 : 0.2, opacity: paid ? 1 : 0 }}
                  transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 620, damping: 26 }}
                />
                <motion.path
                  className="check-mark"
                  d="M7.2 12.4 L10.6 15.8 L16.9 9.2"
                  initial={false}
                  animate={{ pathLength: paid ? 1 : 0, opacity: paid ? 1 : 0 }}
                  transition={reduced ? { duration: 0 } : { duration: 0.28 }}
                />
              </svg>
            </span>

            <span className="exp-text">
              <span className="exp-title">{expense.title}</span>
              <span className="exp-meta">
                {expense.due_day && <span>dia {expense.due_day}</span>}
                {expense.recurrence_id && <span>todo mês</span>}
                {expense.split !== 'meio' && (
                  <span>só {expense.split === me ? 'sua' : expense.split}</span>
                )}
                {paid && expense.paid_by && (
                  <span className="exp-payer">
                    pago por <Avatar person={expense.paid_by} size={15} />
                    {expense.paid_by === me ? 'você' : expense.paid_by}
                  </span>
                )}
                {paid && expense.settled && <span>acertado</span>}
              </span>
            </span>
          </button>

          <button
            className="exp-split"
            onClick={() => onCycleSplit(expense)}
            title="Como divide"
            aria-label={`Divisão: ${expense.split === 'meio' ? 'meio a meio' : `só ${expense.split}`}`}
          >
            {expense.split === 'meio' ? <span className="half">½</span> : <Avatar person={expense.split} size={18} />}
          </button>

          <span className="exp-amount">{formatAmount(expense.amount_cents)}</span>
        </div>
      </motion.div>
    </motion.li>
  )
}
