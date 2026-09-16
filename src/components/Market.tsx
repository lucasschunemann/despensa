import { AnimatePresence, animate, motion, useMotionValue, useReducedMotion, useTransform } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { haptic } from '../lib/haptics'
import { productEmoji } from '../lib/products'
import type { Item } from '../lib/types'
import { Avatar } from './Avatar'
import { HoldButton } from './HoldButton'

// cada roda gira em torno do próprio centro (sem isso ela gira em volta do desenho todo e se solta)
const AXLE = { transformBox: 'fill-box', transformOrigin: 'center' } as const

/** Carrinho de linha. As rodas têm um raio, para dar para ver que giram. */
export function CartIcon({ rolling = false, size = 22 }: { rolling?: boolean; size?: number }) {
  const spin = rolling ? { rotate: 720 } : { rotate: 0 }
  const wheel = { duration: rolling ? 0.9 : 0, ease: 'easeIn' as const }
  return (
    <svg className="cart-icon" width={size} height={size * 0.875} viewBox="0 0 32 28" aria-hidden>
      <path d="M2 3h4l3.2 14.2a2 2 0 0 0 2 1.6h12.6a2 2 0 0 0 2-1.5L29 8H7.2" />
      <motion.g style={AXLE} animate={spin} transition={wheel}>
        <circle cx="12" cy="24" r="2.4" />
        <path d="M12 21.6v4.8" />
      </motion.g>
      <motion.g style={AXLE} animate={spin} transition={wheel}>
        <circle cx="24" cy="24" r="2.4" />
        <path d="M24 21.6v4.8" />
      </motion.g>
    </svg>
  )
}

/** O emoji do produto (dicionário local) ou a inicial, quando a palavra não está lá. */
export function ProductMark({ name, size = 22 }: { name: string; size?: number }) {
  const emoji = productEmoji(name)
  if (emoji) {
    return (
      <span className="product-emoji" style={{ fontSize: size }} aria-hidden>
        {emoji}
      </span>
    )
  }
  return (
    <span className="product-initial" style={{ fontSize: size * 0.62 }} aria-hidden>
      {name.charAt(0).toUpperCase()}
    </span>
  )
}

const ACTION_WIDTH = 92
const OPEN_THRESHOLD = 44
const PICK_WIDTH = 104
const PICK_THRESHOLD = 62

interface RowProps {
  item: Item
  me: string
  open: boolean
  fresh: boolean
  /** item que acabou de entrar: o emoji pula para dentro da caixinha */
  arriving: boolean
  enterDelay: number
  onOpenChange: (open: boolean) => void
  onPick: (item: Item, from: DOMRect) => void
  onRemove: (item: Item) => void
  onLongPress: (item: Item) => void
}

export function MarketRow({
  item,
  me,
  open,
  fresh,
  arriving,
  enterDelay,
  onOpenChange,
  onPick,
  onRemove,
  onLongPress,
}: RowProps) {
  const reduced = useReducedMotion()
  const x = useMotionValue(0)
  const mark = useRef<HTMLSpanElement>(null)
  const crossed = useRef(false)
  const dragged = useRef(false)
  const press = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pressed = useRef(false)
  const [checking, setChecking] = useState(false)

  const spring = reduced
    ? { duration: 0.12 }
    : { type: 'spring' as const, stiffness: 420, damping: 34, mass: 0.8 }
  const pickOpacity = useTransform(x, [0, PICK_THRESHOLD * 0.5, PICK_THRESHOLD], [0, 0.5, 1])
  const deleteOpacity = useTransform(x, [-ACTION_WIDTH, -14, 0], [1, 0, 0])

  useEffect(() => {
    animate(x, open ? -ACTION_WIDTH : 0, spring)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, x])

  const cancelPress = () => {
    if (press.current) clearTimeout(press.current)
    press.current = null
  }

  // pegar: o check desenha primeiro, e só então o produto sai da lista rumo ao carrinho
  const pick = () => {
    if (checking) return
    setChecking(true)
    const rect = mark.current?.getBoundingClientRect() ?? new DOMRect()
    setTimeout(() => onPick(item, rect), reduced ? 0 : 230)
  }

  return (
    <motion.li
      layout={reduced ? false : 'position'}
      className={`mrow${fresh ? ' is-fresh' : ''}`}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0, x: 24, transition: { duration: 0.26, ease: [0.4, 0, 0.2, 1] } }}
      transition={{ ...spring, delay: enterDelay }}
    >
      <motion.span className="mrow-behind is-pick" style={{ opacity: pickOpacity }} aria-hidden>
        <CartIcon size={20} /> pegar
      </motion.span>
      <motion.button
        className="mrow-behind is-delete"
        style={{ opacity: deleteOpacity }}
        tabIndex={open ? 0 : -1}
        aria-hidden={!open}
        onClick={() => onRemove(item)}
      >
        Apagar
      </motion.button>

      <motion.div
        className="mrow-face"
        style={{ x }}
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: -ACTION_WIDTH, right: PICK_WIDTH }}
        dragElastic={{ left: 0.04, right: 0.12 }}
        dragMomentum={false}
        onPointerDown={() => {
          dragged.current = false
          pressed.current = false
          press.current = setTimeout(() => {
            pressed.current = true
            haptic('medium')
            onLongPress(item)
          }, 480)
        }}
        onPointerUp={cancelPress}
        onPointerCancel={cancelPress}
        onDragStart={() => {
          dragged.current = true
          cancelPress()
        }}
        onDrag={(_, info) => {
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
            pick()
            return
          }
          const shouldOpen = info.offset.x < -OPEN_THRESHOLD || info.velocity.x < -450
          animate(x, shouldOpen ? -ACTION_WIDTH : 0, spring)
          onOpenChange(shouldOpen)
        }}
      >
        <button
          className="mrow-main"
          onContextMenu={(e) => e.preventDefault()}
          onClick={() => {
            if (pressed.current) {
              pressed.current = false
              return
            }
            if (dragged.current || Math.abs(x.get()) > 2) {
              if (!dragged.current) onOpenChange(false)
              return
            }
            pick()
          }}
          aria-label={`Pegar ${item.name}`}
        >
          <motion.span
            ref={mark}
            className="mrow-mark"
            initial={arriving && !reduced ? { scale: 0, rotate: -25 } : false}
            animate={checking ? { scale: 0.86, opacity: 0.5 } : { scale: 1, rotate: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 560, damping: 14, delay: arriving ? 0.12 : 0 }}
          >
            <ProductMark name={item.name} />
          </motion.span>

          <span className="mrow-text">
            <span className="mrow-name">
              {item.name}
              <motion.span
                className="row-strike"
                initial={false}
                animate={{ scaleX: checking ? 1 : 0 }}
                transition={{ duration: reduced ? 0 : 0.2, ease: [0.2, 0.8, 0.2, 1] }}
              />
            </span>
            {(item.quantity || item.added_by !== me) && (
              <span className="mrow-meta">
                {item.quantity && <span className="mrow-qty">{item.quantity}</span>}
                {item.added_by !== me && <Avatar person={item.added_by} size={15} />}
              </span>
            )}
          </span>

          <span className="row-check" aria-hidden>
            <svg viewBox="0 0 24 24">
              <circle className="check-ring" cx="12" cy="12" r="10.6" />
              <motion.circle
                className="check-fill"
                cx="12"
                cy="12"
                r="10.6"
                initial={false}
                animate={{ scale: checking ? 1 : 0.2, opacity: checking ? 1 : 0 }}
                transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 620, damping: 26 }}
              />
              <motion.path
                className="check-mark"
                d="M7.2 12.4 L10.6 15.8 L16.9 9.2"
                initial={false}
                animate={{ pathLength: checking ? 1 : 0, opacity: checking ? 1 : 0 }}
                transition={{ duration: reduced ? 0 : 0.2 }}
              />
            </svg>
          </span>
        </button>
      </motion.div>
    </motion.li>
  )
}

