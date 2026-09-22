import { animate, motion, useMotionValue, useReducedMotion } from 'motion/react'
import { useEffect, useLayoutEffect, useRef } from 'react'
import { jazz } from '../lib/jazz'
import { productEmoji } from '../lib/products'
import type { Item } from '../lib/types'
import { Avatar, Mark } from './Avatar'

const WEEKDAY = new Intl.DateTimeFormat('pt-BR', { weekday: 'long' })

/** Quanto tempo a compra levou, do primeiro item pego até agora. */
export function shoppingDuration(items: Pick<Item, 'picked_at'>[], now = Date.now()): string | null {
  const times = items.map((item) => (item.picked_at ? Date.parse(item.picked_at) : NaN)).filter(Number.isFinite)
  if (!times.length) return null
  const minutes = Math.round((now - Math.min(...times)) / 60_000)
  if (minutes < 2 || minutes > 240) return null
  return minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)}h${String(minutes % 60).padStart(2, '0')}`
}

/**
 * Finalizar a compra rola os créditos, como no fim de um filme: cada item com quem
 * lembrou dele, o elenco da casa e "fim.". O camarão toca a resolução quando o fim chega.
 * Tocar em qualquer lugar pula. Com Reduzir Movimento, não roda.
 */
export function Credits({ items, onDone }: { items: Item[]; onDone: () => void }) {
  const reduced = useReducedMotion()
  const roll = useRef<HTMLDivElement>(null)
  const y = useMotionValue(0)
  const done = useRef(false)
  const finish = () => {
    if (done.current) return
    done.current = true
    onDone()
  }

  useEffect(() => { if (reduced) finish() })

  useLayoutEffect(() => {
    if (reduced || !roll.current) return
    const distance = roll.current.offsetHeight
    const seconds = Math.min(8, 3.4 + items.length * 0.32)
    const controls = animate(y, -distance, { duration: seconds, ease: [0.2, 0, 0.35, 1] })
    const music = window.setTimeout(() => jazz.frase('final'), seconds * 1000 * 0.78)
    const hold = window.setTimeout(finish, seconds * 1000 + 1300)
    return () => { controls.stop(); window.clearTimeout(music); window.clearTimeout(hold) }
    // roda uma vez, com a lista do momento em que a compra fechou
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (reduced) return null
  const cast = [...new Set(items.map((item) => item.added_by))]
  const took = shoppingDuration(items)

  return (
    <motion.div
      className="credits"
      role="dialog"
      aria-label="Compra finalizada"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
      onClick={finish}
    >
      <motion.div ref={roll} className="credits-roll" style={{ y }}>
        <p className="credits-kicker">despensa apresenta</p>
        <h2 className="credits-title">a compra de {WEEKDAY.format(new Date()).replace('-feira', '')}</h2>
        <span className="credits-rule" aria-hidden />
        <ul className="credits-list">
          {items.map((item) => (
            <li key={item.id}>
              <span className="credits-role">{item.name.toLowerCase()}</span>
              <span className="credits-emoji" aria-hidden>{productEmoji(item.name) ?? '·'}</span>
              <span className="credits-name">{item.added_by.toLowerCase()}</span>
            </li>
          ))}
        </ul>
        <span className="credits-rule" aria-hidden />
        <p className="credits-cast">
          {cast.map((person) => <Avatar key={person} person={person} size={26} />)}
          <span>{items.length} {items.length === 1 ? 'item' : 'itens'}{took ? ` em ${took}` : ''}</span>
        </p>
        <div className="credits-end">
          <strong>fim.</strong>
          <Mark size={34} />
        </div>
      </motion.div>
      <button className="credits-skip" onClick={(event) => { event.stopPropagation(); finish() }}>pular</button>
    </motion.div>
  )
}
