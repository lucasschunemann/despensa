import { animate, motion, useMotionValue, useReducedMotion, useTransform } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { haptic } from '../lib/haptics'
import { formatBRL } from '../lib/money'
import type { Wish } from '../lib/types'
import { WANT_LABEL } from '../lib/types'
import { sound } from '../lib/sound'
import { Avatar } from './Avatar'
import { Hearts, Sparks } from './Ether'
import { InlineAmount } from './InlineAmount'

const ACTION_WIDTH = 92
const OPEN_THRESHOLD = 44
const BUY_WIDTH = 104
const BUY_THRESHOLD = 62

interface Props {
  wish: Wish
  me: string
  people: readonly string[]
  when: string | null
  open: boolean
  enterDelay: number
  onOpenChange: (open: boolean) => void
  onToggleWant: (wish: Wish) => void
  onCycleLevel: (wish: Wish) => void
  onSetPrice: (wish: Wish, cents: number) => void
  onPickImage: (wish: Wish, file: File) => void
  onToggleBought: (wish: Wish) => void
  onRemove: (wish: Wish) => void
}

export function WishCard({
  wish,
  me,
  people,
  when,
  open,
  enterDelay,
  onOpenChange,
  onToggleWant,
  onCycleLevel,
  onSetPrice,
  onPickImage,
  onToggleBought,
  onRemove,
}: Props) {
  const reduced = useReducedMotion()
  const x = useMotionValue(0)
  const crossed = useRef(false)
  const file = useRef<HTMLInputElement>(null)
  const [burst, setBurst] = useState(0)
  // "realizando": o cartão vira luz antes de ir para "já compramos"
  const [granting, setGranting] = useState(false)
  const grantTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => {
    if (grantTimer.current) clearTimeout(grantTimer.current)
  }, [])
  useEffect(() => setGranting(false), [wish.status])

  const toggleBought = () => {
    if (wish.status === 'comprado' || reduced) {
      onToggleBought(wish)
      return
    }
    setGranting(true)
    sound.shimmer()
    haptic('medium')
    grantTimer.current = setTimeout(() => onToggleBought(wish), 820)
  }

  const loved = people.every((person) => wish.wanted_by.includes(person))
  const mine = wish.wanted_by.includes(me)
  const bought = wish.status === 'comprado'

  const spring = reduced
    ? { duration: 0.12 }
    : { type: 'spring' as const, stiffness: 420, damping: 34, mass: 0.8 }
  const buyOpacity = useTransform(x, [0, BUY_THRESHOLD * 0.5, BUY_THRESHOLD], [0, 0.5, 1])
  const buyScale = useTransform(x, [0, BUY_THRESHOLD], [0.6, 1])
  // o cartão é de vidro: o que fica atrás só aparece enquanto se arrasta
  const deleteOpacity = useTransform(x, [-ACTION_WIDTH, -14, 0], [1, 0, 0])

  useEffect(() => {
    animate(x, open ? -ACTION_WIDTH : 0, spring)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, x])

  return (
    <motion.li
      layout={reduced ? false : 'position'}
      className={`wish${loved ? ' is-loved' : ''}${bought ? ' is-bought' : ''}`}
      initial={{ opacity: 0, y: 10 }}
      animate={
        granting
          ? { opacity: 0, y: -24, scale: 1.04, filter: 'blur(10px)' }
          : { opacity: bought ? 0.72 : 1, y: 0, scale: 1, filter: 'blur(0px)' }
      }
      exit={{ opacity: 0, scale: 0.94, transition: { duration: 0.24 } }}
      transition={granting ? { duration: 0.8, ease: [0.3, 0, 0.6, 1] } : { ...spring, delay: enterDelay }}
    >
      {granting && <Sparks />}
      <motion.span className="wish-behind" style={{ opacity: buyOpacity, scale: buyScale }} aria-hidden>
        ✦ realizar
      </motion.span>

      <motion.button
        className="row-delete"
        style={{ opacity: deleteOpacity }}
        tabIndex={open ? 0 : -1}
        aria-hidden={!open}
        onClick={() => onRemove(wish)}
      >
        Apagar
      </motion.button>

      <motion.div
        className="wish-float"
        animate={reduced || bought ? undefined : { y: [0, -3, 0] }}
        transition={{ duration: 5 + (enterDelay * 100) % 3, repeat: Infinity, ease: 'easeInOut', delay: enterDelay * 8 }}
      >
      <motion.div
        className="wish-face"
        style={{ x }}
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: -ACTION_WIDTH, right: BUY_WIDTH }}
        dragElastic={{ left: 0.04, right: 0.12 }}
        dragMomentum={false}
        onDrag={(_, info) => {
          const past = info.offset.x > BUY_THRESHOLD
          if (past !== crossed.current) {
            crossed.current = past
            if (past) haptic('light')
          }
        }}
        onDragEnd={(_, info) => {
          crossed.current = false
          if (info.offset.x > BUY_THRESHOLD) {
            animate(x, 0, spring)
            onOpenChange(false)
            toggleBought()
            return
          }
          const shouldOpen = info.offset.x < -OPEN_THRESHOLD || info.velocity.x < -450
          animate(x, shouldOpen ? -ACTION_WIDTH : 0, spring)
          onOpenChange(shouldOpen)
        }}
      >
        <button
          className="wish-photo"
          onClick={() => file.current?.click()}
          aria-label={wish.image_url ? `Trocar a foto de ${wish.title}` : `Adicionar foto de ${wish.title}`}
        >
          {wish.image_url ? (
            <img src={wish.image_url} alt="" draggable={false} />
          ) : (
            <svg viewBox="0 0 24 24" aria-hidden>
              <rect x="3" y="5.5" width="18" height="14" rx="3" />
              <circle cx="12" cy="12.5" r="3.4" />
              <path d="M8 5.5 9.2 3.4h5.6L16 5.5" />
            </svg>
          )}
        </button>
        <input
          ref={file}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const picked = e.target.files?.[0]
            if (picked) onPickImage(wish, picked)
            e.target.value = ''
          }}
        />

        <div className="wish-body">
          <div className="wish-top">
            <span className="wish-title">{wish.title}</span>
            <InlineAmount
              cents={wish.price_cents}
              label={`Preço de ${wish.title}`}
              onChange={(cents) => onSetPrice(wish, cents)}
            />
          </div>

          <div className="wish-meta">
            <button className="wish-level" onClick={() => onCycleLevel(wish)}>
              {WANT_LABEL[wish.want_level]}
            </button>
            {bought ? (
              <span>comprado{wish.bought_by ? ` por ${wish.bought_by === me ? 'você' : wish.bought_by}` : ''}</span>
            ) : (
              when && <span className="wish-when">{when === 'já dá' ? 'já dá' : `dá em ${when}`}</span>
            )}
          </div>
        </div>

        <button
          className={`wish-hearts${mine ? ' is-mine' : ''}`}
          onClick={() => {
            if (Math.abs(x.get()) > 2) {
              onOpenChange(false)
              return
            }
            if (!mine) setBurst((n) => n + 1)
            haptic(mine ? 'light' : 'medium')
            onToggleWant(wish)
          }}
          aria-pressed={mine}
          aria-label={mine ? 'Tirar meu coração' : 'Também quero'}
        >
          {burst > 0 && <Hearts key={burst} />}
          <motion.svg
            viewBox="0 0 24 24"
            key={burst}
            animate={burst > 0 ? { scale: [1, 1.35, 0.94, 1] } : undefined}
            transition={{ duration: 0.45 }}
          >
            <path d="M12 20.4 4.6 13a4.7 4.7 0 0 1 6.6-6.7l.8.8.8-.8A4.7 4.7 0 0 1 19.4 13Z" />
          </motion.svg>
          <span className="wish-who">
            {wish.wanted_by.map((person) => (
              <Avatar key={person} person={person} size={17} />
            ))}
          </span>
        </button>
      </motion.div>
      </motion.div>
    </motion.li>
  )
}

export function priceOf(wish: Wish): string {
  return formatBRL(wish.price_cents)
}
