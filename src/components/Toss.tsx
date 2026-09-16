import { motion, useReducedMotion } from 'motion/react'
import { useEffect } from 'react'
import { Tomato } from './Avatar'

const FLIGHT = [
  { left: '8%', drift: 70, spin: 320, size: 30, duration: 1.15, delay: 0 },
  { left: '32%', drift: -50, spin: -260, size: 40, duration: 1.3, delay: 0.08 },
  { left: '56%', drift: 40, spin: 300, size: 26, duration: 1.05, delay: 0.16 },
  { left: '74%', drift: -70, spin: -340, size: 36, duration: 1.25, delay: 0.05 },
  { left: '90%', drift: 30, spin: 240, size: 22, duration: 1.1, delay: 0.2 },
]

/** Chuva de alguma coisa boba subindo pela tela (tomate, cerveja, o que a palavra pedir). */
export function Toss({ emoji, onDone }: { emoji: string; onDone: () => void }) {
  const reduced = useReducedMotion()

  useEffect(() => {
    const timer = setTimeout(onDone, 1700)
    return () => clearTimeout(timer)
  }, [onDone])

  if (reduced) return null

  return (
    <div className="tomatoes" aria-hidden>
      {FLIGHT.map((f, i) => (
        <motion.span
          key={i}
          className="tomato"
          style={{ left: f.left, fontSize: f.size }}
          initial={{ y: '18vh', x: 0, rotate: 0, opacity: 0 }}
          animate={{ y: '-105vh', x: f.drift, rotate: f.spin, opacity: [0, 1, 1, 0.9] }}
          transition={{ duration: f.duration, delay: f.delay, ease: [0.16, 0.7, 0.5, 1] }}
        >
          {emoji === '🍅' ? <Tomato size={f.size} /> : emoji}
        </motion.span>
      ))}
    </div>
  )
}
