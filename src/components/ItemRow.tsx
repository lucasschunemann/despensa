import { animate, motion, useMotionValue, useReducedMotion, useTransform } from 'motion/react'
import { useEffect, useRef } from 'react'
import { haptic } from '../lib/haptics'
import type { Item } from '../lib/types'
import { Avatar } from './Avatar'

const ACTION_WIDTH = 92
const OPEN_THRESHOLD = 44
const PICK_WIDTH = 104
const PICK_THRESHOLD = 62

interface Props {
  item: Item
  me: string
  open: boolean
  fresh: boolean
  enterDelay: number
  exitDelay: number
  onOpenChange: (open: boolean) => void
  onToggle: (item: Item) => void
  onRemove: (item: Item) => void
}

export function ItemRow({
  item,
  me,
  open,
  fresh,
  enterDelay,
  exitDelay,
  onOpenChange,
  onToggle,
  onRemove,
}: Props) {
  const picked = item.status === 'pegado'
  const reduced = useReducedMotion()
  const x = useMotionValue(0)
  const face = useRef<HTMLDivElement>(null)

  // mola macia: chega sem estalo, mas ainda com peso
  const spring = reduced
    ? { duration: 0.12 }
    : { type: 'spring' as const, stiffness: 420, damping: 34, mass: 0.8 }
  const crossed = useRef(false)

  // enquanto arrasta para a direita, a marca de "pegado" vai aparecendo
  const pickOpacity = useTransform(x, [0, PICK_THRESHOLD * 0.5, PICK_THRESHOLD], [0, 0.5, 1])
  const pickScale = useTransform(x, [0, PICK_THRESHOLD], [0.6, 1])

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
      transition={{ ...spring, delay: enterDelay }}
    >
      <motion.span className="row-pick" style={{ opacity: pickOpacity, scale: pickScale }} aria-hidden>
        <svg viewBox="0 0 24 24">
          <path d="M5 12.5 10 17.5 19 7.5" />
        </svg>
      </motion.span>

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
        dragConstraints={{ left: -ACTION_WIDTH, right: PICK_WIDTH }}
        dragElastic={{ left: 0.04, right: 0.12 }}
        dragMomentum={false}
        onDrag={(_, info) => {
          // um toque de vibração no momento em que passa do ponto de marcar
          const past = info.offset.x > PICK_THRESHOLD
          if (past !== crossed.current) {
            crossed.current = past
            if (past) haptic('light')
          }
        }}
        onDragEnd={(_, info) => {
          crossed.current = false
          if (info.offset.x > PICK_THRESHOLD) {
            animate(x, 0, spring)
            onOpenChange(false)
            onToggle(item)
            return
          }
          const shouldOpen = info.offset.x < -OPEN_THRESHOLD || info.velocity.x < -450
          animate(x, shouldOpen ? -ACTION_WIDTH : 0, spring)
          onOpenChange(shouldOpen)
        }}
      >
        {fresh && (
          <motion.span
            className="row-fresh"
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 2.2, ease: 'easeOut' }}
            aria-hidden
          />
        )}
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
          {/* o avatar só aparece no que o outro adicionou: o seu você já sabe */}
          {item.added_by !== me && (
            <span className="row-who" title={`Adicionado por ${item.added_by}`}>
              <Avatar person={item.added_by} size={20} />
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
