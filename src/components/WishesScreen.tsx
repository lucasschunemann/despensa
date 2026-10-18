import { AnimatePresence } from 'motion/react'
import { useCallback, useContext, useEffect, useRef, useState } from 'react'
import type { Presence } from '../hooks/usePresence'
import { useViewportFit } from '../hooks/useViewportFit'
import type { WishesStore } from '../hooks/useWishes'
import { haptic } from '../lib/haptics'
import { monthKey, monthLabel } from '../lib/month'
import { formatBRL, parseExpenseEntry, toCents } from '../lib/money'
import { sound } from '../lib/sound'
import type { Wish } from '../lib/types'
import { PEOPLE, WANT_LABEL } from '../lib/types'
import { forecast, sortWishes, totalDream, whenLabel } from '../lib/wishes'
import { Avatar } from './Avatar'
import { InlineAmount } from './InlineAmount'
import { Money } from './Money'
import { PAGE_ICON } from './TabBar'
import { Composer, Dock, Empty, GroupHead, Icon, Page, Prop, Select, Shell, Sheet, Skeleton, SwipeRow, Tag, Toast, Typing } from './ui'

interface Props {
  store: WishesStore
  me: string
  presence: Presence
  /** lança a compra nas contas do mês; ausente no modo demonstração */
  onRegisterExpense?: (title: string, amountCents: number) => void
}

const cap = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)
const LEVEL_COLOR: Record<number, string> = { 1: 'gray', 2: 'blue', 3: 'pink' }

export function WishesScreen({ store, me, presence, onRegisterExpense }: Props) {
  const { wishes, savingsCents, ready, error, clearError, add, toggleWant, setLevel, setPrice, rename, setImage, markBought, remove, restore, setSavings } = store
  const shell = useContext(Shell)
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

  const card = (wish: Wish, when: string | null) => (
    <SwipeRow
      key={wish.id}
      lead={wish.status === 'querendo' ? { label: 'Realizar', onTrigger: () => handleBought(wish) } : undefined}
      onRemove={() => handleRemove(wish)}
      onPress={() => setEditing(wish)}
    >
      <WishCard wish={wish} me={me} when={when} onToggleWant={toggleWant} />
    </SwipeRow>
  )

  return (
    <Page
      icon={PAGE_ICON.desejos}
      title="Desejos"
      scrollRef={scroller}
      onScroll={(el) => { nearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80 }}
      properties={
        <>
          <Prop icon="money" label="Na fila"><Money className="strong" cents={total} /><span style={{ color: 'var(--text-3)' }}>{wanting.length} {wanting.length === 1 ? 'desejo' : 'desejos'}</span></Prop>
          <Prop icon="calendar" label="Poupança"><InlineAmount cents={savingsCents} label="Quanto dá para guardar por mês" onChange={setSavings} /><span style={{ color: 'var(--text-3)' }}>por mês</span></Prop>
          <Prop icon="status" label="Fila completa">
            {wanting.length === 0
              ? <span style={{ color: 'var(--text-3)' }}>Vazia</span>
              : savingsCents > 0 && lastWhen
                ? <span className="queue-when">{lastWhen === 'já dá' ? 'Já dá para comprar tudo' : cap(lastWhen)}</span>
                : <span style={{ color: 'var(--text-3)' }}>Diga quanto guardar por mês</span>}
          </Prop>
        </>
      }
      footer={
        <Dock
          toasts={<>
            {notice && <Toast key="notice" duration={4000} onDismiss={() => setNotice(null)}>{notice}</Toast>}
            {deleted && (
              <Toast key="deleted" duration={5000} action={{ label: 'Desfazer', onClick: () => { haptic('light'); restore(deleted); setDeleted(null) } }} onDismiss={() => setDeleted(null)}>
                {deleted.title} apagado
              </Toast>
            )}
          </>}
          above={shell?.presence.typing ? <Typing key="typing" person={shell.presence.typing} /> : null}
        >
          <Composer
            value={text}
            onChange={(value) => { setText(value); if (value.trim()) presence.notifyTyping() }}
            onSubmit={handleAdd}
            canSubmit={Boolean(entry)}
            placeholder="Abajur 320"
            label="Novo desejo"
            sendLabel="Adicionar desejo"
            onFocus={() => scrollToEnd()}
            chip={entry && entry.amountCents > 0 ? formatBRL(entry.amountCents) : null}
          />
        </Dock>
      }
    >
      {error && <button className="banner" onClick={clearError}>{error}</button>}
      {!ready && <Skeleton rows={3} />}
      {ready && wishes.length === 0 && <Empty title="Nenhum desejo." hint="Escreva abaixo: “Abajur 320”. Depois abra o desejo para pôr uma foto." />}

      {wanting.length > 0 && (
        <>
          <GroupHead count={wanting.length}>Na fila</GroupHead>
          <ul className="gallery">
            <AnimatePresence initial={false} mode="popLayout">
              {wanting.map((wish) => card(wish, whenLabel(plan.get(wish.id)?.monthsAway ?? null)))}
            </AnimatePresence>
          </ul>
        </>
      )}

      {got.length > 0 && (
        <>
          <GroupHead count={got.length}>Já compramos</GroupHead>
          <ul className="gallery">
            <AnimatePresence initial={false} mode="popLayout">{got.map((wish) => card(wish, null))}</AnimatePresence>
          </ul>
        </>
      )}

      <EditWishSheet
        wish={editing}
        me={me}
        when={editing ? whenLabel(plan.get(editing.id)?.monthsAway ?? null) : null}
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
    </Page>
  )
}

