import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useRef, useState } from 'react'
import { haptic } from '../lib/haptics'
import { formatBRL, parseExpenseEntry } from '../lib/money'
import { sound } from '../lib/sound'
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
  const typing = text.trim().length > 0

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
      <div className="composer-field">
        {/* "todo mês" mora dentro do campo, sem gastar uma linha da tela. Enquanto você
            digita, encolhe para só o ícone e devolve o espaço para o texto. */}
        <motion.button
          type="button"
          role="switch"
          aria-checked={recurring}
          aria-label="todo mês"
          layout={!reduced}
          className={`repeat${recurring ? ' is-on' : ''}`}
          onPointerDown={(e) => e.preventDefault()}
          onClick={() => {
            setRecurring((v) => !v)
            sound.tick()
            haptic('light')
          }}
          whileTap={reduced ? undefined : { scale: 0.9 }}
          transition={spring}
        >
          <motion.svg
            viewBox="0 0 24 24"
            aria-hidden
            animate={{ rotate: recurring ? 180 : 0 }}
            transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 300, damping: 18 }}
          >
            <path d="M17 3.5 20 6.5l-3 3" />
            <path d="M4 11.5v-1a4 4 0 0 1 4-4h12" />
            <path d="M7 20.5l-3-3 3-3" />
            <path d="M20 12.5v1a4 4 0 0 1-4 4H4" />
          </motion.svg>
          <AnimatePresence initial={false}>
            {!typing && (
              <motion.span
                key="label"
                className="repeat-label"
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={spring}
              >
                todo mês
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>

        <input
          ref={input}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onFocus={onFocus}
          placeholder="luz 180 dia 10"
          aria-label="Nova conta"
          autoComplete="off"
          autoCapitalize="sentences"
          enterKeyHint="enter"
        />
        <AnimatePresence initial={false}>
          {preview && preview.amountCents > 0 && (
            <motion.span
              key="preview"
              className="composer-qty composer-preview"
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.7 }}
              transition={spring}
            >
              {formatBRL(preview.amountCents)}
              {preview.dueDay ? ` · ${preview.dueDay}` : ''}
            </motion.span>
          )}
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
