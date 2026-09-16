import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { ItemsStore } from '../hooks/useItems'
import type { Presence } from '../hooks/usePresence'
import { useViewportFit } from '../hooks/useViewportFit'
import { eggFor } from '../lib/eggs'
import { haptic } from '../lib/haptics'
import { formatBRL } from '../lib/money'
import { productEmoji } from '../lib/products'
import { sound } from '../lib/sound'
import type { Item } from '../lib/types'
import { AmountPrompt } from './AmountPrompt'
import { AppHeader } from './AppHeader'
import { Avatar } from './Avatar'
import { CompleteOverlay } from './CompleteOverlay'
import { Composer } from './Composer'
import { Awning, CartIcon, ProductMark, ProductTile } from './Gondola'
import { HoldButton } from './HoldButton'
import { Skeleton } from './Skeleton'
import { Toss } from './Toss'

interface Props {
  store: ItemsStore
  me: string
  presence: Presence
  onOpenMenu: () => void
  onHome?: () => void
  /** lança o valor da compra nas contas do mês; ausente no modo demonstração */
  onRegisterMarket?: (amountCents: number) => void
}

interface Flight {
  id: number
  mark: string
  from: DOMRect
  to: DOMRect
}

const REACTIONS = ['❤️', '😂', '👍', '🔥', '😮', '🙏']

