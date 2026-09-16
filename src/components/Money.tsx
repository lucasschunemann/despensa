import { animate, motion, useMotionValue, useReducedMotion } from 'motion/react'
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
    const controls = animate(value, cents, { duration: 0.65, ease: [0.2, 0.8, 0.2, 1] })
    return () => {
      controls.stop()
      unsubscribe()
    }
  }, [cents, reduced, value])

  return <span className={className}>{text}</span>
}

function Note({ size = 42 }: { size?: number }) {
  return (
    <svg width={size} height={size * 0.56} viewBox="0 0 50 28" aria-hidden>
      <rect x="0.5" y="0.5" width="49" height="27" rx="4" fill="#2F9E68" />
      <rect x="4" y="4" width="42" height="20" rx="2.5" fill="none" stroke="#fff" strokeOpacity=".5" />
      <circle cx="25" cy="14" r="6.5" fill="#fff" fillOpacity=".92" />
      <text x="25" y="17.5" textAnchor="middle" fontSize="7" fontWeight="700" fill="#2F9E68">
        R$
      </text>
    </svg>
  )
}

function Coin({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" aria-hidden>
      <circle cx="14" cy="14" r="13" fill="#E2B348" />
      <circle cx="14" cy="14" r="9.5" fill="none" stroke="#fff" strokeOpacity=".55" strokeWidth="1.4" />
      <text x="14" y="18" textAnchor="middle" fontSize="11" fontWeight="700" fill="#fff">
        $
      </text>
    </svg>
  )
}

const FLIGHT = [
  { left: '12%', drift: 52, spin: 26, delay: 0, note: true, size: 46, duration: 1.15 },
  { left: '30%', drift: -38, spin: -34, delay: 0.07, note: false, size: 24, duration: 1.05 },
  { left: '48%', drift: 30, spin: 18, delay: 0.02, note: true, size: 54, duration: 1.25 },
  { left: '66%', drift: -46, spin: 30, delay: 0.12, note: false, size: 28, duration: 1.1 },
  { left: '84%', drift: 24, spin: -22, delay: 0.05, note: true, size: 40, duration: 1.2 },
]

/** Chuva de dinheiro: sobe quando uma conta é marcada como paga. */
export function MoneyRain({ onDone }: { onDone: () => void }) {
  const reduced = useReducedMotion()

  useEffect(() => {
    const timer = setTimeout(onDone, 1600)
    return () => clearTimeout(timer)
  }, [onDone])

  if (reduced) return null

  return (
    <div className="money-rain" aria-hidden>
      {FLIGHT.map((f, i) => (
        <motion.span
          key={i}
          className="money-bit"
          style={{ left: f.left }}
          initial={{ y: '12vh', x: 0, rotate: 0, opacity: 0 }}
          animate={{ y: '-100vh', x: f.drift, rotate: f.spin * 6, opacity: [0, 1, 1, 0.85] }}
          transition={{ duration: f.duration, delay: f.delay, ease: [0.16, 0.7, 0.5, 1] }}
        >
          {f.note ? <Note size={f.size} /> : <Coin size={f.size} />}
        </motion.span>
      ))}
    </div>
  )
}
