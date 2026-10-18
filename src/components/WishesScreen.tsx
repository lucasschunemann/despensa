import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { Presence } from '../hooks/usePresence'
import { useViewportFit } from '../hooks/useViewportFit'
import type { WishesStore } from '../hooks/useWishes'
import { haptic } from '../lib/haptics'
import { monthKey, monthLabel } from '../lib/month'
import { formatBRL, parseExpenseEntry, toCents } from '../lib/money'
import { sound } from '../lib/sound'
import type { Wish } from '../lib/types'
import { WANT_LABEL } from '../lib/types'
import { forecast, sortWishes, totalDream, whenLabel } from '../lib/wishes'
import { Avatar } from './Avatar'
import { InlineAmount } from './InlineAmount'
import { Money } from './Money'
import { Composer, Dock, Empty, Icon, Screen, Segmented, Sheet, Skeleton, SwipeRow, Toast } from './ui'

interface Props {
  store: WishesStore
  me: string
  presence: Presence
  /** lança a compra nas contas do mês; ausente no modo demonstração */
  onRegisterExpense?: (title: string, amountCents: number) => void
}

export function WishesScreen({ store, me, presence, onRegisterExpense }: Props) {
  const { wishes, savingsCents, ready, error, clearError, add, toggleWant, setLevel, setPrice, rename, setImage, markBought, remove, restore, setSavings } = store
  const [text, setText] = useState('')
  const [deleted, setDeleted] = useState<Wish | null>(null)
  const [bought, setBought] = useState<Wish | null>(null)
  const [editing, setEditing] = useState<Wish | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const scroller = useRef<HTMLDivElement>(null)
  const nearBottom = useRef(false)

  const scrollToEnd = useCallback((behavior: ScrollBehavior = 'smooth') => {
    requestAnimationFrame(() => {
      const el = scroller.current
      if (el) el.scrollTo({ top: el.scrollHeight, behavior })
    })
  }, [])
  useViewportFit(useCallback(() => { if (nearBottom.current) scrollToEnd('auto') }, [scrollToEnd]))

  const wanting = sortWishes(wishes.filter((w) => w.status === 'querendo'))
  const got = wishes.filter((w) => w.status === 'comprado').sort((a, b) => (b.bought_at ?? '').localeCompare(a.bought_at ?? ''))
  const plan = forecast(wanting, savingsCents)
  const total = totalDream(wanting)
  const last = wanting.at(-1)
  const lastWhen = last ? whenLabel(plan.get(last.id)?.monthsAway ?? null) : null
  const entry = parseExpenseEntry(text)

  const handleAdd = () => {
    if (!entry) return
    add(entry.title, entry.amountCents)
    sound.add()
    haptic('light')
    setText('')
    scrollToEnd()
  }

  const handleBought = (wish: Wish) => {
    setEditing(null)
    if (wish.status === 'querendo') {
      sound.shimmer()
      haptic('medium')
      if (onRegisterExpense) setTimeout(() => setBought(wish), 250)
    } else {
      sound.undo()
      haptic('light')
    }
    markBought(wish)
  }

  const handleRemove = (wish: Wish) => {
    setEditing(null)
    sound.undo()
    haptic('medium')
    remove(wish)
    setDeleted(wish)
  }

  return (
    <Screen
      title="desejos"
      scrollRef={scroller}
      onScroll={(el) => { nearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80 }}
      footer={
        <Dock
          toasts={<>
            {notice && <Toast key="notice" duration={4000} onDismiss={() => setNotice(null)}>{notice}</Toast>}
            {deleted && (
              <Toast key="deleted" duration={5000} action={{ label: 'desfazer', onClick: () => { haptic('light'); restore(deleted); setDeleted(null) } }} onDismiss={() => setDeleted(null)}>
                {deleted.title} apagado
              </Toast>
            )}
          </>}
        >
          <Composer
            value={text}
            onChange={(value) => { setText(value); if (value.trim()) presence.notifyTyping() }}
            onSubmit={handleAdd}
            canSubmit={Boolean(entry)}
            placeholder="abajur 320"
            label="Novo desejo"
            sendLabel="Adicionar desejo"
            onFocus={() => scrollToEnd()}
            chip={entry && entry.amountCents > 0 ? formatBRL(entry.amountCents) : null}
          />
        </Dock>
      }
    >
      <section className="summary">
        <p className="summary-label">sonhar custa</p>
        <Money className="summary-value" cents={total} />
        <p className="summary-line is-plain">
          <span>guardando <InlineAmount cents={savingsCents} label="Quanto dá para guardar por mês" onChange={setSavings} /> por mês</span>
        </p>
        <AnimatePresence mode="popLayout" initial={false}>
          {wanting.length > 0 && (
            <motion.p key={savingsCents > 0 && lastWhen ? 'fila' : 'sem-meta'} className="summary-note" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {savingsCents > 0 && lastWhen
                ? `a fila inteira sai ${lastWhen === 'já dá' ? 'agora' : `em ${lastWhen}`} · ${wanting.length} ${wanting.length === 1 ? 'desejo' : 'desejos'}`
                : 'defina quanto dá para guardar e eu digo quando cada um sai'}
            </motion.p>
          )}
        </AnimatePresence>
      </section>

      {error && <button className="banner" onClick={clearError}>{error}</button>}
      {!ready && <Skeleton rows={3} />}
      {ready && wishes.length === 0 && <Empty title="nenhum desejo ainda" hint="escreva abaixo: “abajur 320”. depois abra o desejo para pôr a foto." />}

      <ul className="list wish-list">
        <AnimatePresence initial={false} mode="popLayout">
          {wanting.map((wish) => (
            <SwipeRow key={wish.id} lead={{ label: 'realizar', onTrigger: () => handleBought(wish) }} onRemove={() => handleRemove(wish)} onPress={() => setEditing(wish)}>
              <WishRow wish={wish} me={me} when={whenLabel(plan.get(wish.id)?.monthsAway ?? null)} onToggleWant={toggleWant} />
            </SwipeRow>
          ))}
        </AnimatePresence>
      </ul>

      {got.length > 0 && (
        <>
          <div className="section-head"><h2>já compramos<small>{got.length}</small></h2></div>
          <ul className="list wish-list">
            <AnimatePresence initial={false} mode="popLayout">
              {got.map((wish) => (
                <SwipeRow key={wish.id} onRemove={() => handleRemove(wish)} onPress={() => setEditing(wish)}>
                  <WishRow wish={wish} me={me} when={null} onToggleWant={toggleWant} />
                </SwipeRow>
              ))}
            </AnimatePresence>
          </ul>
        </>
      )}

      <EditWishSheet
        wish={editing}
        onClose={() => setEditing(null)}
        onSave={(wish, title, cents) => {
          if (title !== wish.title) rename(wish, title)
          if (cents !== wish.price_cents) setPrice(wish, cents)
          sound.add()
          setEditing(null)
        }}
        onLevel={setLevel}
        onImage={setImage}
        onBought={handleBought}
        onRemove={handleRemove}
      />

      <BoughtSheet
        wish={bought}
        onClose={() => setBought(null)}
        onConfirm={(wish, cents) => {
          onRegisterExpense?.(wish.title, cents)
          setBought(null)
          setNotice(`${formatBRL(cents)} lançado nas contas do mês`)
        }}
      />
    </Screen>
  )
}

