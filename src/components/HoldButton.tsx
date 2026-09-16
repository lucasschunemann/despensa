import { motion, useReducedMotion } from 'motion/react'
import { useRef, useState } from 'react'

const HOLD_MS = 650

// Finalizar arquiva a lista, então pede um gesto deliberado: segurar. A barra preenchendo
// é o próprio aviso do que vai acontecer, sem precisar de caixa de confirmação.
export function HoldButton({ label, onComplete }: { label: string; onComplete: () => void }) {
  const [holding, setHolding] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reduced = useReducedMotion()

  const start = () => {
    setHolding(true)
    timer.current = setTimeout(() => {
      setHolding(false)
      onComplete()
    }, HOLD_MS)
  }

  const cancel = () => {
    if (timer.current) clearTimeout(timer.current)
    setHolding(false)
  }

  return (
    <button
      className={`button-hold hold${holding ? ' is-holding' : ''}`}
      onPointerDown={start}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onPointerCancel={cancel}
      onContextMenu={(e) => e.preventDefault()}
      // teclado e leitores de tela não seguram o botão: aí vale o acionamento direto
      onClick={(e) => e.detail === 0 && onComplete()}
    >
      <motion.span
        className="hold-fill"
        initial={false}
        animate={{ scaleX: holding ? 1 : 0 }}
        transition={{ duration: reduced ? 0 : holding ? HOLD_MS / 1000 : 0.2, ease: 'linear' }}
      />
      <span className="hold-label">{label}</span>
    </button>
  )
}
