import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useRef, useState } from 'react'
import { formatBRL, parseExpenseEntry } from '../lib/money'
import type { NewExpense } from '../hooks/useExpenses'

interface Props {
  onAdd: (entry: NewExpense, options: { recurring: boolean }) => void
  onFocus: () => void
}

export function ExpenseComposer({ onAdd, onFocus }: Props) {
  const [text, setText] = useState('')
  const [recurring, setRecurring] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const reduced = useReducedMotion()
  const preview = parseExpenseEntry(text)

  const spring = reduced ? { duration: 0 } : { type: 'spring' as const, stiffness: 700, damping: 34 }

  return (
    <form
      className="composer"
      onSubmit={(e) => {
        e.preventDefault()
        if (!preview) return
        onAdd(preview, { recurring })
        setText('')
        input.current?.focus()
      }}
    >
      <div className="composer-row">
        <button
          type="button"
          role="switch"
          aria-checked={recurring}
          className={`repeat${recurring ? ' is-on' : ''}`}
          onPointerDown={(e) => e.preventDefault()}
          onClick={() => setRecurring((v) => !v)}
        >
          {/* trilho e bolinha têm caixa própria: a bolinha anda dentro do trilho,
              nunca por cima do texto */}
          <span className="switch" aria-hidden>
            <motion.span
              className="switch-knob"
              initial={false}
              animate={{ x: recurring ? 14 : 0 }}
              transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 700, damping: 36 }}
            />
          </span>
          <span className="repeat-label">todo mês</span>
        </button>

        <AnimatePresence initial={false}>
          {preview && preview.amountCents > 0 && (
            <motion.span
              key="preview"
              className="composer-preview"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={spring}
            >
              {formatBRL(preview.amountCents)}
              {preview.dueDay ? ` · dia ${preview.dueDay}` : ''}
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      <div className="composer-field">
        <input
          ref={input}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onFocus={onFocus}
          placeholder="Conta e valor: luz 180"
          aria-label="Nova conta"
          autoComplete="off"
          autoCapitalize="sentences"
          enterKeyHint="enter"
        />
        <AnimatePresence initial={false}>
          {preview && (
            <motion.button
              key="send"
              type="submit"
              className="composer-send"
              aria-label="Lançar conta"
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.4, opacity: 0 }}
              transition={spring}
              onPointerDown={(e) => e.preventDefault()}
            >
              <svg viewBox="0 0 24 24" aria-hidden>
                <path d="M12 19V5M12 5l-6 6M12 5l6 6" />
              </svg>
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </form>
  )
}
