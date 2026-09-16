import { AnimatePresence, motion, useReducedMotion } from 'motion/react'

export function CompleteOverlay({
  show,
  label = 'Tudo pegado',
  variant = 'check',
}: {
  show: boolean
  label?: string
  variant?: 'check' | 'stamp'
}) {
  const reduced = useReducedMotion()

  if (variant === 'stamp') {
    return (
      <AnimatePresence>
        {show && (
          <motion.div
            className="complete"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduced ? 0 : 0.2 }}
            aria-live="polite"
          >
            <motion.span
              className="big-stamp"
              initial={{ scale: reduced ? 1 : 2.6, opacity: 0, rotate: 0 }}
              animate={{ scale: 1, opacity: 1, rotate: -9 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 520, damping: 20, delay: 0.1 }}
            >
              {label}
            </motion.span>
          </motion.div>
        )}
      </AnimatePresence>
    )
  }

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="complete"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduced ? 0 : 0.24 }}
          aria-live="polite"
        >
          <motion.div
            className="complete-card"
            initial={{ scale: reduced ? 1 : 0.9, y: reduced ? 0 : 8 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: reduced ? 1 : 0.96, opacity: 0 }}
            transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 30 }}
          >
            <svg className="complete-check" viewBox="0 0 64 64" aria-hidden>
              <motion.circle
                cx="32"
                cy="32"
                r="28"
                className="complete-ring"
                initial={{ pathLength: reduced ? 1 : 0, rotate: -90 }}
                animate={{ pathLength: 1, rotate: -90 }}
                transition={{ duration: reduced ? 0 : 0.5, ease: [0.3, 0.9, 0.3, 1] }}
              />
              <motion.path
                d="M20 33.5 L28.5 42 L45 24"
                className="complete-mark"
                initial={{ pathLength: reduced ? 1 : 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: reduced ? 0 : 0.34, delay: reduced ? 0 : 0.22, ease: [0.3, 0.9, 0.3, 1] }}
              />
            </svg>
            <p>{label}</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
