import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { haptic } from '../lib/haptics'
import { jazz } from '../lib/jazz'
import { sound } from '../lib/sound'
import { Mascot } from './Avatar'

/**
 * O camarão do início toca quando alguém toca nele: um lick curto no sax (o mesmo trio da
 * apresentação) e notas pretas saindo da campana. Ele não pede toque nem se anuncia —
 * quem descobre, descobre.
 */
export function Shrimp({ size }: { size: number }) {
  const [notes, setNotes] = useState<number[]>([])
  const [blow, setBlow] = useState(0)

  const play = () => {
    sound.unlock()
    jazz.riff()
    haptic('light')
    setBlow((value) => value + 1)
    const id = Date.now()
    setNotes((current) => [...current.slice(-5), id, id + 1, id + 2])
    window.setTimeout(() => setNotes((current) => current.filter((n) => n < id || n > id + 2)), 1900)
  }

  return (
    <>
      <motion.button
        key={blow}
        type="button"
        className="shrimp-button"
        aria-label="Tocar o saxofone do camarão"
        onClick={play}
        animate={blow ? { scale: [1, 1.08, 0.97, 1], rotate: [0, -6, 3, 0] } : undefined}
        transition={{ duration: 0.55, ease: 'easeOut' }}
        whileTap={{ scale: 0.94 }}
      >
        <Mascot size={size} />
      </motion.button>
      <AnimatePresence>
        {notes.map((id, index) => {
          const lane = id % 3
          return (
            <motion.span
              key={id}
              className="shrimp-note"
              initial={{ opacity: 0, x: 0, y: 0, rotate: -10, scale: 0.6 }}
              animate={{ opacity: [0, 1, 1, 0], x: [0, 10 + lane * 14, 22 + lane * 20], y: [0, -26 - lane * 6, -70 - lane * 18], rotate: [-10, 8, -6], scale: [0.6, 1, 0.9] }}
              transition={{ duration: 1.6, delay: (index % 3) * 0.14, ease: 'easeOut' }}
              exit={{ opacity: 0 }}
              aria-hidden
            >
              {lane === 1 ? <EighthPair /> : <Eighth />}
            </motion.span>
          )
        })}
      </AnimatePresence>
    </>
  )
}

function Eighth() {
  return <svg viewBox="0 0 16 20"><ellipse cx="5" cy="16" rx="4.2" ry="3.2" transform="rotate(-20 5 16)" /><rect x="8.2" y="1" width="1.6" height="15" /><path d="M9.8 1c1.5 2.6 5.2 3.4 4.4 8.2-.3-2.4-2.2-3.7-4.4-4.1Z" /></svg>
}

function EighthPair() {
  return <svg viewBox="0 0 22 20"><ellipse cx="4.5" cy="16" rx="3.8" ry="2.9" transform="rotate(-20 4.5 16)" /><ellipse cx="16.5" cy="14" rx="3.8" ry="2.9" transform="rotate(-20 16.5 14)" /><rect x="7.4" y="3" width="1.5" height="13" /><rect x="19.4" y="1" width="1.5" height="13" /><path d="M7.4 3 20.9 1v3L7.4 6Z" /></svg>
}
