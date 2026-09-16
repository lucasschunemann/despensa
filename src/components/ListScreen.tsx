import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { ItemsStore } from '../hooks/useItems'
import { useViewportFit } from '../hooks/useViewportFit'
import { haptic } from '../lib/haptics'
import { prefs, useSoundOn } from '../lib/prefs'
import { sound } from '../lib/sound'
import type { Item } from '../lib/types'
import { Avatar } from './Avatar'
import { Composer } from './Composer'
import { CompleteOverlay } from './CompleteOverlay'
import { HoldButton } from './HoldButton'
import { ItemRow } from './ItemRow'
import { Skeleton } from './Skeleton'

interface Props {
  store: ItemsStore
  me: string
  onSwitchPerson: () => void
}

export function ListScreen({ store, me, onSwitchPerson }: Props) {
  const { items, ready, connection, error, clearError, add, toggle, remove, restore, finishShopping } =
    store
  const [openId, setOpenId] = useState<string | null>(null)
  const [celebrating, setCelebrating] = useState(false)
  const [pulse, setPulse] = useState(0)
  const [deleted, setDeleted] = useState<Item | null>(null)
  const scroller = useRef<HTMLDivElement>(null)
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const soundOn = useSoundOn()
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
    sound.add()
    haptic('light')
    scrollToEnd()
  }

  const handleToggle = (item: Item) => {
    if (item.status === 'pendente') {
      sound.pick()
      haptic('medium')
      setPulse((n) => n + 1)
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
      <header className="header">
        <h1 className="wordmark">despensa</h1>
        <div className="header-actions">
          <button
            className="icon-button"
            aria-pressed={soundOn}
            aria-label={soundOn ? 'Desligar som' : 'Ligar som'}
            onClick={() => {
              const next = !soundOn
              prefs.setSoundOn(next)
              if (next) {
                sound.unlock()
                sound.pick()
              }
              haptic('light')
            }}
          >
            {soundOn ? <SpeakerOn /> : <SpeakerOff />}
          </button>
          <button className="chip" onClick={onSwitchPerson}>
            <motion.span
              key={pulse}
              className="chip-avatar"
              animate={{ scale: pulse === 0 ? 1 : [1, 1.22, 0.96, 1] }}
              transition={{ duration: 0.42, ease: 'easeOut' }}
            >
              <Avatar person={me} size={22} />
            </motion.span>
            {me}
          </button>
        </div>
      </header>

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
                enterDelay={firstPaint.current ? index * 0.035 : 0}
                exitDelay={0}
                onOpenChange={(open) => setOpenId(open ? item.id : null)}
                onToggle={handleToggle}
                onRemove={handleRemove}
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
                enterDelay={firstPaint.current ? (pending.length + index) * 0.035 : 0}
                exitDelay={index * 0.035}
                onOpenChange={(open) => setOpenId(open ? item.id : null)}
                onToggle={handleToggle}
                onRemove={handleRemove}
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
        <Composer onAdd={handleAdd} onFocus={() => scrollToEnd()} />
      </div>
      <CompleteOverlay show={celebrating} />
    </div>
  )
}

function SpeakerOn() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path d="M11 5 6.5 9H3v6h3.5L11 19V5Z" />
      <path d="M15.5 9.5a3.5 3.5 0 0 1 0 5M18.5 7a7 7 0 0 1 0 10" />
    </svg>
  )
}

function SpeakerOff() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path d="M11 5 6.5 9H3v6h3.5L11 19V5Z" />
      <path d="M16 10l4 4M20 10l-4 4" />
    </svg>
  )
}
