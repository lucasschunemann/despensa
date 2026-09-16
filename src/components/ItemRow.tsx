import { animate, motion, useMotionValue, useReducedMotion } from 'motion/react'
import { useEffect, useRef } from 'react'
import type { Item } from '../lib/types'

const ACTION_WIDTH = 92
const OPEN_THRESHOLD = 44

interface Props {
  item: Item
  me: string
  open: boolean
  exitDelay: number
  onOpenChange: (open: boolean) => void
  onToggle: (item: Item) => void
  onRemove: (item: Item) => void
}

export function ItemRow({ item, me, open, exitDelay, onOpenChange, onToggle, onRemove }: Props) {
  const picked = item.status === 'pegado'
  const reduced = useReducedMotion()
  const x = useMotionValue(0)
  const face = useRef<HTMLDivElement>(null)

  const spring = reduced
    ? { duration: 0.12 }
    : { type: 'spring' as const, stiffness: 560, damping: 38, mass: 0.7 }

  useEffect(() => {
    animate(x, open ? -ACTION_WIDTH : 0, spring)
    // spring é estável entre renders (só muda com prefers-reduced-motion)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, x])

  return (
    <motion.li
      layout={reduced ? false : 'position'}
      className={`row${picked ? ' is-picked' : ''}`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0, transition: { duration: 0.22, delay: exitDelay } }}
      transition={spring}
    >
      <button
        className="row-delete"
        tabIndex={open ? 0 : -1}
        aria-hidden={!open}
        onClick={() => onRemove(item)}
      >
        Apagar
      </button>

      <motion.div
        ref={face}
        className="row-face"
        style={{ x }}
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: -ACTION_WIDTH, right: 0 }}
        dragElastic={{ left: 0.04, right: 0 }}
        dragMomentum={false}
        onDragEnd={(_, info) => {
          const shouldOpen = info.offset.x < -OPEN_THRESHOLD || info.velocity.x < -450
          animate(x, shouldOpen ? -ACTION_WIDTH : 0, spring)
          onOpenChange(shouldOpen)
        }}
      >
        <button
          className="row-main"
          aria-pressed={picked}
          aria-label={picked ? `Desmarcar ${item.name}` : `Marcar ${item.name} como pegado`}
          onClick={() => {
            // gaveta aberta: o toque fecha em vez de marcar
            if (Math.abs(x.get()) > 2) {
              onOpenChange(false)
              return
            }
            onToggle(item)
          }}
        >
          <Check picked={picked} reduced={Boolean(reduced)} />
          <span className="row-name">
            <span className="row-label">
              {item.name}
              <motion.span
                className="row-strike"
                initial={false}
                animate={{ scaleX: picked ? 1 : 0 }}
                transition={reduced ? { duration: 0 } : { duration: 0.24, ease: [0.2, 0.8, 0.2, 1] }}
              />
            </span>
          </span>
          {item.quantity && <span className="row-qty">{item.quantity}</span>}
          {/* a inicial só aparece no que o outro adicionou: o seu você já sabe */}
          {item.added_by !== me && (
            <span className="row-who" title={`Adicionado por ${item.added_by}`}>
              {item.added_by.charAt(0)}
            </span>
          )}
        </button>
      </motion.div>
    </motion.li>
  )
}

function Check({ picked, reduced }: { picked: boolean; reduced: boolean }) {
  const draw = reduced ? { duration: 0 } : { duration: 0.28, ease: [0.3, 0.9, 0.3, 1] as const }
  const pop = reduced
    ? { duration: 0 }
    : { type: 'spring' as const, stiffness: 620, damping: 26, mass: 0.6 }

  return (
    <span className="row-check" aria-hidden>
      <svg viewBox="0 0 24 24">
        <circle className="check-ring" cx="12" cy="12" r="10.6" />
        <motion.circle
          className="check-fill"
          cx="12"
          cy="12"
          r="10.6"
          initial={false}
          animate={{ scale: picked ? 1 : 0.2, opacity: picked ? 1 : 0 }}
          transition={pop}
        />
        <motion.path
          className="check-mark"
          d="M7.2 12.4 L10.6 15.8 L16.9 9.2"
          initial={false}
          animate={{ pathLength: picked ? 1 : 0, opacity: picked ? 1 : 0 }}
          transition={draw}
        />
      </svg>
    </span>
  )
}
