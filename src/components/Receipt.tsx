import { AnimatePresence, motion } from 'motion/react'
import type { MonthSummary } from '../lib/balance'
import { formatAmount, formatBRL } from '../lib/money'
import { Avatar } from './Avatar'
import { Money } from './Money'
import { Rolling } from './Rolling'

interface Props {
  /** pasta que está sendo vista ("todas as contas", "casa"…) */
  title: string
  color?: string
  summary: MonthSummary
  count: number
  paidCount: number
  me: string
  onSettle: () => void
}

/** Resumo do mês como cupom de caixa: linhas pontilhadas e borda serrilhada. */
export function Receipt({ title, color, summary, count, paidCount, me, onSettle }: Props) {
  const progress = summary.totalCents > 0 ? summary.paidCents / summary.totalCents : 0
  const debt = summary.debt

  return (
    <motion.section
      className="receipt-block"
      layout
      initial={{ opacity: 0, y: -14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 360, damping: 32 }}
    >
      <div className="receipt">
        <p className="receipt-head">
          <span className="receipt-folder">
            {color && <span className={`folder-glyph folder-${color}`} aria-hidden><i /></span>}
            {title}
          </span>
          <span>
            <Rolling value={paidCount} />/{count} pagas
          </span>
        </p>

        {/* o que importa primeiro: quanto falta. total e pago são detalhe, embaixo */}
        <p className="receipt-label">{summary.pendingCents > 0 ? 'falta pagar' : summary.totalCents > 0 ? 'mês pago' : 'nada lançado'}</p>
        <Money
          className="receipt-total"
          cents={summary.pendingCents > 0 ? summary.pendingCents : summary.paidCents}
        />

        <div className="receipt-bar" aria-hidden>
          <motion.span
            initial={false}
            animate={{ scaleX: progress }}
            transition={{ type: 'spring', stiffness: 200, damping: 30 }}
          />
        </div>

        <div className="receipt-lines">
          <p className="receipt-line">
            <span>total</span>
            <i aria-hidden />
            <span>{formatAmount(summary.totalCents)}</span>
          </p>
          <p className="receipt-line">
            <span>pago</span>
            <i aria-hidden />
            <span>{formatAmount(summary.paidCents)}</span>
          </p>
        </div>
      </div>
      <div className="receipt-edge" aria-hidden />

      <AnimatePresence mode="popLayout">
        {debt ? (
          <motion.div
            key={`debt-${debt.from}-${debt.cents}`}
            className="coupon"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0, rotate: 0 }}
            // "acertamos": o cupom é destacado e sai voando
            exit={{ opacity: 0, x: 90, y: -30, rotate: 14, transition: { duration: 0.45, ease: [0.4, 0, 0.8, 0.4] } }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
          >
            <Avatar person={debt.from} size={26} />
            <span className="coupon-text">
              {debt.from === me ? (
                <>
                  você deve <strong>{formatBRL(debt.cents)}</strong> para {debt.to}
                </>
              ) : (
                <>
                  {debt.from} te deve <strong>{formatBRL(debt.cents)}</strong>
                </>
              )}
            </span>
            <button className="coupon-cut" onClick={onSettle}>
              <svg viewBox="0 0 24 24" aria-hidden>
                <circle cx="6" cy="7" r="2.6" />
                <circle cx="6" cy="17" r="2.6" />
                <path d="M8.2 8.4 20 17M8.2 15.6 20 7" />
              </svg>
              acertamos
            </button>
          </motion.div>
        ) : (
          count > 0 && (
            <motion.p
              key="quites"
              className="coupon-clear"
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
  )
}
