import { useEffect, useRef, useState } from 'react'
import { formatBRL, toCents } from '../lib/money'

// Valor que vira campo ao tocar: usado no cofre e no preço do desejo.
export function InlineAmount({
  cents,
  label,
  onChange,
}: {
  cents: number
  label: string
  onChange: (cents: number) => void
}) {
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState('')
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) input.current?.select()
  }, [editing])

  const commit = () => {
    const value = text.trim() ? toCents(text.trim().replace(/^r\$\s*/i, '')) : 0
    if (Number.isFinite(value) && value >= 0) onChange(value)
    setEditing(false)
  }

  if (editing) {
    return (
      <input
        ref={input}
        className="inline-amount-input"
        value={text}
        inputMode="decimal"
        aria-label={label}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit()
          if (e.key === 'Escape') setEditing(false)
        }}
        autoFocus
      />
    )
  }

  return (
    <button
      className="inline-amount"
      aria-label={label}
      onClick={() => {
        setText(cents > 0 ? (cents / 100).toFixed(2).replace('.', ',') : '')
        setEditing(true)
      }}
    >
      {formatBRL(cents)}
    </button>
  )
}
