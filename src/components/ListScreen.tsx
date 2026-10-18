import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useCallback, useContext, useEffect, useRef, useState } from 'react'
import type { ItemsStore } from '../hooks/useItems'
import { useViewportFit } from '../hooks/useViewportFit'
import { eggFor } from '../lib/eggs'
import { haptic } from '../lib/haptics'
import { formatBRL, toCents } from '../lib/money'
import { parseEntry } from '../lib/parse'
import { productEmoji } from '../lib/products'
import { sound } from '../lib/sound'
import type { Item } from '../lib/types'
import { Avatar } from './Avatar'
import { Rolling } from './Rolling'
import { Toss } from './Toss'
import { Check, Composer, Dock, Done, Empty, Icon, Screen, Shell, Sheet, Skeleton, SwipeRow, Toast } from './ui'

interface Props {
  store: ItemsStore
  me: string
  /** lança o valor da compra nas contas do mês; ausente no modo demonstração */
  onRegisterMarket?: (amountCents: number) => void
}

const REACTIONS = ['❤️', '😂', '👍', '🔥', '😮', '🙏']

const normalize = (value: string) => value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/** O emoji do produto (dicionário local) ou a inicial, quando a palavra não está lá. */
function ProductMark({ name }: { name: string }) {
  const emoji = productEmoji(name)
  return <span className={emoji ? 'product-mark' : 'product-mark is-initial'} aria-hidden>{emoji ?? name.charAt(0).toUpperCase()}</span>
}

