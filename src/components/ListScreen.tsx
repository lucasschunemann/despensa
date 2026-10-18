import { AnimatePresence, useReducedMotion } from 'motion/react'
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
import { Accessory, Check, Composer, Done, Empty, Glyph, Icon, Row, Screen, Section, Shell, Sheet, Skeleton, SwipeRow, Toast, Typing } from './ui'

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
  return emoji ? <span className="item-emoji" aria-hidden>{emoji}</span> : <span className="item-initial" aria-hidden>{name.charAt(0).toUpperCase()}</span>
}

export function ListScreen({ store, me, onRegisterMarket }: Props) {
  const { items, arrivals, ready, error, clearError, add, toggle, edit, remove, restore, finishShopping } = store
  const shell = useContext(Shell)

  const [text, setText] = useState('')
  const [search, setSearch] = useState('')
  const [celebrating, setCelebrating] = useState(false)
  const [egg, setEgg] = useState<{ id: number; emoji: string } | null>(null)
  const [editing, setEditing] = useState<Item | null>(null)
  const [finishing, setFinishing] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [deleted, setDeleted] = useState<Item | null>(null)
  const [showDone, setShowDone] = useState(false)
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
    const start = setTimeout(() => { sound.complete(); haptic('success'); setCelebrating(true) }, 450)
    const stop = setTimeout(() => setCelebrating(false), 2000)
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

  return (
    <Screen
      title="Mercado"
      plain
      tint="green"
      scrollRef={scroller}
      onScroll={(el) => { nearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80 }}
      accessory={
        <Accessory
          toasts={<>
            {notice && <Toast key="notice" duration={4000} onDismiss={() => setNotice(null)}>{notice}</Toast>}
            {deleted && (
              <Toast key="deleted" duration={5000} action={{ label: 'Desfazer', onClick: () => { haptic('light'); restore(deleted); setDeleted(null) } }} onDismiss={() => setDeleted(null)}>
                {deleted.name} apagado
              </Toast>
            )}
          </>}
          above={shell?.presence.typing ? <Typing key="typing" person={shell.presence.typing} /> : null}
        >
          <Composer
            value={text}
            onChange={(value) => { setText(value); if (value.trim()) shell?.presence.notifyTyping() }}
            onSubmit={handleAdd}
            canSubmit={Boolean(entry)}
            placeholder="O que está faltando?"
            label="Novo item"
            onFocus={() => scrollToEnd()}
            chip={entry && (productEmoji(entry.name) || entry.quantity) ? [productEmoji(entry.name), entry.quantity].filter(Boolean).join(' ') : null}
          />
        </Accessory>
      }
    >
      {ready && items.length > 5 && (
        <label className="search-field">
          <Icon name="search" size={17} weight={2.2} />
          <input type="search" aria-label="Buscar na lista" placeholder="Buscar" value={search} onChange={(e) => setSearch(e.target.value)} />
          {search && <button type="button" aria-label="Limpar busca" onClick={() => setSearch('')}><Icon name="close" size={14} weight={2.6} /></button>}
        </label>
      )}

      {ready && inCart.length > 0 && (
        <div className="done-line">
          <span><Rolling value={inCart.length} /> no carrinho</span>
          <span className="dot" aria-hidden>•</span>
          <button type="button" onClick={() => { haptic('light'); setFinishing(true) }}>Finalizar compra</button>
          <button type="button" className="show" onClick={() => setShowDone((v) => !v)} aria-expanded={showDone}>{showDone ? 'Ocultar' : 'Mostrar'}</button>
        </div>
      )}

      {error && <button className="banner" onClick={clearError}>{error}</button>}

      {!ready && <Skeleton />}
      {ready && items.length === 0 && <Empty icon={<Glyph name="cart" size={56} />} title="Nada faltando" hint="Escreva abaixo. A quantidade pode vir junto: “2 leite”." />}
      {ready && allPicked && !showDone && <Empty icon={<Glyph name="check" size={56} />} title="Tudo no carrinho" hint="Finalize a compra quando passar no caixa." />}
      {search && visible.length === 0 && (
        <p className="search-empty" role="status">Nada pendente com “{search}”. <button onClick={() => setSearch('')}>Ver a lista toda</button></p>
      )}

      <ul className="list market-list">
        <AnimatePresence initial={false} mode="popLayout">
          {visible.map((item) => (
            <MarketRow key={item.id} item={item} me={me} fresh={arrivals.includes(item.id)} onPick={handlePick} onEdit={setEditing} onRemove={handleRemove} />
          ))}
          {showDone && inCart.map((item) => (
            <SwipeRow key={item.id} onRemove={() => handleRemove(item)} onPress={() => setEditing(item)}>
              <div className="item is-done">
                <Check checked onClick={() => handleReturn(item)} label={`Devolver ${item.name} à lista`} />
                <ProductMark name={item.name} />
                <span className="item-text">
                  <span className="item-name">{item.name}</span>
                  {item.quantity && <span className="item-meta">{item.quantity}</span>}
                </span>
              </div>
            </SwipeRow>
          ))}
        </AnimatePresence>
      </ul>

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
          setShowDone(false)
          if (cents && onRegisterMarket) {
            onRegisterMarket(cents)
            setNotice(`${formatBRL(cents)} lançado nas contas do mês`)
          }
        }}
      />

      <AnimatePresence>{egg && <Toss key={egg.id} emoji={egg.emoji} onDone={() => setEgg(null)} />}</AnimatePresence>
      <Done show={celebrating} label="Tudo no carrinho" />
    </Screen>
  )
}