function WishRow({ wish, me, when, onToggleWant }: { wish: Wish; me: string; when: string | null; onToggleWant: (wish: Wish) => void }) {
  const mine = wish.wanted_by.includes(me)
  const bought = wish.status === 'comprado'
  // preço e vontade numa linha; quando dá para comprar, menor, embaixo
  const meta = bought ? formatBRL(wish.price_cents) : `${formatBRL(wish.price_cents)} · ${WANT_LABEL[wish.want_level]}`
  const note = bought
    ? `comprado${wish.bought_by ? ` por ${wish.bought_by === me ? 'você' : wish.bought_by}` : ''}`
    : when ? (when === 'já dá' ? 'já dá para comprar' : `dá em ${when}`) : null
  return (
    <div className={`item wish${bought ? ' is-done' : ''}`}>
      <span className="wish-photo" aria-hidden>
        {wish.image_url ? <img src={wish.image_url} alt="" draggable={false} /> : wish.title.charAt(0).toUpperCase()}
      </span>
      <span className="item-text">
        <span className="item-name">{wish.title}</span>
        <span className="item-meta">{meta}</span>
        {note && <span className="item-note">{note}</span>}
      </span>
      <button
        type="button"
        className={`want${mine ? ' is-mine' : ''}`}
        aria-pressed={mine}
        aria-label={mine ? 'Tirar meu coração' : 'Também quero'}
        onClick={() => { haptic(mine ? 'light' : 'medium'); onToggleWant(wish) }}
      >
        <Icon name="heart" size={22} />
        {wish.wanted_by.length > 0 && <span className="want-who">{wish.wanted_by.map((person) => <Avatar key={person} person={person} size={16} />)}</span>}
      </button>
    </div>
  )
}