function WishCard({ wish, me, when, onToggleWant }: { wish: Wish; me: string; when: string | null; onToggleWant: (wish: Wish) => void }) {
  const mine = wish.wanted_by.includes(me)
  const bought = wish.status === 'comprado'
  const both = PEOPLE.every((person) => wish.wanted_by.includes(person))
  return (
    <article className={`card${bought ? ' is-done' : ''}`}>
      <div className={`card-cover${wish.image_url ? '' : ' is-empty'}`} aria-hidden>
        {wish.image_url ? <img src={wish.image_url} alt="" draggable={false} /> : wish.title.charAt(0).toUpperCase()}
      </div>
      <div className="card-body">
        <span className="card-title">{wish.title}</span>
        <span className="card-price">{formatBRL(wish.price_cents)}</span>
        {!bought && <span><Tag color={LEVEL_COLOR[wish.want_level]}>{cap(WANT_LABEL[wish.want_level])}</Tag></span>}
        <span className="card-when">
          {bought
            ? `Comprado${wish.bought_by ? ` por ${wish.bought_by === me ? 'você' : wish.bought_by}` : ''}`
            : when ? (when === 'já dá' ? 'Já dá para comprar' : `Sai em ${when}`) : 'Sem previsão'}
        </span>
        <span className="card-foot">
          <button
            type="button"
            className={`want${mine ? ' is-mine' : ''}`}
            aria-pressed={mine}
            aria-label={mine ? 'Tirar meu coração' : 'Também quero'}
            onClick={() => { haptic(mine ? 'light' : 'medium'); onToggleWant(wish) }}
          >
            <Icon name="heart" size={18} />
            {wish.wanted_by.length > 0 && <span className="want-who">{wish.wanted_by.map((person) => <Avatar key={person} person={person} size={16} />)}</span>}
          </button>
          {both && <span className="card-when">Os dois querem</span>}
        </span>
      </div>
    </article>
  )
}

function EditWishSheet({ wish, me, when, onClose, onSave, onLevel, onImage, onBought, onRemove }: {
  wish: Wish | null
  me: string
  when: string | null
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
  const save = () => { if (current && understood) onSave(current, understood.title, understood.amountCents) }
  return (
    <Sheet open={Boolean(wish)} onClose={onClose} title="Desejo" action={{ label: 'Salvar', onClick: save, disabled: !understood }}>
      {current && (
        <form onSubmit={(e) => { e.preventDefault(); save() }}>
          <button type="button" className="sheet-cover" onClick={() => file.current?.click()} aria-label={current.image_url ? 'Trocar foto' : 'Adicionar foto'}>
            {current.image_url ? <img src={current.image_url} alt="" /> : <><Icon name="image" size={18} />Adicionar foto</>}
          </button>
          <input ref={file} type="file" accept="image/*" hidden onChange={(e) => {
            const picked = e.target.files?.[0]
            if (picked) onImage(current, picked)
            e.target.value = ''
          }} />
          <input className="doc-title" data-autofocus value={text} onChange={(e) => setText(e.target.value)} aria-label="Editar desejo" autoComplete="off" enterKeyHint="done" />
          <p className="doc-hint">Escreva como no campo: “Abajur 320”.</p>
          <dl className="props">
            <Prop icon="hash" label="Preço">{understood ? formatBRL(understood.amountCents) : '–'}</Prop>
            <Prop icon="heart" label="Vontade">
              <Select
                label="Nível de vontade"
                value={level}
                onChange={(value) => { setLevelState(value); onLevel(current, value) }}
                options={[1, 2, 3].map((value) => ({ value, label: cap(WANT_LABEL[value]), color: LEVEL_COLOR[value] }))}
              />
            </Prop>
            <Prop icon="person" label="Quem quer">
              {current.wanted_by.length ? current.wanted_by.map((person) => <span key={person} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Avatar person={person} size={18} />{person === me ? 'Você' : person}</span>) : <span style={{ color: 'var(--text-3)' }}>Ninguém ainda</span>}
            </Prop>
            <Prop icon="calendar" label="Previsão">{current.status === 'comprado' ? 'Comprado' : when ? (when === 'já dá' ? 'Já dá' : cap(when)) : <span style={{ color: 'var(--text-3)' }}>Sem previsão</span>}</Prop>
          </dl>
          <div className="doc-actions">
            <button type="button" className="button is-secondary" onClick={() => onBought(current)}><Icon name="check" size={16} />{current.status === 'querendo' ? 'Marcar como comprado' : 'Voltar para a fila'}</button>
            <button type="button" className="button is-danger" onClick={() => onRemove(current)}><Icon name="trash" size={16} />Apagar desejo</button>
          </div>
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
  const confirm = () => { if (current && valid) { sound.cash(); haptic('success'); onConfirm(current, cents) } }
  return (
    <Sheet open={Boolean(wish)} onClose={onClose} title={current ? `${current.title} comprado` : 'Comprado'}>
      {current && (
        <form onSubmit={(e) => { e.preventDefault(); confirm() }}>
          <p style={{ paddingTop: 8 }}>Lançar a compra nas contas de {monthLabel(monthKey())}?</p>
          <label className="field-label" htmlFor="bought-total">Quanto foi</label>
          <div className="field-money">
            <span>R$</span>
            <input id="bought-total" className="field" data-autofocus value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0,00" inputMode="decimal" aria-label="Valor" />
          </div>
          <p className="doc-hint" style={{ marginTop: 6 }}>{valid ? `Vira a conta “${current.title}” de ${formatBRL(cents)}, já paga.` : 'Escreva o valor pago.'}</p>
          <div className="doc-actions">
            <button type="submit" className="button is-primary" disabled={!valid}>Lançar nas contas</button>
            <button type="button" className="button is-quiet" onClick={onClose}>Agora não</button>
          </div>
        </form>
      )}
    </Sheet>
  )
}