function MarketRow({ item, me, fresh, onPick, onEdit, onRemove }: { item: Item; me: string; fresh: boolean; onPick: (item: Item) => void; onEdit: (item: Item) => void; onRemove: (item: Item) => void }) {
  const reduced = useReducedMotion()
  const [checking, setChecking] = useState(false)
  // como no Lembretes: o círculo enche, e só então o item sai da lista
  const pick = () => {
    if (checking) return
    setChecking(true)
    setTimeout(() => onPick(item), reduced ? 0 : 420)
  }
  return (
    <SwipeRow className={fresh ? 'is-fresh' : ''} lead={{ label: 'Pegar', onTrigger: pick }} onRemove={() => onRemove(item)} onPress={() => onEdit(item)}>
      <div className={`item${checking ? ' is-done' : ''}`}>
        <Check checked={checking} onClick={pick} label={`Pegar ${item.name}`} />
        <ProductMark name={item.name} />
        <span className="item-text">
          <span className="item-name">{item.name}</span>
          {item.quantity && <span className="item-meta">{item.quantity}</span>}
        </span>
        {item.added_by !== me && <Avatar person={item.added_by} size={22} />}
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
  const save = () => { if (current && understood) onSave(current, understood.name, understood.quantity) }
  return (
    <Sheet open={Boolean(item)} onClose={onClose} title="Editar item" onDone={save} doneDisabled={!understood}>
      {current && (
        <form onSubmit={(e) => { e.preventDefault(); save() }}>
          <Section footer={understood ? `${understood.name}${understood.quantity ? ` · ${understood.quantity}` : ''}` : 'Escreva o nome'}>
            <input className="field" data-autofocus value={text} onChange={(e) => setText(e.target.value)} aria-label="Editar item" autoComplete="off" enterKeyHint="done" />
          </Section>
          <Section header="Reagir">
            <div className="reactions" role="group" aria-label="Enviar uma reação">
              {REACTIONS.map((emoji) => (
                <button type="button" key={emoji} onClick={() => onReact(emoji, current)} aria-label={`Enviar ${emoji}`}>{emoji}</button>
              ))}
            </div>
          </Section>
          <Section>
            <Row title="Apagar item" danger center onClick={() => onRemove(current)} />
          </Section>
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
  const confirm = () => onConfirm(valid ? cents : null)
  return (
    <Sheet open={open} onClose={onClose} title="Finalizar compra">
      <form onSubmit={(e) => { e.preventDefault(); confirm() }}>
        <p className="sheet-text">
          {picked} {picked === 1 ? 'item sai' : 'itens saem'} da lista.
          {pending > 0 ? ` ${pending} ${pending === 1 ? 'fica' : 'ficam'} para a próxima compra.` : ''}
        </p>
        {canRegister && (
          <Section header="Quanto deu" footer={valid ? `Entra nas contas do mês como “Mercado”, ${formatBRL(cents)}, já paga.` : 'Opcional. Entra nas contas do mês, já paga.'}>
            <label className="field-row">
              <span>R$</span>
              <input className="field" data-autofocus value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0,00" inputMode="decimal" aria-label="Valor" />
            </label>
          </Section>
        )}
        <div className="pad" style={{ paddingTop: 20 }}>
          <button type="submit" className="button is-filled">Finalizar</button>
        </div>
      </form>
    </Sheet>
  )
}
