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
import { WANT_LABEL } from '../lib/types'
import { forecast, sortWishes, totalDream, whenLabel } from '../lib/wishes'
import { Avatar } from './Avatar'
import { Money } from './Money'
import { Accessory, Composer, Empty, Glyph, Icon, Row, Screen, Section, Segmented, Shell, Sheet, Skeleton, SwipeRow, Toast, Typing } from './ui'

interface Props {
  store: WishesStore
  me: string
  presence: Presence
  /** lança a compra nas contas do mês; ausente no modo demonstração */
  onRegisterExpense?: (title: string, amountCents: number) => void
}

const cap = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)

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

  return (
    <Screen
      title="Desejos"
      tint="pink"
      scrollRef={scroller}
      onScroll={(el) => { nearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80 }}
      accessory={
        <Accessory
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
        </Accessory>
      }
    >
      <section className="summary" aria-label="Cofre">
        <p className="summary-head">
          <span>Cofre</span>
          <span>{wanting.length} {wanting.length === 1 ? 'desejo' : 'desejos'} na fila</span>
        </p>
        <Money className="summary-value" cents={total} />
        <p className="summary-note">
          {wanting.length === 0
            ? 'Nada na fila por enquanto.'
            : savingsCents > 0 && lastWhen
              ? `Guardando ${formatBRL(savingsCents)} por mês, a fila toda sai ${lastWhen === 'já dá' ? 'agora' : `em ${lastWhen}`}.`
              : 'Diga quanto dá para guardar por mês e o app mostra quando cada desejo sai.'}
        </p>
      </section>

      <Section>
        <SavingsRow cents={savingsCents} onChange={setSavings} />
      </Section>

      {error && <button className="banner" onClick={clearError}>{error}</button>}
      {!ready && <Skeleton rows={3} />}
      {ready && wishes.length === 0 && <Empty icon={<Glyph name="heart" size={56} />} title="Nenhum desejo" hint="Escreva abaixo: “Abajur 320”. Depois abra o desejo para pôr uma foto." />}

      {wanting.length > 0 && (
        <Section header="Na fila">
          <ul className="list wish-list">
            <AnimatePresence initial={false} mode="popLayout">
              {wanting.map((wish) => (
                <SwipeRow key={wish.id} lead={{ label: 'Realizar', onTrigger: () => handleBought(wish) }} onRemove={() => handleRemove(wish)} onPress={() => setEditing(wish)}>
                  <WishRow wish={wish} me={me} when={whenLabel(plan.get(wish.id)?.monthsAway ?? null)} onToggleWant={toggleWant} />
                </SwipeRow>
              ))}
            </AnimatePresence>
          </ul>
        </Section>
      )}

      {got.length > 0 && (
        <Section header={`Já compramos · ${got.length}`}>
          <ul className="list wish-list">
            <AnimatePresence initial={false} mode="popLayout">
              {got.map((wish) => (
                <SwipeRow key={wish.id} onRemove={() => handleRemove(wish)} onPress={() => setEditing(wish)}>
                  <WishRow wish={wish} me={me} when={null} onToggleWant={toggleWant} />
                </SwipeRow>
              ))}
            </AnimatePresence>
          </ul>
        </Section>
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

/** Quanto dá para guardar por mês: um campo dentro da linha, como nos Ajustes. */
function SavingsRow({ cents, onChange }: { cents: number; onChange: (cents: number) => void }) {
  const format = (value: number) => (value > 0 ? (value / 100).toFixed(2).replace('.', ',') : '')
  const [text, setText] = useState(format(cents))
  const [focused, setFocused] = useState(false)
  useEffect(() => { if (!focused) setText(format(cents)) }, [cents, focused])
  const commit = () => {
    const value = text.trim() ? toCents(text.trim().replace(/^r\$\s*/i, '')) : 0
    if (Number.isFinite(value) && value >= 0 && value !== cents) onChange(value)
  }
  return (
    <label className="field-row">
      <span>Guardar por mês</span>
      <input
        className="field is-end"
        value={focused ? text : cents > 0 ? formatBRL(cents) : ''}
        placeholder="R$ 0,00"
        inputMode="decimal"
        aria-label="Quanto dá para guardar por mês"
        onFocus={() => { setFocused(true); setText(format(cents)) }}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => { setFocused(false); commit() }}
        onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
      />
    </label>
  )
}

function WishRow({ wish, me, when, onToggleWant }: { wish: Wish; me: string; when: string | null; onToggleWant: (wish: Wish) => void }) {
  const mine = wish.wanted_by.includes(me)
  const bought = wish.status === 'comprado'
  return (
    <div className={`item wish${bought ? ' is-done' : ''}`}>
      <span className="wish-photo" aria-hidden>
        {wish.image_url ? <img src={wish.image_url} alt="" draggable={false} /> : wish.title.charAt(0).toUpperCase()}
      </span>
      <span className="item-text">
        <span className="item-name">{wish.title}</span>
        <span className="item-meta">{formatBRL(wish.price_cents)}{bought ? '' : ` · ${cap(WANT_LABEL[wish.want_level])}`}</span>
        <span className="item-note">
          {bought
            ? `Comprado${wish.bought_by ? ` por ${wish.bought_by === me ? 'você' : wish.bought_by}` : ''}`
            : when ? (when === 'já dá' ? 'Já dá para comprar' : `Sai em ${when}`) : 'Sem previsão'}
        </span>
      </span>
      <button
        type="button"
        className={`want${mine ? ' is-mine' : ''}`}
        aria-pressed={mine}
        aria-label={mine ? 'Tirar meu coração' : 'Também quero'}
        onClick={() => { haptic(mine ? 'light' : 'medium'); onToggleWant(wish) }}
      >
        {mine ? <Glyph name="heart" size={24} /> : <Icon name="heart" size={24} weight={1.8} />}
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
  const save = () => { if (current && understood) onSave(current, understood.title, understood.amountCents) }
  return (
    <Sheet open={Boolean(wish)} onClose={onClose} title="Editar desejo" onDone={save} doneDisabled={!understood}>
      {current && (
        <form onSubmit={(e) => { e.preventDefault(); save() }}>
          <Section footer={understood ? `${understood.title} · ${formatBRL(understood.amountCents)}` : 'Escreva o nome'}>
            <input className="field" data-autofocus value={text} onChange={(e) => setText(e.target.value)} aria-label="Editar desejo" autoComplete="off" enterKeyHint="done" />
          </Section>
          <Section header="Quanto vocês querem">
            <div className="pad">
              <Segmented
                label="Nível de vontade"
                value={level}
                onChange={(value) => { setLevelState(value); onLevel(current, value) }}
                options={[1, 2, 3].map((value) => ({ value, label: cap(WANT_LABEL[value]) }))}
              />
            </div>
          </Section>
          <Section>
            <Row icon={<Icon name="camera" size={22} />} title={current.image_url ? 'Trocar foto' : 'Adicionar foto'} onClick={() => file.current?.click()} />
            <Row icon={<Icon name="check" size={22} />} title={current.status === 'querendo' ? 'Marcar como comprado' : 'Voltar para a fila'} onClick={() => onBought(current)} />
          </Section>
          <input ref={file} type="file" accept="image/*" hidden onChange={(e) => {
            const picked = e.target.files?.[0]
            if (picked) onImage(current, picked)
            e.target.value = ''
          }} />
          <Section>
            <Row title="Apagar desejo" danger center onClick={() => onRemove(current)} />
          </Section>
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
          <p className="sheet-text">Quer lançar a compra nas contas de {monthLabel(monthKey())}?</p>
          <Section header="Quanto foi" footer={valid ? `Vira a conta “${current.title}” de ${formatBRL(cents)}, já paga.` : 'Escreva o valor pago.'}>
            <label className="field-row">
              <span>R$</span>
              <input className="field" data-autofocus value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0,00" inputMode="decimal" aria-label="Valor" />
            </label>
          </Section>
          <div className="pad" style={{ display: 'grid', gap: 4, paddingTop: 20 }}>
            <button type="submit" className="button is-filled" disabled={!valid}>Lançar nas contas</button>
            <button type="button" className="button is-plain" onClick={onClose}>Agora não</button>
          </div>
        </form>
      )}
    </Sheet>
  )
}