export function ListScreen({ store, me, onRegisterMarket }: Props) {
  const { items, arrivals, ready, error, clearError, add, toggle, edit, remove, restore, finishShopping } = store
  const shell = useContext(Shell)
  const reduced = useReducedMotion()

  const [text, setText] = useState('')
  const [search, setSearch] = useState('')
  const [celebrating, setCelebrating] = useState(false)
  const [egg, setEgg] = useState<{ id: number; emoji: string } | null>(null)
  const [editing, setEditing] = useState<Item | null>(null)
  const [finishing, setFinishing] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [deleted, setDeleted] = useState<Item | null>(null)
  const [cartOpen, setCartOpen] = useState(false)
  const scroller = useRef<HTMLDivElement>(null)
  // começa falso: ao abrir, a lista aparece do começo; só acompanha o fim depois de rolar até lá
  const nearBottom = useRef(false)

  const onShelf = items.filter((i) => i.status === 'pendente').sort((a, b) => a.created_at.localeCompare(b.created_at))
  const inCart = items.filter((i) => i.status === 'pegado').sort((a, b) => (a.picked_at ?? '').localeCompare(b.picked_at ?? ''))
  const visible = onShelf.filter((item) => normalize(item.name).includes(normalize(search.trim())))
  const allPicked = items.length > 0 && onShelf.length === 0
  const entry = parseEntry(text)

  const scrollToEnd = useCallback((behavior: ScrollBehavior = 'smooth') => {
    requestAnimationFrame(() => {
      const el = scroller.current
      if (el) el.scrollTo({ top: el.scrollHeight, behavior })
    })
  }, [])
  useViewportFit(useCallback(() => { if (nearBottom.current) scrollToEnd('auto') }, [scrollToEnd]))

  // "tudo no carrinho" só na virada, nunca ao abrir com tudo já pego
  const wasAllPicked = useRef<boolean | null>(null)
  useEffect(() => {
    const previous = wasAllPicked.current
    wasAllPicked.current = allPicked
    if (!ready || previous === null || previous || !allPicked) return
    const start = setTimeout(() => { sound.complete(); haptic('success'); setCelebrating(true) }, 500)
    const stop = setTimeout(() => setCelebrating(false), 2200)
    return () => { clearTimeout(start); clearTimeout(stop) }
  }, [allPicked, ready])

  const handleAdd = () => {
    if (!entry) return
    add(entry.name, entry.quantity)
    const found = eggFor(entry.name)
    if (found) setEgg({ id: Date.now(), emoji: found.emoji })
    sound.add()
    haptic('light')
    setText('')
    scrollToEnd()
  }

  const handlePick = (item: Item) => {
    sound.pick()
    haptic('medium')
    toggle(item)
  }

  const handleReturn = (item: Item) => {
    sound.undo()
    haptic('light')
    toggle(item)
  }

  const handleRemove = (item: Item) => {
    setEditing(null)
    sound.undo()
    haptic('medium')
    remove(item)
    setDeleted(item)
  }

  const subtitle = !ready
    ? undefined
    : items.length === 0
      ? undefined
      : allPicked
        ? 'tudo no carrinho'
        : <><Rolling value={inCart.length} /> de {items.length} no carrinho</>

  return (
    <Screen
      title="mercado"
      subtitle={subtitle}
      scrollRef={scroller}
      onScroll={(el) => { nearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80 }}
      footer={
        <Dock
          toasts={<>
            {notice && <Toast key="notice" duration={4000} onDismiss={() => setNotice(null)}>{notice}</Toast>}
            {deleted && (
              <Toast key="deleted" duration={5000} action={{ label: 'desfazer', onClick: () => { haptic('light'); restore(deleted); setDeleted(null) } }} onDismiss={() => setDeleted(null)}>
                {deleted.name} apagado
              </Toast>
            )}
          </>}
        >
          <AnimatePresence>
            {shell?.presence.typing && (
              <motion.p className="typing" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }}>
                <Avatar person={shell.presence.typing} size={18} />
                {shell.presence.typing} está escrevendo
              </motion.p>
            )}
          </AnimatePresence>
          <Composer
            value={text}
            onChange={(value) => { setText(value); if (value.trim()) shell?.presence.notifyTyping() }}
            onSubmit={handleAdd}
            canSubmit={Boolean(entry)}
            placeholder="o que está faltando?"
            label="Novo item"
            onFocus={() => scrollToEnd()}
            chip={entry && (productEmoji(entry.name) || entry.quantity) ? <>{productEmoji(entry.name)}{entry.quantity ? ` ${entry.quantity}` : ''}</> : null}
          />
        </Dock>
      }
    >
      {ready && items.length > 0 && (
        <div className="market-tools">
          <div className="meter" role="progressbar" aria-label="Itens no carrinho" aria-valuemin={0} aria-valuemax={items.length} aria-valuenow={inCart.length}>
            <motion.span animate={{ scaleX: inCart.length / items.length }} transition={{ duration: reduced ? 0 : 0.35 }} />
          </div>
          {(items.length > 5 || search) && (
            <label className="search">
              <Icon name="search" size={16} />
              <input type="search" aria-label="Buscar na lista" placeholder="buscar" value={search} onChange={(e) => setSearch(e.target.value)} />
            </label>
          )}
        </div>
      )}

      {error && <button className="banner" onClick={clearError}>{error}</button>}

      {!ready && <Skeleton />}
      {ready && items.length === 0 && <Empty title="nada faltando" hint="escreva abaixo. a quantidade pode vir junto: “2 leite”." />}
      {search && visible.length === 0 && (
        <p className="search-empty" role="status">nada pendente com “{search}”. <button onClick={() => setSearch('')}>ver toda a lista</button></p>
      )}

      <ul className="list">
        <AnimatePresence initial={false} mode="popLayout">
          {visible.map((item) => (
            <MarketRow key={item.id} item={item} me={me} fresh={arrivals.includes(item.id)} onPick={handlePick} onEdit={setEditing} onRemove={handleRemove} />
          ))}
        </AnimatePresence>
      </ul>

      {inCart.length > 0 && (
        <section className="cart">
          <button className="cart-head" onClick={() => setCartOpen((v) => !v)} aria-expanded={cartOpen}>
            <Icon name="right" size={14} className={`cart-caret${cartOpen ? ' is-open' : ''}`} />
            <span>no carrinho</span>
            <span className="cart-count"><Rolling value={inCart.length} /></span>
          </button>
          <AnimatePresence initial={false}>
            {cartOpen && (
              <motion.ul className="list cart-items" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ type: 'spring', stiffness: 420, damping: 40 }}>
                {inCart.map((item) => (
                  <li key={item.id} className="item is-done">
                    <ProductMark name={item.name} />
                    <span className="item-text"><span className="item-name">{item.name}</span></span>
                    <Check checked onClick={() => handleReturn(item)} label={`Devolver ${item.name} à lista`} />
                  </li>
                ))}
              </motion.ul>
            )}
          </AnimatePresence>
          <button className="btn btn-tinted cart-finish" onClick={() => { haptic('light'); setFinishing(true) }}>
            finalizar compra
          </button>
        </section>
      )}

      <EditItemSheet
        item={editing}
        onClose={() => setEditing(null)}
        onSave={(item, name, quantity) => { edit(item, name, quantity); sound.pick(); setEditing(null) }}
        onRemove={handleRemove}
        onReact={(emoji, item) => { shell?.presence.sendReaction(emoji, item.name); haptic('light'); setEditing(null) }}
      />

      <FinishSheet
        open={finishing}
        picked={inCart.length}
        pending={onShelf.length}
        canRegister={Boolean(onRegisterMarket)}
        onClose={() => setFinishing(false)}
        onConfirm={(cents) => {
          sound.complete()
          haptic('success')
          finishShopping()
          setFinishing(false)
          if (cents && onRegisterMarket) {
            onRegisterMarket(cents)
            setNotice(`${formatBRL(cents)} lançado nas contas do mês`)
          }
        }}
      />

      <AnimatePresence>{egg && <Toss key={egg.id} emoji={egg.emoji} onDone={() => setEgg(null)} />}</AnimatePresence>
      <Done show={celebrating} label="tudo no carrinho" />
    </Screen>
  )
}