function EditWishSheet({ wish, onClose, onSave, onLevel, onImage, onBought, onRemove }: {
  wish: Wish | null
  onClose: () => void
  onSave: (wish: Wish, title: string, cents: number) => void
  onLevel: (wish: Wish, level: number) => void
  onImage: (wish: Wish, file: File) => void
  onBought: (wish: Wish) => void
  onRemove: (wish: Wish) => void
}) {
  const [text, setText] = useState('')
  const [level, setLevelState] = useState(2)
  const [last, setLast] = useState<Wish | null>(null)
  const file = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (!wish) return
    setLast(wish)
    setLevelState(wish.want_level)
    setText(`${wish.title}${wish.price_cents ? ` ${(wish.price_cents / 100).toFixed(2).replace('.', ',')}` : ''}`)
  }, [wish])
  const current = wish ?? last
  const understood = parseExpenseEntry(text)
  return (
    <Sheet open={Boolean(wish)} onClose={onClose} title="editar desejo">
      {current && (
        <form className="sheet-form" onSubmit={(e) => { e.preventDefault(); if (understood) onSave(current, understood.title, understood.amountCents) }}>
          <input className="field" data-autofocus value={text} onChange={(e) => setText(e.target.value)} aria-label="Editar desejo" autoComplete="off" enterKeyHint="done" />
          <p className="field-hint">{understood ? `${understood.title} · ${formatBRL(understood.amountCents)}` : 'escreva o nome'}</p>

          <span className="field-label">quanto você quer</span>
          <Segmented
            label="Nível de vontade"
            value={level}
            onChange={(value) => { setLevelState(value); onLevel(current, value) }}
            options={[1, 2, 3].map((value) => ({ value, label: WANT_LABEL[value] }))}
          />

          <button type="button" className="btn btn-tinted" onClick={() => file.current?.click()}>
            <Icon name="camera" size={18} />{current.image_url ? 'trocar a foto' : 'adicionar foto'}
          </button>
          <input ref={file} type="file" accept="image/*" hidden onChange={(e) => {
            const picked = e.target.files?.[0]
            if (picked) onImage(current, picked)
            e.target.value = ''
          }} />

          <button type="submit" className="btn btn-primary" disabled={!understood}>salvar</button>
          <button type="button" className="btn btn-plain" onClick={() => onBought(current)}>{current.status === 'querendo' ? 'realizar desejo' : 'voltar para a fila'}</button>
          <button type="button" className="btn btn-plain is-danger" onClick={() => onRemove(current)}>apagar desejo</button>
        </form>
      )}
    </Sheet>
  )
}

function BoughtSheet({ wish, onClose, onConfirm }: { wish: Wish | null; onClose: () => void; onConfirm: (wish: Wish, cents: number) => void }) {
  const [amount, setAmount] = useState('')
  const [last, setLast] = useState<Wish | null>(null)
  useEffect(() => {
    if (!wish) return
    setLast(wish)
    setAmount(wish.price_cents > 0 ? (wish.price_cents / 100).toFixed(2).replace('.', ',') : '')
  }, [wish])
  const current = wish ?? last
  const cents = amount.trim() ? toCents(amount.trim().replace(/^r\$\s*/i, '')) : 0
  const valid = Number.isFinite(cents) && cents > 0
  return (
    <Sheet open={Boolean(wish)} onClose={onClose} title={current ? `comprou ${current.title}` : 'comprou'}>
      {current && (
        <form className="sheet-form" onSubmit={(e) => { e.preventDefault(); if (valid) { sound.cash(); haptic('success'); onConfirm(current, cents) } }}>
          <label className="field-label" htmlFor="bought-total">quanto foi?</label>
          <div className="field-money">
            <span>R$</span>
            <input id="bought-total" className="field" data-autofocus value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0,00" inputMode="decimal" aria-label="Valor" />
          </div>
          <p className="field-hint">{valid ? `vira a conta “${current.title}” de ${formatBRL(cents)}, já paga` : `entra nas contas de ${monthLabel(monthKey())}, já paga`}</p>
          <button type="submit" className="btn btn-primary" disabled={!valid}>lançar nas contas</button>
          <button type="button" className="btn btn-plain" onClick={onClose}>agora não</button>
        </form>
      )}
    </Sheet>
  )
}
