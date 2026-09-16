import { motion } from 'motion/react'
import { useState } from 'react'
import { haptic } from '../lib/haptics'
import { formatBRL, toCents } from '../lib/money'
import { sound } from '../lib/sound'

// Aparece logo depois de finalizar a compra: o valor do mercado vira conta do mês.
export function MarketBill({
  onConfirm,
  onClose,
}: {
  onConfirm: (amountCents: number) => void
  onClose: () => void
}) {
  const [text, setText] = useState('')
  const cents = text.trim() ? toCents(text.trim().replace(/^r\$\s*/i, '')) : 0
  const valid = Number.isFinite(cents) && cents > 0

  return (
    <motion.form
      className="market-bill"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ type: 'spring', stiffness: 420, damping: 34 }}
      onSubmit={(e) => {
        e.preventDefault()
        if (!valid) return
        sound.cash()
        haptic('success')
        onConfirm(cents)
      }}
    >
      <div className="market-bill-top">
        <p>Quanto deu no mercado?</p>
        <button type="button" className="market-skip" onClick={onClose}>
          agora não
        </button>
      </div>

      <div className="composer-field">
        <span className="market-currency">R$</span>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="0,00"
          inputMode="decimal"
          autoFocus
          aria-label="Valor da compra"
        />
        <motion.button
          type="submit"
          className="composer-send"
          disabled={!valid}
          aria-label="Lançar nas contas"
          animate={{ scale: valid ? 1 : 0.8, opacity: valid ? 1 : 0.35 }}
          transition={{ type: 'spring', stiffness: 600, damping: 30 }}
          onPointerDown={(e) => e.preventDefault()}
        >
          <svg viewBox="0 0 24 24" aria-hidden>
            <path d="M12 19V5M12 5l-6 6M12 5l6 6" />
          </svg>
        </motion.button>
      </div>

      <p className="market-hint">
        {valid ? `vai virar a conta “Mercado” de ${formatBRL(cents)}` : 'entra nas contas do mês, já paga'}
      </p>
    </motion.form>
  )
}