function MarketRow({ item, me, fresh, onPick, onEdit, onRemove }: { item: Item; me: string; fresh: boolean; onPick: (item: Item) => void; onEdit: (item: Item) => void; onRemove: (item: Item) => void }) {
  const reduced = useReducedMotion()
  const [checking, setChecking] = useState(false)
  // o check desenha primeiro; só então o item sai da lista
  const pick = () => {
    if (checking) return
    setChecking(true)
    setTimeout(() => onPick(item), reduced ? 0 : 220)
  }
  return (
    <SwipeRow className={fresh ? 'is-fresh' : ''} lead={{ label: 'pegar', onTrigger: pick }} onRemove={() => onRemove(item)} onPress={() => onEdit(item)}>
      <div className="item">
        <ProductMark name={item.name} />
        <span className="item-text">
          <span className={`item-name${checking ? ' is-struck' : ''}`}>{item.name}</span>
          {(item.quantity || item.added_by !== me) && (
            <span className="item-meta">
              {item.quantity && <span>{item.quantity}</span>}
              {item.added_by !== me && <Avatar person={item.added_by} size={15} />}
            </span>
          )}
        </span>
        <Check checked={checking} onClick={pick} label={`Pegar ${item.name}`} />
      </div>
    </SwipeRow>
  )
}

function EditItemSheet({ item, onClose, onSave, onRemove, onReact }: { item: Item | null; onClose: () => void; onSave: (item: Item, name: string, quantity: string | null) => void; onRemove: (item: Item) => void; onReact: (emoji: string, item: Item) => void }) {
  const [text, setText] = useState('')
  const [last, setLast] = useState<Item | null>(null)
  useEffect(() => {
    if (item) { setLast(item); setText(`${item.quantity ? `${item.quantity} ` : ''}${item.name}`) }
  }, [item])
  const current = item ?? last
  const understood = parseEntry(text)
  return (
    <Sheet open={Boolean(item)} onClose={onClose} title="editar item">
      {current && (
        <form className="sheet-form" onSubmit={(e) => { e.preventDefault(); if (understood) onSave(current, understood.name, understood.quantity) }}>
          <input className="field" data-autofocus value={text} onChange={(e) => setText(e.target.value)} aria-label="Editar item" autoComplete="off" enterKeyHint="done" />
          <p className="field-hint">{understood ? `${understood.name}${understood.quantity ? ` · ${understood.quantity}` : ''}` : 'escreva o nome'}</p>
          <button type="submit" className="btn btn-primary" disabled={!understood}>salvar</button>
          <div className="reactions" role="group" aria-label="Enviar uma reação">
            {REACTIONS.map((emoji) => (
              <button type="button" key={emoji} onClick={() => onReact(emoji, current)} aria-label={`Enviar ${emoji}`}>{emoji}</button>
            ))}
          </div>
          <button type="button" className="btn btn-plain is-danger" onClick={() => onRemove(current)}>apagar item</button>
        </form>
      )}
    </Sheet>
  )
}

function FinishSheet({ open, picked, pending, canRegister, onClose, onConfirm }: { open: boolean; picked: number; pending: number; canRegister: boolean; onClose: () => void; onConfirm: (cents: number | null) => void }) {
  const [amount, setAmount] = useState('')
  useEffect(() => { if (open) setAmount('') }, [open])
  const cents = amount.trim() ? toCents(amount.trim().replace(/^r\$\s*/i, '')) : 0
  const valid = Number.isFinite(cents) && cents > 0
  return (
    <Sheet open={open} onClose={onClose} title="finalizar compra">
      <form className="sheet-form" onSubmit={(e) => { e.preventDefault(); onConfirm(valid ? cents : null) }}>
        <p className="sheet-text">
          {picked} {picked === 1 ? 'item pego' : 'itens pegos'} saem da lista.
          {pending > 0 ? ` ${pending} ${pending === 1 ? 'fica' : 'ficam'} para a próxima.` : ''}
        </p>
        {canRegister && (
          <>
            <label className="field-label" htmlFor="market-total">quanto deu?</label>
            <div className="field-money">
              <span>R$</span>
              <input id="market-total" className="field" data-autofocus value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0,00" inputMode="decimal" aria-label="Valor" />
            </div>
            <p className="field-hint">{valid ? `entra nas contas do mês como “Mercado”, ${formatBRL(cents)}, já paga` : 'opcional. entra nas contas do mês, já paga.'}</p>
          </>
        )}
        <button type="submit" className="btn btn-primary">finalizar</button>
      </form>
    </Sheet>
  )
}
