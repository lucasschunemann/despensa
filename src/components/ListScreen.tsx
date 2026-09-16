import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { ItemsStore } from '../hooks/useItems'
import type { Presence } from '../hooks/usePresence'
import { useViewportFit } from '../hooks/useViewportFit'
import { haptic } from '../lib/haptics'
import { eggFor } from '../lib/eggs'
import { formatBRL } from '../lib/money'
import { sound } from '../lib/sound'
import type { Item } from '../lib/types'
import { AppHeader } from './AppHeader'
import { Avatar } from './Avatar'
import { Composer } from './Composer'
import { AmountPrompt } from './AmountPrompt'
import { CompleteOverlay } from './CompleteOverlay'
import { HoldButton } from './HoldButton'
import { ItemRow } from './ItemRow'
import { Skeleton } from './Skeleton'
import { Toss } from './Toss'

interface Props {
  store: ItemsStore
  me: string
  presence: Presence
  onOpenMenu: () => void
  /** lança o valor da compra nas contas do mês; ausente no modo demonstração */
  onRegisterMarket?: (amountCents: number) => void
}

export function ListScreen({ store, me, presence, onOpenMenu, onRegisterMarket }: Props) {
  const {
    items,
    arrivals,
    ready,
    connection,
    error,
    clearError,
    add,
    toggle,
    remove,
    restore,
    finishShopping,
  } = store
  const [openId, setOpenId] = useState<string | null>(null)
  const [celebrating, setCelebrating] = useState(false)
  const [egg, setEgg] = useState<{ id: number; emoji: string } | null>(null)
  const [reactTo, setReactTo] = useState<Item | null>(null)
  const [askAmount, setAskAmount] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [deleted, setDeleted] = useState<Item | null>(null)
  const scroller = useRef<HTMLDivElement>(null)
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const nearBottom = useRef(true)
  // só a primeira leva entra em cascata; depois disso cada item entra sozinho
  const firstPaint = useRef(true)

  const pending = items
    .filter((i) => i.status === 'pendente')
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
  const picked = items
    .filter((i) => i.status === 'pegado')
    .sort((a, b) => (a.picked_at ?? '').localeCompare(b.picked_at ?? ''))
  const allPicked = items.length > 0 && pending.length === 0

  const scrollToEnd = useCallback((behavior: ScrollBehavior = 'smooth') => {
    requestAnimationFrame(() => {
      const el = scroller.current
      if (el) el.scrollTo({ top: el.scrollHeight, behavior })
    })
  }, [])

  // quando o teclado abre, a área visível encolhe: se você já estava no fim da lista,
  // continua vendo o fim da lista (os últimos itens adicionados)
  const keepAnchored = useCallback(() => {
    if (nearBottom.current) scrollToEnd('auto')
  }, [scrollToEnd])
  useViewportFit(keepAnchored)

  // Momento 3: só dispara na virada, nunca ao abrir o app com a lista já toda pegada.
  const wasAllPicked = useRef<boolean | null>(null)
  useEffect(() => {
    const previous = wasAllPicked.current
    wasAllPicked.current = allPicked
    if (!ready || previous === null || previous || !allPicked) return

    sound.complete()
    haptic('success')
    setCelebrating(true)
    const timer = setTimeout(() => setCelebrating(false), 1900)
    return () => clearTimeout(timer)
  }, [allPicked, ready])

  useEffect(() => {
    if (!ready) return
    const timer = setTimeout(() => {
      firstPaint.current = false
    }, 700)
    return () => clearTimeout(timer)
  }, [ready])

  const handleAdd = (name: string, quantity: string | null) => {
    add(name, quantity)
    const found = eggFor(name)
    if (found) setEgg({ id: Date.now(), emoji: found.emoji })
    sound.add()
    haptic('light')
    scrollToEnd()
  }

  const handleToggle = (item: Item) => {
    if (item.status === 'pendente') {
      sound.pick()
      haptic('medium')
    } else {
      sound.undo()
      haptic('light')
    }
    toggle(item)
  }

  const handleRemove = (item: Item) => {
    setOpenId(null)
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

  return (
    <div className="app">
      <AppHeader title="despensa" presence={presence} onOpenMenu={onOpenMenu} />

      {items.length > 0 && (
        <div className="progress" aria-hidden>
          <motion.span
            initial={false}
            animate={{ scaleX: picked.length / items.length }}
            transition={{ type: 'spring', stiffness: 260, damping: 34 }}
          />
        </div>
      )}

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
        className="scroll"
        ref={scroller}
        onPointerDown={() => setOpenId(null)}
        onScroll={(e) => {
          const el = e.currentTarget
          nearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80
        }}
      >
        {!ready && <Skeleton />}

        {ready && items.length === 0 && (
          <motion.div className="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="empty-cats" aria-hidden>
              <motion.span
                initial={{ x: 12, rotate: 8, opacity: 0 }}
                animate={{ x: 0, rotate: -4, opacity: 1, y: [0, -5, 0] }}
                transition={{
                  x: { type: 'spring', stiffness: 220, damping: 18, delay: 0.1 },
                  rotate: { type: 'spring', stiffness: 220, damping: 18, delay: 0.1 },
                  opacity: { duration: 0.4, delay: 0.1 },
                  y: { duration: 3.6, repeat: Infinity, ease: 'easeInOut', delay: 0.6 },
                }}
              >
                <Avatar person="Bela" size={92} variant="full" />
              </motion.span>
              <motion.span
                initial={{ x: -12, rotate: -8, opacity: 0 }}
                animate={{ x: 0, rotate: 5, opacity: 1, y: [0, -5, 0] }}
                transition={{
                  x: { type: 'spring', stiffness: 220, damping: 18, delay: 0.2 },
                  rotate: { type: 'spring', stiffness: 220, damping: 18, delay: 0.2 },
                  opacity: { duration: 0.4, delay: 0.2 },
                  y: { duration: 3.6, repeat: Infinity, ease: 'easeInOut', delay: 1.4 },
                }}
              >
                <Avatar person="Lucas" size={92} variant="full" />
              </motion.span>
            </div>
            <p className="empty-title">Lista vazia</p>
            <p className="empty-hint">Digite aí embaixo. Dá para incluir a quantidade: “2 leite”.</p>
          </motion.div>
        )}

        <ul className="list">
          <AnimatePresence initial={false} mode="popLayout">
            {pending.map((item, index) => (
              <ItemRow
                key={item.id}
                item={item}
                me={me}
                open={openId === item.id}
                fresh={arrivals.includes(item.id)}
                enterDelay={firstPaint.current ? index * 0.035 : 0}
                exitDelay={0}
                onOpenChange={(open) => setOpenId(open ? item.id : null)}
                onToggle={handleToggle}
                onRemove={handleRemove}
                onLongPress={setReactTo}
              />
            ))}

            {picked.length > 0 && (
              <motion.li
                key="divider"
                layout="position"
                className="divider"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                No carrinho · {picked.length}
              </motion.li>
            )}

            {picked.map((item, index) => (
              <ItemRow
                key={item.id}
                item={item}
                me={me}
                open={openId === item.id}
                fresh={arrivals.includes(item.id)}
                enterDelay={firstPaint.current ? (pending.length + index) * 0.035 : 0}
                exitDelay={index * 0.035}
                onOpenChange={(open) => setOpenId(open ? item.id : null)}
                onToggle={handleToggle}
                onRemove={handleRemove}
                onLongPress={setReactTo}
              />
            ))}
          </AnimatePresence>
        </ul>

        <AnimatePresence>
          {picked.length > 0 && (
            <motion.div
              className="finish"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
            >
              <HoldButton
                label="Segure para finalizar"
                onComplete={() => {
                  haptic('success')
                  sound.complete()
                  finishShopping()
                  if (onRegisterMarket) setAskAmount(true)
                }}
              />
              <span className="finish-note">
                {allPicked ? 'a lista vai para o histórico' : 'os pendentes ficam para a próxima'}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="dock">
        <AnimatePresence>
          {reactTo && (
            <motion.div
              className="reaction-picker"
              initial={{ opacity: 0, y: 14, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 14, scale: 0.94 }}
              transition={{ type: 'spring', stiffness: 460, damping: 32 }}
            >
              <span className="reaction-about">{reactTo.name}</span>
              <div className="reaction-emojis">
                {['❤️', '😂', '👍', '🔥', '😮', '🙏'].map((emoji, i) => (
                  <motion.button
                    key={emoji}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.03 * i, type: 'spring', stiffness: 520, damping: 30 }}
                    whileTap={{ scale: 0.86 }}
                    onClick={() => {
                      presence.sendReaction(emoji, reactTo.name)
                      haptic('light')
                      setReactTo(null)
                    }}
                  >
                    {emoji}
                  </motion.button>
                ))}
              </div>
              <button className="reaction-close" onClick={() => setReactTo(null)}>
                fechar
              </button>
            </motion.div>
          )}
          {notice && (
            <motion.div
              className="toast"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ type: 'spring', stiffness: 520, damping: 38 }}
            >
              <span>{notice}</span>
            </motion.div>
          )}
          {deleted && (
            <motion.div
              className="toast"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ type: 'spring', stiffness: 520, damping: 38 }}
            >
              <span>{deleted.name} apagado</span>
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
              transition={{ type: 'spring', stiffness: 500, damping: 36 }}
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
      <AnimatePresence>
        {egg && <Toss key={egg.id} emoji={egg.emoji} onDone={() => setEgg(null)} />}
      </AnimatePresence>
      <CompleteOverlay show={celebrating} />
    </div>
  )
}
