import { motion } from 'motion/react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { haptic } from '../lib/haptics'

export interface EditAction {
  label: string
  hint?: string
  onSave: (text: string) => void
}

interface Props {
  title: string
  initial: string
  /** o que o app entendeu do texto; null quando ainda não dá para salvar */
  preview: (text: string) => ReactNode | null
  actions: EditAction[]
  onClose: () => void
}

/**
 * Editar usa a mesma gramática de lançar: um campo só ("2 leite", "luz 213,50 dia 22").
 * Assim não tem formulário novo para aprender.
 */
export function EditCard({ title, initial, preview, actions, onClose }: Props) {
  const [text, setText] = useState(initial)
  const input = useRef<HTMLInputElement>(null)
  const understood = preview(text)

  useEffect(() => {
    // cursor no fim, pronto para corrigir
    const el = input.current
    if (el) el.setSelectionRange(el.value.length, el.value.length)
  }, [])

  const save = (action: EditAction) => {
    if (!understood) return
    haptic('light')
    action.onSave(text)
  }

  return (
    <motion.form
      className="choice edit-card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ type: 'spring', stiffness: 440, damping: 34 }}
      onSubmit={(e) => {
        e.preventDefault()
        if (actions.length === 1) save(actions[0])
      }}
    >
      <p className="choice-title">{title}</p>
      <div className="composer-field">
        <input
          ref={input}
          value={text}
          onChange={(e) => setText(e.target.value)}
          autoFocus
          autoComplete="off"
          enterKeyHint="done"
          aria-label={title}
        />
      </div>
      <p className="edit-preview">{understood ?? 'escreva o nome'}</p>
      <div className="choice-actions">
        {actions.map((action) => (
          <button
            key={action.label}
            type="button"
            className={`choice-option${actions.length === 1 ? ' is-primary' : ''}`}
            disabled={!understood}
            onPointerDown={(e) => e.preventDefault()}
            onClick={() => save(action)}
          >
            <strong>{action.label}</strong>
            {action.hint && <small>{action.hint}</small>}
          </button>
        ))}
      </div>
      <button type="button" className="choice-cancel" onClick={onClose}>
        cancelar
      </button>
    </motion.form>
  )
}
