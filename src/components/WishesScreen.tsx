import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useRef, useState } from 'react'
import type { Presence } from '../hooks/usePresence'
import { useViewportFit } from '../hooks/useViewportFit'
import { useWishes } from '../hooks/useWishes'
import { haptic } from '../lib/haptics'
import { monthLabel, monthKey } from '../lib/month'
import { formatBRL, parseExpenseEntry } from '../lib/money'
import { sound } from '../lib/sound'
import type { Wish } from '../lib/types'
import { PEOPLE } from '../lib/types'
import { forecast, sortWishes, totalDream, whenLabel } from '../lib/wishes'
import { AmountPrompt } from './AmountPrompt'
import { AppHeader } from './AppHeader'
import { Ether } from './Ether'
import { InlineAmount } from './InlineAmount'
import { Money, MoneyRain } from './Money'
import { Skeleton } from './Skeleton'
import { Toast } from './Toast'
import { WishCard } from './WishCard'

interface Props {
  store: ReturnType<typeof useWishes>
  me: string
  presence: Presence
  onOpenMenu: () => void
  onHome?: () => void
  /** lança a compra nas contas do mês; ausente no modo demonstração */
  onRegisterExpense?: (title: string, amountCents: number) => void
}

export function WishesScreen({ store, me, presence, onOpenMenu, onHome, onRegisterExpense }: Props) {
  const {
    wishes,
    savingsCents,
    ready,
    error,
    clearError,
    add,
    toggleWant,
    cycleLevel,
    setPrice,
    rename,
    setImage,
    markBought,
    remove,
    restore,
    setSavings,
  } = store

  const [text, setText] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)
  const [rain, setRain] = useState(0)
  const [deleted, setDeleted] = useState<Wish | null>(null)
  const [bought, setBought] = useState<Wish | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const scroller = useRef<HTMLDivElement>(null)
  const [scrolled, setScrolled] = useState(false)
  const nearBottom = useRef(false)
  const input = useRef<HTMLInputElement>(null)
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const scrollToEnd = useCallback((behavior: ScrollBehavior = 'smooth') => {
    requestAnimationFrame(() => {
      const el = scroller.current
      if (el) el.scrollTo({ top: el.scrollHeight, behavior })
    })
  }, [])
  useViewportFit(
    useCallback(() => {
      if (nearBottom.current) scrollToEnd('auto')
    }, [scrollToEnd]),
  )

  const wanting = sortWishes(wishes.filter((w) => w.status === 'querendo'))
  const got = wishes
    .filter((w) => w.status === 'comprado')
    .sort((a, b) => (b.bought_at ?? '').localeCompare(a.bought_at ?? ''))
  const plan = forecast(wanting, savingsCents)
  const total = totalDream(wanting)
  const last = wanting.at(-1)
  const lastWhen = last ? whenLabel(plan.get(last.id)?.monthsAway ?? null) : null

  const handleAdd = (raw: string) => {
    const entry = parseExpenseEntry(raw)
    if (!entry) return
    add(entry.title, entry.amountCents)
    sound.add()
    haptic('light')
    setText('')
    input.current?.focus()
    scrollToEnd()
  }

  const handleBought = (wish: Wish) => {
    setOpenId(null)
    if (wish.status === 'querendo') {
      // nos desejos não chove dinheiro: o cartão vira luz (ver WishCard)
      if (onRegisterExpense) setTimeout(() => setBought(wish), 200)
    } else {
      sound.undo()
      haptic('light')
    }
    markBought(wish)
  }

  const handleRemove = (wish: Wish) => {
    setOpenId(null)
    sound.undo()
    haptic('medium')
    remove(wish)
    setDeleted(wish)
    if (undoTimer.current) clearTimeout(undoTimer.current)
    undoTimer.current = setTimeout(() => setDeleted(null), 5000)
  }

  return (
    <div className="app wishes-app">
      <Ether />
      <AppHeader title="desejos" presence={presence} onOpenMenu={onOpenMenu} onHome={onHome} scrolled={scrolled} />

      {error && (
        <button className="banner banner-error" onClick={clearError}>
          {error}
        </button>
      )}

      <div
        className="scroll"
        ref={scroller}
        onPointerDown={() => setOpenId(null)}
        onScroll={(e) => {
          const el = e.currentTarget
          setScrolled(el.scrollTop > 6)
          nearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80
        }}
      >
        <motion.section
          className="summary dream"
          layout
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 380, damping: 32 }}
        >
          <p className="summary-label">
            <motion.span
              className="twinkle"
              animate={{ opacity: [0.35, 1, 0.35], scale: [0.85, 1.1, 0.85], rotate: [0, 45, 90] }}
              transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
              aria-hidden
            >
              ✦
            </motion.span>
            sonhar custa
          </p>
          <Money className="summary-value" cents={total} />

          <p className="summary-line savings">
            guardando <InlineAmount cents={savingsCents} label="Quanto dá para guardar por mês" onChange={setSavings} />{' '}
            por mês
          </p>

          <AnimatePresence mode="popLayout">
            {savingsCents > 0 && lastWhen && wanting.length > 0 ? (
              <motion.p
                key="fila"
                className="summary-line"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                a fila inteira sai {lastWhen === 'já dá' ? 'agora' : `em ${lastWhen}`} · {wanting.length}{' '}
                {wanting.length === 1 ? 'desejo' : 'desejos'}
              </motion.p>
            ) : (
              wanting.length > 0 && (
                <motion.p key="sem-meta" className="summary-line" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  defina quanto dá para guardar e eu digo quando cada um sai
                </motion.p>
              )
            )}
          </AnimatePresence>
        </motion.section>

        {!ready && <Skeleton variant="wishes" />}

        {ready && wishes.length === 0 && (
          <motion.div className="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <p className="empty-title">nenhum desejo ainda</p>
            <p className="empty-hint">
              escreva aí embaixo: “abajur 320”. depois toque na moldura para pôr a foto.
            </p>
          </motion.div>
        )}

        <ul className="wishes">
          <AnimatePresence initial={false} mode="popLayout">
            {wanting.map((wish, index) => (
              <WishCard
                key={wish.id}
                wish={wish}
                me={me}
                people={PEOPLE}
                when={whenLabel(plan.get(wish.id)?.monthsAway ?? null)}
                open={openId === wish.id}
                enterDelay={index * 0.03}
                onOpenChange={(open) => setOpenId(open ? wish.id : null)}
                onToggleWant={toggleWant}
                onCycleLevel={cycleLevel}
                onSetPrice={setPrice}
                onRename={rename}
                onPickImage={setImage}
                onToggleBought={handleBought}
                onRemove={handleRemove}
              />
            ))}

            {got.length > 0 && (
              <motion.li key="divider" layout="position" className="divider" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                Já compramos · {got.length}
              </motion.li>
            )}

            {got.map((wish) => (
              <WishCard
                key={wish.id}
                wish={wish}
                me={me}
                people={PEOPLE}
                when={null}
                open={openId === wish.id}
                enterDelay={0}
                onOpenChange={(open) => setOpenId(open ? wish.id : null)}
                onToggleWant={toggleWant}
                onCycleLevel={cycleLevel}
                onSetPrice={setPrice}
                onRename={rename}
                onPickImage={setImage}
                onToggleBought={handleBought}
                onRemove={handleRemove}
              />
            ))}
          </AnimatePresence>
        </ul>
      </div>

      <div className="dock">
        <AnimatePresence>
          {notice && (
            <Toast key="notice" onDismiss={() => setNotice(null)}>
              {notice}
            </Toast>
          )}
          {deleted && (
            <Toast
              key="deleted"
              duration={5000}
              action={{
                label: 'desfazer',
                onClick: () => {
                  if (undoTimer.current) clearTimeout(undoTimer.current)
                  haptic('light')
                  restore(deleted)
                  setDeleted(null)
                },
              }}
              onDismiss={() => setDeleted(null)}
            >
              {deleted.title} apagado
            </Toast>
          )}
          {bought && onRegisterExpense && (
            <AmountPrompt
              key="lancar"
              question={`comprou ${bought.title}. quanto foi?`}
              emptyHint={`entra nas contas de ${monthLabel(monthKey())}, já paga`}
              confirmHint={(valor) => `vai virar a conta “${bought.title}” de ${valor}`}
              initial={bought.price_cents > 0 ? (bought.price_cents / 100).toFixed(2).replace('.', ',') : ''}
              onClose={() => setBought(null)}
              onConfirm={(cents) => {
                onRegisterExpense(bought.title, cents)
                setBought(null)
                setNotice(`${formatBRL(cents)} lançado nas contas do mês`)
                setTimeout(() => setNotice(null), 4000)
              }}
            />
          )}
        </AnimatePresence>

        <form
          className="composer"
          onSubmit={(e) => {
            e.preventDefault()
            handleAdd(text)
          }}
        >
          <div className="composer-field">
            <input
              ref={input}
              value={text}
              onChange={(e) => {
                setText(e.target.value)
                if (e.target.value.trim()) presence.notifyTyping()
              }}
              onFocus={() => scrollToEnd()}
              placeholder="abajur 320"
              aria-label="Novo desejo"
              autoComplete="off"
              autoCapitalize="sentences"
              enterKeyHint="enter"
            />
            <AnimatePresence initial={false}>
              {text.trim() && (
                <motion.button
                  key="send"
                  type="submit"
                  className="composer-send"
                  aria-label="Adicionar desejo"
                  initial={{ scale: 0.4, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.4, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 700, damping: 30 }}
                  onPointerDown={(e) => e.preventDefault()}
                >
                  <svg viewBox="0 0 24 24" aria-hidden>
                    <path d="M12 19V5M12 5l-6 6M12 5l6 6" />
                  </svg>
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </form>
      </div>

      <AnimatePresence>{rain > 0 && <MoneyRain key={rain} onDone={() => setRain(0)} />}</AnimatePresence>
    </div>
  )
}
