import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, useRef } from 'react'

const VARIANTS = {
  enter: (dir: number) => ({ y: dir * 14, opacity: 0 }),
  center: { y: 0, opacity: 1 },
  exit: (dir: number) => ({ y: -dir * 14, opacity: 0 }),
}

/** Número que rola como contador: sobe quando aumenta, desce quando diminui. */
export function Rolling({ value }: { value: number }) {
  const reduced = useReducedMotion()
  const previous = useRef(value)
  const dir = value >= previous.current ? 1 : -1
  useEffect(() => {
    previous.current = value
  }, [value])

  if (reduced) return <span className="rolling">{value}</span>

  return (
    <span className="rolling">
      <AnimatePresence initial={false} mode="popLayout" custom={dir}>
        <motion.span
          key={value}
          custom={dir}
          variants={VARIANTS}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ type: 'spring', stiffness: 520, damping: 34 }}
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  )
}
