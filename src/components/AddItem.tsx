import { useRef, useState } from 'react'
import { parseEntry } from '../lib/parse'

export function AddItem({ onAdd }: { onAdd: (name: string, quantity: string | null) => void }) {
  const [text, setText] = useState('')
  const input = useRef<HTMLInputElement>(null)

  return (
    <form
      className="add"
      onSubmit={(e) => {
        e.preventDefault()
        const entry = parseEntry(text)
        if (!entry) return
        onAdd(entry.name, entry.quantity)
        setText('')
        input.current?.focus()
      }}
    >
      <input
        ref={input}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Adicionar item (ex: 2 leite)"
        autoFocus
        autoComplete="off"
        autoCapitalize="sentences"
        enterKeyHint="enter"
        aria-label="Novo item"
      />
      {/* preventDefault no pointerdown mantém o teclado aberto no celular ao tocar no botão */}
      <button type="submit" onPointerDown={(e) => e.preventDefault()} disabled={!text.trim()}>
        Adicionar
      </button>
    </form>
  )
}
