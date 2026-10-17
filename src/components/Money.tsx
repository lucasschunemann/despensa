import { animate, useMotionValue, useReducedMotion } from 'motion/react'
import { useEffect, useState } from 'react'
import { formatBRL } from '../lib/money'

/** Valor em reais que conta sozinho até o número novo. */
export function Money({ cents, className }: { cents: number; className?: string }) {
  const reduced = useReducedMotion()
  const value = useMotionValue(cents)
  const [text, setText] = useState(() => formatBRL(cents))

  useEffect(() => {
    if (reduced) {
      value.set(cents)
      setText(formatBRL(cents))
      return
    }
    const unsubscribe = value.on('change', (v) => setText(formatBRL(Math.round(v))))
    const controls = animate(value, cents, { duration: 0.6, ease: [0.2, 0.8, 0.2, 1] })
    return () => {
      controls.stop()
      unsubscribe()
    }
  }, [cents, reduced, value])

  return <span className={className}>{text}</span>
}
