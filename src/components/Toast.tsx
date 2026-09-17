import { motion, useReducedMotion } from 'motion/react'
import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
  action?: { label: string; onClick: () => void }
  /** mostra quanto tempo falta para o "desfazer" sumir */
  duration?: number
  onDismiss?: () => void
}

/** Aviso do rodapé. Tem régua do tempo que resta e fecha puxando para baixo. */
export function Toast({ children, action, duration, onDismiss }: Props) {
  const reduced = useReducedMotion()
  return (
    <motion.div
      className="toast"
      layout
      initial={{ opacity: 0, y: 18, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 18, scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 520, damping: 36 }}
      drag={onDismiss && !reduced ? 'y' : false}
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={{ top: 0.05, bottom: 0.7 }}
      onDragEnd={(_, info) => {
        if (info.offset.y > 34 || info.velocity.y > 400) onDismiss?.()
      }}
      role="status"
    >
      <span>{children}</span>
      {action && <button onClick={action.onClick}>{action.label}</button>}
      {duration && !reduced && (
        <motion.span
          className="toast-timer"
          initial={{ scaleX: 1 }}
          animate={{ scaleX: 0 }}
          transition={{ duration: duration / 1000, ease: 'linear' }}
          aria-hidden
        />
      )}
    </motion.div>
  )
}
