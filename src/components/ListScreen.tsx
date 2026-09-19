import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { ItemsStore } from '../hooks/useItems'
import type { Presence } from '../hooks/usePresence'
import { useViewportFit } from '../hooks/useViewportFit'
import { eggFor } from '../lib/eggs'
import { haptic } from '../lib/haptics'
import { formatBRL } from '../lib/money'
import { parseEntry } from '../lib/parse'
import { productEmoji } from '../lib/products'
import { sound } from '../lib/sound'
import type { Item } from '../lib/types'
import { AmountPrompt } from './AmountPrompt'
import { AppHeader } from './AppHeader'
import { Avatar } from './Avatar'
import { CompleteOverlay } from './CompleteOverlay'
import { Composer } from './Composer'
import { CloseIcon } from './ControlIcons'
import { EditCard } from './EditCard'
import { CartIcon, CartSection, MarketRow, ProductMark } from './Market'
import { Rolling } from './Rolling'
import { Skeleton } from './Skeleton'
import { Toast } from './Toast'
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
  const { items, arrivals, ready, error, clearError, add, toggle, edit, remove, restore, finishShopping } =
    store
  const reduced = useReducedMotion()

  const [celebrating, setCelebrating] = useState(false)
  const [egg, setEgg] = useState<{ id: number; emoji: string } | null>(null)
  const [actionsFor, setActionsFor] = useState<Item | null>(null)
  const [editing, setEditing] = useState<Item | null>(null)
  const [askAmount, setAskAmount] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [deleted, setDeleted] = useState<Item | null>(null)
  const [flights, setFlights] = useState<Flight[]>([])
  const [cartBump, setCartBump] = useState(0)
  const [rolling, setRolling] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)

  const scroller = useRef<HTMLDivElement>(null)
  const [scrolled, setScrolled] = useState(false)
  const [search, setSearch] = useState('')
  const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  const cart = useRef<HTMLSpanElement>(null)
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // começa falso: ao abrir, a lista aparece do começo; só acompanha o fim depois de rolar até lá
  const nearBottom = useRef(false)
  // o que já estava na lista ao abrir entra em cascata; o que chega depois tem o emoji pulando
  const known = useRef<Set<string> | null>(null)

  const onShelf = items
    .filter((i) => i.status === 'pendente')
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
  const inCart = items
    .filter((i) => i.status === 'pegado')
    .sort((a, b) => (a.picked_at ?? '').localeCompare(b.picked_at ?? ''))
  const visibleShelf = onShelf.filter((item) => normalize(item.name).includes(normalize(search.trim())))
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
    sound.add()
    haptic('light')
    scrollToEnd()
  }

  // pegar: o emoji sai da linha e voa até o carrinho do topo
  const handlePick = (item: Item, from: DOMRect) => {
    setOpenId(null)
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
        scrolled={scrolled}
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
              <Rolling value={inCart.length} />/{items.length}
            </b>
          </motion.span>
        }
      />

      {ready && items.length > 0 && <div className="market-overview">
        <div className="market-overview-label"><span>{allPicked ? 'pronto para passar no caixa' : `${onShelf.length} ${onShelf.length === 1 ? 'item para pegar' : 'itens para pegar'}`}</span><span>{Math.round(inCart.length / items.length * 100)}%</span></div>
        <div className="market-meter" role="progressbar" aria-label="Itens no carrinho" aria-valuemin={0} aria-valuemax={items.length} aria-valuenow={inCart.length}><motion.span animate={{ scaleX: inCart.length / items.length }} transition={{ duration: reduced ? 0 : 0.35 }} /></div>
        {(items.length > 5 || search) && <div className="market-search"><svg viewBox="0 0 24 24" aria-hidden><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/></svg><input type="search" aria-label="Buscar na lista" placeholder="encontrar na lista" value={search} onChange={(e) => setSearch(e.target.value)} />{search && <button className="round-control" aria-label="Limpar busca" onClick={() => setSearch('')}><CloseIcon size={17} /></button>}</div>}
      </div>}

      <AnimatePresence>
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
        onPointerDown={() => setOpenId(null)}
        ref={scroller}
        onScroll={(e) => {
          const el = e.currentTarget
          setScrolled(el.scrollTop > 6)
          nearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80
        }}
      >
        {!ready && <Skeleton variant="market" />}

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
                <Avatar person="Bela" size={88} variant="full" />
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
                <Avatar person="Lucas" size={88} variant="full" />
              </motion.span>
            </div>
            <p className="empty-title">nada faltando</p>
            <p className="empty-hint">escreva aí embaixo. dá para pôr a quantidade junto: “2 leite”.</p>
          </motion.div>
        )}

        {search && visibleShelf.length === 0 && <p className="search-empty" role="status">nada pendente com “{search}”.<button onClick={() => setSearch('')}>ver toda a lista</button></p>}
        <ul className="mlist">
          <AnimatePresence initial={false} mode="popLayout">
            {visibleShelf.map((item, index) => (
              <MarketRow
                key={item.id}
                item={item}
                me={me}
                open={openId === item.id}
                fresh={arrivals.includes(item.id)}
                arriving={Boolean(known.current && !known.current.has(item.id))}
                divider={index > 0}
                enterDelay={index * 0.035}
                onOpenChange={(open) => setOpenId(open ? item.id : null)}
                onPick={handlePick}
                onRemove={handleRemove}
                onLongPress={setActionsFor}
              />
            ))}
          </AnimatePresence>
        </ul>

        <AnimatePresence>
          {inCart.length > 0 && (
            <CartSection
              key="cart"
              items={inCart}
              total={items.length}
              rolling={rolling}
              allPicked={allPicked}
              onReturn={handleReturn}
              onFinish={handleFinish}
            />
          )}
        </AnimatePresence>
      </div>

      <div className="dock">
        <AnimatePresence>
          {editing && (
            <EditCard
              key={`edit-${editing.id}`}
              title="editar item"
              initial={`${editing.quantity ? `${editing.quantity} ` : ''}${editing.name}`}
              preview={(text) => {
                const entry = parseEntry(text)
                if (!entry) return null
                return (
                  <>
                    <ProductMark name={entry.name} size={14} /> {entry.name}
                    {entry.quantity ? ` · ${entry.quantity}` : ''}
                  </>
                )
              }}
              actions={[
                {
                  label: 'salvar',
                  onSave: (text) => {
                    const entry = parseEntry(text)
                    if (!entry) return
                    edit(editing, entry.name, entry.quantity)
                    sound.pick()
                    setEditing(null)
                  },
                },
              ]}
              onClose={() => setEditing(null)}
            />
          )}
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
                <button
                  className="action-edit"
                  onClick={() => {
                    setEditing(actionsFor)
                    setActionsFor(null)
                  }}
                >
                  editar
                </button>
                <button className="action-delete" onClick={() => handleRemove(actionsFor)}>
                  apagar item
                </button>
              </div>
            </motion.div>
          )}
          {notice && (
            <Toast key="notice" onDismiss={() => setNotice(null)}>
              {notice}
            </Toast>
          )}
          {deleted && (
            <Toast
              key="deleted"
              duration={5000}
              action={{ label: 'desfazer', onClick: handleUndo }}
              onDismiss={() => setDeleted(null)}
            >
              {deleted.name} apagado
            </Toast>
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
              question="quanto deu no mercado?"
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

        {/* com o cartão de edição aberto, um campo só na tela */}
        {!editing && <Composer onAdd={handleAdd} onFocus={() => scrollToEnd()} onTyping={presence.notifyTyping} />}
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