interface CartProps {
  items: Item[]
  total: number
  rolling: boolean
  allPicked: boolean
  onReturn: (item: Item) => void
  onFinish: () => void
}

/** O que já foi pego: uma linha só, com os emojis empilhados. Toque para abrir. */
export function CartSection({ items, total, rolling, allPicked, onReturn, onFinish }: CartProps) {
  const [expanded, setExpanded] = useState(false)
  const reduced = useReducedMotion()
  const stack = items.slice(-5).reverse()

  return (
    <motion.section
      className="cart"
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 16 }}
      transition={{ type: 'spring', stiffness: 380, damping: 32 }}
    >
      <button className="cart-head" onClick={() => setExpanded((v) => !v)} aria-expanded={expanded}>
        <motion.span
          className="cart-head-icon"
          animate={rolling && !reduced ? { x: 280 } : { x: 0 }}
          transition={rolling ? { duration: 0.9, ease: [0.5, 0, 0.9, 0.6] } : { duration: 0 }}
        >
          <CartIcon size={24} rolling={rolling} />
        </motion.span>
        <span className="cart-head-text">
          no carrinho
          <small>
            {items.length} de {total}
          </small>
        </span>
        <motion.span
          className="cart-stack"
          animate={rolling && !reduced ? { x: 260, opacity: 0 } : { x: 0, opacity: 1 }}
          transition={rolling ? { duration: 0.8, delay: 0.1, ease: [0.5, 0, 0.9, 0.6] } : { duration: 0 }}
        >
          <AnimatePresence initial={false}>
            {stack.map((item) => (
              <motion.span
                key={item.id}
                layout
                className="cart-stack-item"
                initial={{ scale: 0, y: -14 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0 }}
                transition={{ type: 'spring', stiffness: 600, damping: 18, delay: 0.45 }}
              >
                <ProductMark name={item.name} size={16} />
              </motion.span>
            ))}
          </AnimatePresence>
        </motion.span>
        <motion.svg
          className="cart-chevron"
          viewBox="0 0 24 24"
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          aria-hidden
        >
          <path d="M6 9.5 12 15l6-5.5" />
        </motion.svg>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.ul
            className="cart-items"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 420, damping: 38 }}
          >
            {items.map((item) => (
              <li key={item.id}>
                <button className="cart-item" onClick={() => onReturn(item)} aria-label={`Devolver ${item.name} à lista`}>
                  <span className="cart-item-mark">
                    <ProductMark name={item.name} size={16} />
                  </span>
                  <span className="cart-item-name">{item.name}</span>
                  <span className="cart-item-back">devolver</span>
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>

      <div className="cart-finish">
        <HoldButton label="Segure para finalizar" onComplete={onFinish} />
        <span className="finish-note">
          {allPicked ? 'a lista vai para o histórico' : 'o que falta fica para a próxima'}
        </span>
      </div>
    </motion.section>
  )
}
