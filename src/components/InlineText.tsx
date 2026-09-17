import { useState } from 'react'

/** Texto que vira campo ao tocar (nome do desejo). Enter ou sair do campo salva. */
export function InlineText({
  value,
  label,
  className,
  onChange,
  guard,
}: {
  value: string
  label: string
  className?: string
  onChange: (value: string) => void
  /** retorna false para ignorar o toque (ex.: acabou de arrastar o cartão) */
  guard?: () => boolean
}) {
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(value)

  const commit = () => {
    const next = text.trim().replace(/\s+/g, ' ')
    if (next && next !== value) onChange(next.charAt(0).toUpperCase() + next.slice(1))
    setEditing(false)
  }

  if (editing) {
    return (
      <input
        className="inline-text-input"
        value={text}
        aria-label={label}
        autoFocus
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit()
          if (e.key === 'Escape') setEditing(false)
        }}
      />
    )
  }

  return (
    <button
      className={className}
      aria-label={label}
      onClick={() => {
        if (guard && !guard()) return
        setText(value)
        setEditing(true)
      }}
    >
      {value}
    </button>
  )
}
