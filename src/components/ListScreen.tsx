import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useKeyboardInset } from '../hooks/useKeyboardInset'
import type { ItemsStore } from '../hooks/useItems'
import { haptic } from '../lib/haptics'
import { prefs, useSoundOn } from '../lib/prefs'
import { sound } from '../lib/sound'
import type { Item } from '../lib/types'
import { Composer } from './Composer'
import { CompleteOverlay } from './CompleteOverlay'
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
  const [deleted, setDeleted] = useState<Item | null>(null)
  const scroller = useRef<HTMLDivElement>(null)
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const soundOn = useSoundOn()
  const keyboard = useKeyboardInset()

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
        <h1>Despensa</h1>
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
            {me}
          </button>
        </div>
      </header>

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
        style={keyboard ? { paddingBottom: keyboard + 16 } : undefined}
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
            {pending.map((item) => (
              <ItemRow
                key={item.id}
                item={item}
                me={me}
                open={openId === item.id}
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
              <button
                className={allPicked ? 'button-primary' : 'button-quiet'}
                onClick={() => {
                  haptic('light')
                  finishShopping()
                }}
              >
                Finalizar compra
              </button>
              {!allPicked && <span className="finish-note">os pendentes ficam para a próxima</span>}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <motion.div
        className="dock"
        animate={{ y: -keyboard }}
        transition={{ type: 'spring', stiffness: 700, damping: 46 }}
      >
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
      </motion.div>
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
