import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useRef, useState } from 'react'
import { parseEntry } from '../lib/parse'
import { productEmoji } from '../lib/products'

interface Props {
  onAdd: (name: string, quantity: string | null) => void
  onFocus: () => void
  onTyping: () => void
}

export function Composer({ onAdd, onFocus, onTyping }: Props) {
  const [text, setText] = useState('')
  const input = useRef<HTMLInputElement>(null)
  const reduced = useReducedMotion()
  const preview = parseEntry(text)

  const submit = () => {
    const entry = parseEntry(text)
    if (!entry) return
    onAdd(entry.name, entry.quantity)
    setText('')
    input.current?.focus()
  }

  return (
    <form
      className="composer"
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
    >
      <div className="composer-field">
        <input
          ref={input}
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            if (e.target.value.trim()) onTyping()
          }}
          onFocus={onFocus}
          placeholder="o que está faltando?"
          aria-label="Novo item"
          autoComplete="off"
          autoCorrect="on"
          autoCapitalize="sentences"
          enterKeyHint="enter"
        />
        <AnimatePresence initial={false}>
          {/* o produto aparece na mão enquanto você digita */}
          {preview && productEmoji(preview.name) && (
            <motion.span
              key={`emoji-${productEmoji(preview.name)}`}
              className="composer-emoji"
              initial={{ opacity: 0, scale: 0.4, rotate: -20 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              exit={{ opacity: 0, scale: 0.4 }}
              transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 600, damping: 22 }}
              aria-hidden
            >
              {productEmoji(preview.name)}
            </motion.span>
          )}
          {/* mostra na hora o que ele entendeu como quantidade */}
          {preview?.quantity && (
            <motion.span
              key="qty"
              className="composer-qty"
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.7 }}
              transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 700, damping: 34 }}
            >
              {preview.quantity}
            </motion.span>
          )}
          {text.trim() && (
            <motion.button
              key="send"
              type="submit"
              className="composer-send"
              aria-label="Adicionar"
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.4, opacity: 0 }}
              transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 700, damping: 30 }}
              // manter o foco no campo: sem isso o teclado fecha a cada item no celular
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
