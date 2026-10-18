import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import type { Reaction } from '../hooks/usePresence'
import { haptic } from '../lib/haptics'
import { Avatar } from './Avatar'

const PUFFS = [
  { x: -46, delay: 0, size: 30 },
  { x: -14, delay: 0.08, size: 44 },
  { x: 22, delay: 0.04, size: 34 },
  { x: 52, delay: 0.14, size: 26 },
]

/** O emoji que a outra pessoa mandou sobe na sua tela, com o avatar de quem mandou. */
export function ReactionBurst({ reaction, me }: { reaction: Reaction | null; me: string }) {
  const [current, setCurrent] = useState<Reaction | null>(null)
  const lastId = useRef<number | null>(null)
  const reduced = useReducedMotion()

  useEffect(() => {
    if (!reaction || reaction.id === lastId.current) return
    lastId.current = reaction.id
    setCurrent(reaction)
    if (reaction.person !== me) haptic('medium')
    const timer = setTimeout(() => setCurrent(null), 2000)
    return () => clearTimeout(timer)
  }, [reaction, me])

  return (
    <AnimatePresence>
      {current && (
        <motion.div
          className="reaction"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          aria-live="polite"
        >
          {!reduced &&
            PUFFS.map((puff, i) => (
              <motion.span
                key={i}
                className="reaction-emoji"
                style={{ fontSize: puff.size }}
                initial={{ y: 0, x: puff.x, opacity: 0, scale: 0.5 }}
                animate={{ y: -190, x: puff.x * 1.5, opacity: [0, 1, 1, 0], scale: 1, rotate: puff.x / 4 }}
                transition={{ duration: 1.5, delay: puff.delay, ease: [0.2, 0.7, 0.4, 1] }}
              >
                {current.emoji}
              </motion.span>
            ))}

          <motion.div
            className="reaction-label"
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ type: 'spring', stiffness: 440, damping: 30 }}
          >
            <Avatar person={current.person} size={22} />
            <span>
              {current.person === me ? 'você mandou' : `${current.person} mandou`} {current.emoji}
              {current.about ? ` em ${current.about}` : ''}
            </span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
