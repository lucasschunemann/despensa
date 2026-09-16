import { motion, useReducedMotion } from 'motion/react'
import { useRef } from 'react'
import { haptic } from '../lib/haptics'
import { productEmoji } from '../lib/products'
import type { Item } from '../lib/types'
import { Avatar } from './Avatar'

/** Toldo listrado de feira, com a borda em ondinhas. Desenrola ao abrir a tela. */
export function Awning() {
  const reduced = useReducedMotion()
  return (
    <motion.div
      className="awning"
      aria-hidden
      initial={{ scaleY: reduced ? 1 : 0 }}
      animate={{ scaleY: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 16, delay: 0.05 }}
    />
  )
}

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

/** A "embalagem" do produto: emoji do dicionário ou a inicial num círculo. */
export function ProductMark({ name, size = 30 }: { name: string; size?: number }) {
  const emoji = productEmoji(name)
  if (emoji) {
    return (
      <span className="product-emoji" style={{ fontSize: size }} aria-hidden>
        {emoji}
      </span>
    )
  }
  return (
    <span className="product-initial" style={{ width: size + 6, height: size + 6, fontSize: size * 0.5 }} aria-hidden>
      {name.charAt(0).toUpperCase()}
    </span>
  )
}

interface TileProps {
  item: Item
  me: string
  fresh: boolean
  /** item novo: cai do alto e quica na prateleira */
  dropping: boolean
  enterDelay: number
  onPick: (item: Item, from: DOMRect) => void
  onLongPress: (item: Item) => void
}

export function ProductTile({ item, me, fresh, dropping, enterDelay, onPick, onLongPress }: TileProps) {
  const reduced = useReducedMotion()
  const press = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pressed = useRef(false)
  const start = useRef<{ x: number; y: number } | null>(null)

  const cancel = () => {
    if (press.current) clearTimeout(press.current)
    press.current = null
  }

  return (
    <motion.li
      layout={reduced ? false : 'position'}
      className={`product${fresh ? ' is-fresh' : ''}`}
      initial={
        reduced
          ? { opacity: 0 }
          : dropping
            ? { y: -90, opacity: 0, rotate: -8 }
            : { y: 14, opacity: 0 }
      }
      animate={{ y: 0, opacity: 1, rotate: 0 }}
      // sai da prateleira: sobe um pouco e some (o emoji segue voando até o carrinho)
      exit={reduced ? { opacity: 0 } : { y: -18, scale: 0.7, opacity: 0, transition: { duration: 0.26 } }}
      transition={
        dropping
          ? { type: 'spring', stiffness: 520, damping: 17, mass: 0.9 }
          : { type: 'spring', stiffness: 380, damping: 30, delay: enterDelay }
      }
    >
      <motion.button
        className="product-face"
        whileTap={reduced ? undefined : { scale: 0.96, y: -2 }}
        onPointerDown={(e) => {
          pressed.current = false
          start.current = { x: e.clientX, y: e.clientY }
          press.current = setTimeout(() => {
            pressed.current = true
            haptic('medium')
            onLongPress(item)
          }, 480)
        }}
        onPointerMove={(e) => {
          if (!start.current) return
          if (Math.hypot(e.clientX - start.current.x, e.clientY - start.current.y) > 10) cancel()
        }}
        onPointerUp={cancel}
        onPointerCancel={cancel}
        onContextMenu={(e) => e.preventDefault()}
        onClick={(e) => {
          if (pressed.current) {
            pressed.current = false
            return
          }
          onPick(item, e.currentTarget.getBoundingClientRect())
        }}
        aria-label={`Pegar ${item.name}${item.quantity ? `, ${item.quantity}` : ''}`}
      >
        <span className="product-top">
          <ProductMark name={item.name} />
          {item.added_by !== me && <Avatar person={item.added_by} size={18} />}
        </span>
        <span className="product-name">{item.name}</span>
        {item.quantity && <span className="product-qty">{item.quantity}</span>}
      </motion.button>

      <span className="product-notch" aria-hidden>
        <svg viewBox="0 0 24 24">
          <path d="M12 6v12M6 12h12" />
        </svg>
      </span>
    </motion.li>
  )
}