export function ListScreen({ store, me, presence, onOpenMenu, onHome, onRegisterMarket }: Props) {
  const { items, arrivals, ready, connection, error, clearError, add, toggle, remove, restore, finishShopping } =
    store
  const reduced = useReducedMotion()

  const [celebrating, setCelebrating] = useState(false)
  const [egg, setEgg] = useState<{ id: number; emoji: string } | null>(null)
  const [actionsFor, setActionsFor] = useState<Item | null>(null)
  const [askAmount, setAskAmount] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [deleted, setDeleted] = useState<Item | null>(null)
  const [flights, setFlights] = useState<Flight[]>([])
  const [cartBump, setCartBump] = useState(0)
  const [rolling, setRolling] = useState(false)

  const scroller = useRef<HTMLDivElement>(null)
  const cart = useRef<HTMLSpanElement>(null)
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const nearBottom = useRef(true)
  // o que já estava na gôndola ao abrir entra em cascata; o que chega depois cai do alto
  const known = useRef<Set<string> | null>(null)

  const onShelf = items
    .filter((i) => i.status === 'pendente')
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
  const inCart = items
    .filter((i) => i.status === 'pegado')
    .sort((a, b) => (a.picked_at ?? '').localeCompare(b.picked_at ?? ''))
  const allPicked = items.length > 0 && onShelf.length === 0

  useEffect(() => {
    if (!ready) return
    if (!known.current) known.current = new Set(items.map((i) => i.id))
    else items.forEach((i) => known.current?.add(i.id))
  }, [ready, items])

  const scrollToEnd = useCallback((behavior: ScrollBehavior = 'smooth') => {
    requestAnimationFrame(() => {
      const el = scroller.current
      if (el) el.scrollTo({ top: el.scrollHeight, behavior })
    })
  }, [])
  const keepAnchored = useCallback(() => {
    if (nearBottom.current) scrollToEnd('auto')
  }, [scrollToEnd])
  useViewportFit(keepAnchored)

  // "tudo no carrinho" só na virada, nunca ao abrir com tudo já pego
  const wasAllPicked = useRef<boolean | null>(null)
  useEffect(() => {
    const previous = wasAllPicked.current
    wasAllPicked.current = allPicked
    if (!ready || previous === null || previous || !allPicked) return
    const timer = setTimeout(() => {
      sound.complete()
      haptic('success')
      setCelebrating(true)
    }, 700)
    const hide = setTimeout(() => setCelebrating(false), 2600)
    return () => {
      clearTimeout(timer)
      clearTimeout(hide)
    }
  }, [allPicked, ready])

  const handleAdd = (name: string, quantity: string | null) => {
    add(name, quantity)
    const found = eggFor(name)
    if (found) setEgg({ id: Date.now(), emoji: found.emoji })
    // o som de pousar vem quando o produto bate na prateleira
    setTimeout(() => sound.drop(), reduced ? 0 : 220)
    haptic('light')
    scrollToEnd()
  }

  // pegar: o produto sai da prateleira e voa até o carrinho do topo
  const handlePick = (item: Item, from: DOMRect) => {
    sound.pick()
    haptic('medium')
    const to = cart.current?.getBoundingClientRect()
    if (to && !reduced) {
      const flight = { id: Date.now() + Math.random(), mark: productEmoji(item.name) ?? item.name.charAt(0), from, to }
      setFlights((prev) => [...prev, flight])
      setTimeout(() => {
        setFlights((prev) => prev.filter((f) => f.id !== flight.id))
        setCartBump((n) => n + 1)
        sound.drop()
      }, 620)
    }
    toggle(item)
  }

  const handleReturn = (item: Item) => {
    sound.undo()
    haptic('light')
    toggle(item)
  }

  const handleRemove = (item: Item) => {
    setActionsFor(null)
    sound.undo()
    haptic('medium')
    remove(item)
    setDeleted(item)
    if (undoTimer.current) clearTimeout(undoTimer.current)
    undoTimer.current = setTimeout(() => setDeleted(null), 5000)
  }

  const handleUndo = () => {
    if (!deleted) return
    if (undoTimer.current) clearTimeout(undoTimer.current)
    haptic('light')
    restore(deleted)
    setDeleted(null)
  }

  // finalizar: o carrinho vai embora rodando e a compra fecha
  const handleFinish = () => {
    haptic('success')
    setRolling(true)
    setTimeout(
      () => {
        sound.complete()
        finishShopping()
        setRolling(false)
        if (onRegisterMarket) setAskAmount(true)
      },
      reduced ? 0 : 950,
    )
  }

  return (
    <div className="app">
      <AppHeader
        title="mercado"
        presence={presence}
        onOpenMenu={onOpenMenu}
        onHome={onHome}
        accessory={
          <motion.span
            ref={cart}
            key={cartBump}
            className="cart-pill"
            animate={cartBump > 0 && !reduced ? { scale: [1, 1.18, 0.96, 1], rotate: [0, -6, 3, 0] } : undefined}
            transition={{ duration: 0.42 }}
            aria-label={`${inCart.length} de ${items.length} no carrinho`}
          >
            <CartIcon size={20} />
            <b>
              {inCart.length}/{items.length}
            </b>
          </motion.span>
        }
      />
      <Awning />

      <AnimatePresence>
        {ready && connection !== 'live' && (
          <motion.p
            className="banner"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
          >
            {connection === 'connecting' ? 'Conectando…' : 'Sem conexão · reconectando'}
          </motion.p>
        )}
        {error && (
          <motion.button
            className="banner banner-error"
            onClick={clearError}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
          >
            {error}
          </motion.button>
        )}
      </AnimatePresence>

      <div
        className="scroll gondola-scroll"
        ref={scroller}
        onScroll={(e) => {
          const el = e.currentTarget
          nearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80
        }}
      >
        {!ready && <Skeleton />}

        {ready && items.length === 0 && (
          <motion.div className="empty-gondola" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {/* gôndola vazia: sobrou só os dois gatos na prateleira */}
            <div className="empty-shelf">
              <motion.span
                initial={{ y: -70, opacity: 0, rotate: -10 }}
                animate={{ y: 0, opacity: 1, rotate: -3 }}
                transition={{ type: 'spring', stiffness: 420, damping: 15, delay: 0.15 }}
              >
                <Avatar person="Bela" size={88} variant="full" />
              </motion.span>
              <motion.span
                initial={{ y: -70, opacity: 0, rotate: 10 }}
                animate={{ y: 0, opacity: 1, rotate: 4 }}
                transition={{ type: 'spring', stiffness: 420, damping: 15, delay: 0.3 }}
              >
                <Avatar person="Lucas" size={88} variant="full" />
              </motion.span>
            </div>
            <p className="empty-title">Gôndola vazia</p>
            <p className="empty-hint">Escreva aí embaixo e o produto cai na prateleira. “2 leite”.</p>
          </motion.div>
        )}

        {onShelf.length > 0 && (
          <ul className="shelves">
            <AnimatePresence initial={false} mode="popLayout">
              {onShelf.map((item, index) => (
                <ProductTile
                  key={item.id}
                  item={item}
                  me={me}
                  fresh={arrivals.includes(item.id)}
                  dropping={Boolean(known.current && !known.current.has(item.id))}
                  enterDelay={index * 0.04}
                  onPick={handlePick}
                  onLongPress={(i) => setActionsFor(i)}
                />
              ))}
            </AnimatePresence>
          </ul>
        )}

        <AnimatePresence>
          {inCart.length > 0 && (
            <motion.section
              className={`basket${allPicked ? ' is-full' : ''}`}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            >
              <div className="basket-head">
                <motion.span
                  className="basket-cart"
                  animate={rolling ? { x: 360, rotate: [0, -4, 0] } : { x: 0 }}
                  transition={rolling ? { duration: 0.9, ease: [0.5, 0, 0.9, 0.6] } : { duration: 0 }}
                >
                  <CartIcon size={30} rolling={rolling} />
                </motion.span>
                <span className="basket-title">
                  no carrinho
                  <small>
                    {inCart.length} de {items.length}
                  </small>
                </span>
              </div>

              <ul className="basket-items">
                <AnimatePresence initial={false}>
                  {inCart.map((item, index) => (
                    <motion.li
                      key={item.id}
                      layout
                      initial={{ scale: 0.3, opacity: 0, y: -16 }}
                      animate={
                        rolling
                          ? { x: 360, opacity: 0, transition: { duration: 0.6, delay: index * 0.02 } }
                          : { scale: 1, opacity: 1, y: 0, x: 0 }
                      }
                      exit={{ scale: 0.6, opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 520, damping: 26, delay: 0.5 }}
                    >
                      <button className="chip-item" onClick={() => handleReturn(item)} aria-label={`Devolver ${item.name} à prateleira`}>
                        <ProductMark name={item.name} size={15} />
                        <span>{item.name}</span>
                      </button>
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>

              <div className="basket-finish">
                <HoldButton label="Segure para finalizar" onComplete={handleFinish} />
                <span className="finish-note">
                  {allPicked ? 'a lista vai para o histórico' : 'o que ficou na prateleira fica para a próxima'}
                </span>
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </div>

      <div className="dock">
        <AnimatePresence>
          {actionsFor && (
            <motion.div
              key="actions"
              className="reaction-picker"
              initial={{ opacity: 0, y: 14, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 14, scale: 0.94 }}
              transition={{ type: 'spring', stiffness: 460, damping: 32 }}
            >
              <span className="reaction-about">
                <ProductMark name={actionsFor.name} size={16} /> {actionsFor.name}
              </span>
              <div className="reaction-emojis">
                {REACTIONS.map((emoji, i) => (
                  <motion.button
                    key={emoji}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.03 * i, type: 'spring', stiffness: 520, damping: 30 }}
                    whileTap={{ scale: 0.86 }}
                    onClick={() => {
                      presence.sendReaction(emoji, actionsFor.name)
                      haptic('light')
                      setActionsFor(null)
                    }}
                  >
                    {emoji}
                  </motion.button>
                ))}
              </div>
              <div className="actions-row">
                <button className="reaction-close" onClick={() => setActionsFor(null)}>
                  fechar
                </button>
                <button className="action-delete" onClick={() => handleRemove(actionsFor)}>
                  tirar da gôndola
                </button>
              </div>
            </motion.div>
          )}
          {notice && (
            <motion.div
              key="notice"
              className="toast"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
            >
              <span>{notice}</span>
            </motion.div>
          )}
          {deleted && (
            <motion.div
              key="deleted"
              className="toast"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
            >
              <span>{deleted.name} saiu da gôndola</span>
              <button onClick={handleUndo}>Desfazer</button>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {presence.typing && (
            <motion.p
              className="typing"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
            >
              <Avatar person={presence.typing} size={18} />
              {presence.typing} está escrevendo
              <span className="dots" aria-hidden>
                {[0, 1, 2].map((i) => (
                  <motion.i
                    key={i}
                    animate={{ opacity: [0.2, 1, 0.2] }}
                    transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.16 }}
                  />
                ))}
              </span>
            </motion.p>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {askAmount && onRegisterMarket && (
            <AmountPrompt
              question="Quanto deu no mercado?"
              emptyHint="entra nas contas do mês, já paga"
              confirmHint={(valor) => `vai virar a conta “Mercado” de ${valor}`}
              onClose={() => setAskAmount(false)}
              onConfirm={(cents) => {
                onRegisterMarket(cents)
                setAskAmount(false)
                setNotice(`${formatBRL(cents)} lançado nas contas do mês`)
                setTimeout(() => setNotice(null), 4000)
              }}
            />
          )}
        </AnimatePresence>

        <Composer onAdd={handleAdd} onFocus={() => scrollToEnd()} onTyping={presence.notifyTyping} />
      </div>

      {/* produtos a caminho do carrinho: sobem num arco e encolhem ao cair dentro */}
      {flights.map((f) => {
        const startX = f.from.left + f.from.width / 2 - 18
        const startY = f.from.top + 18
        const endX = f.to.left + f.to.width / 2 - 18
        const endY = f.to.top + f.to.height / 2 - 18
        // o carrinho fica no topo: o arco curva para o lado em vez de subir além da tela
        const peak = Math.max(12, (startY + endY) / 2 - 50)
        const bow = (startX + endX) / 2 + (endX > startX ? -40 : 40)
        return (
          <motion.span
            key={f.id}
            className="flight"
            initial={{ x: startX, y: startY, scale: 1.1, rotate: 0 }}
            animate={{
              x: [startX, bow, endX],
              y: [startY, peak, endY],
              scale: [1.1, 1.5, 0.45],
              rotate: [0, -25, 10],
            }}
            transition={{ duration: 0.62, times: [0, 0.45, 1], ease: 'easeInOut' }}
            aria-hidden
          >
            {f.mark}
          </motion.span>
        )
      })}

      <AnimatePresence>
        {egg && <Toss key={egg.id} emoji={egg.emoji} onDone={() => setEgg(null)} />}
      </AnimatePresence>
      <CompleteOverlay show={celebrating} label="tudo no carrinho" />
    </div>
  )
}
