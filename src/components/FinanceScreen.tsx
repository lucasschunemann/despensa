import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { ExpensesStore } from '../hooks/useExpenses'
import { useViewportFit } from '../hooks/useViewportFit'
import { summarize } from '../lib/balance'
import { haptic } from '../lib/haptics'
import { isCurrentMonth, monthKey, monthLabel, shiftMonth } from '../lib/month'
import { formatAmount, formatBRL, parseExpenseEntry, type ExpenseEntry } from '../lib/money'
import { sound } from '../lib/sound'
import type { Expense } from '../lib/types'
import { PEOPLE } from '../lib/types'
import { Avatar } from './Avatar'
import { FolderChips, FolderSheet, MoveSheet, type FolderFilter } from './FinanceFolders'
import { Money } from './Money'
import { Rolling } from './Rolling'
import { Accessory, ActionSheet, Check, Composer, Done, Empty, Glyph, Icon, Row, Screen, Section, Segmented, Sheet, Skeleton, SwipeRow, Toast } from './ui'

interface Props {
  store: ExpensesStore
  me: string
  month: string
  onMonthChange: (month: string) => void
}

const cap = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)

export function FinanceScreen({ store, me, month, onMonthChange }: Props) {
  const {
    expenses, folders, ready, error, clearError, add, togglePaid, setSplit, edit, remove,
    stopRecurring, restore, settleMonth, addFolder, editFolder, removeFolder, moveExpenses,
  } = store
  const reduced = useReducedMotion()
  const [text, setText] = useState('')
  const [recurring, setRecurring] = useState(false)
  const [deleted, setDeleted] = useState<Expense | null>(null)
  const [asking, setAsking] = useState<Expense | null>(null)
  const [editing, setEditing] = useState<Expense | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [closing, setClosing] = useState(false)
  const [filter, setFilter] = useState<FolderFilter>('all')
  const [folderSheet, setFolderSheet] = useState<{ folder: (typeof folders)[number] | null } | null>(null)
  const [selecting, setSelecting] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [moving, setMoving] = useState(false)
  const scroller = useRef<HTMLDivElement>(null)
  const nearBottom = useRef(false)

  const scrollToEnd = useCallback((behavior: ScrollBehavior = 'smooth') => {
    requestAnimationFrame(() => {
      const el = scroller.current
      if (el) el.scrollTo({ top: el.scrollHeight, behavior })
    })
  }, [])
  useViewportFit(useCallback(() => { if (nearBottom.current) scrollToEnd('auto') }, [scrollToEnd]))

  const shown = expenses.filter((expense) => (filter === 'all' ? true : filter === 'unfiled' ? !expense.folder_id : expense.folder_id === filter))
  const summary = summarize(shown, PEOPLE)
  const pending = shown
    .filter((e) => e.status === 'pendente')
    .sort((a, b) => (a.due_day ?? 99) - (b.due_day ?? 99) || a.created_at.localeCompare(b.created_at))
  const paid = shown.filter((e) => e.status === 'pago').sort((a, b) => (a.paid_at ?? '').localeCompare(b.paid_at ?? ''))
  const done = expenses.length > 0 && expenses.every((expense) => expense.status === 'pago')
  const activeFolder = folders.find((folder) => folder.id === filter)
  const filterTitle = filter === 'all' ? 'Todas as contas' : filter === 'unfiled' ? 'Sem pasta' : activeFolder?.name ?? 'Pasta'
  const progress = summary.totalCents > 0 ? summary.paidCents / summary.totalCents : 0
  const entry = parseExpenseEntry(text)
  const today = new Date().getDate()

  const counts = {
    all: expenses.length,
    unfiled: expenses.filter((e) => !e.folder_id).length,
    byFolder: Object.fromEntries(folders.map((f) => [f.id, expenses.filter((e) => e.folder_id === f.id).length])),
  }

  // "Mês pago" só na virada, nunca ao abrir um mês que já estava fechado
  const wasDone = useRef<boolean | null>(null)
  useEffect(() => {
    const previous = wasDone.current
    wasDone.current = done
    if (!ready || previous === null || previous || !done) return
    sound.complete()
    haptic('success')
    setClosing(true)
    const timer = setTimeout(() => setClosing(false), 1900)
    return () => clearTimeout(timer)
  }, [done, ready])
  useEffect(() => { wasDone.current = null }, [month])

  const goMonth = (delta: number) => {
    sound.tick()
    haptic('light')
    onMonthChange(shiftMonth(month, delta))
  }

  const pay = (expense: Expense) => {
    if (expense.status === 'pendente') { sound.cash(); haptic('medium') } else { sound.undo(); haptic('light') }
    togglePaid(expense)
  }

  const removeThisMonth = (expense: Expense) => {
    sound.undo()
    haptic('medium')
    remove(expense)
    setDeleted(expense)
  }

  // conta que se repete pergunta antes: só deste mês, ou deste mês em diante
  const handleRemove = (expense: Expense) => {
    setEditing(null)
    if (expense.recurrence_id) { haptic('light'); setAsking(expense); return }
    removeThisMonth(expense)
  }

  const handleAdd = () => {
    if (!entry) return
    sound.add()
    haptic('light')
    add(entry, { recurring, folderId: activeFolder?.id ?? null })
    setText('')
    scrollToEnd()
  }

  const cancelSelection = () => { setSelecting(false); setSelectedIds([]); setMoving(false) }
  const toggleSelection = (expense: Expense) => {
    haptic('light')
    setSelectedIds((prev) => (prev.includes(expense.id) ? prev.filter((id) => id !== expense.id) : [...prev, expense.id]))
  }
  const finishMove = (folderId: string | null) => {
    moveExpenses(selectedIds, folderId)
    const destination = folders.find((folder) => folder.id === folderId)?.name ?? 'Sem pasta'
    setNotice(`${selectedIds.length} ${selectedIds.length === 1 ? 'conta movida' : 'contas movidas'} para ${destination}`)
    haptic('success')
    cancelSelection()
  }

  const row = (expense: Expense) => (
    <SwipeRow
      key={expense.id}
      lead={expense.status === 'pendente' ? { label: 'Pagar', onTrigger: () => pay(expense) } : undefined}
      onRemove={() => handleRemove(expense)}
      onPress={() => (selecting ? toggleSelection(expense) : setEditing(expense))}
      disabled={selecting}
    >
      <BillRow
        expense={expense}
        me={me}
        selecting={selecting}
        selected={selectedIds.includes(expense.id)}
        onToggleSelect={toggleSelection}
        onPay={pay}
        overdue={Boolean(expense.status === 'pendente' && expense.due_day && expense.due_day < today && isCurrentMonth(month))}
      />
    </SwipeRow>
  )

  return (
    <Screen
      title="Contas"
      tint="blue"
      scrollRef={scroller}
      onScroll={(el) => { nearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80 }}
      toolbar={ready && shown.length > 0 && (
        <button className="glass-button" onClick={() => { sound.tick(); if (selecting) cancelSelection(); else setSelecting(true) }}>
          {selecting ? 'OK' : 'Selecionar'}
        </button>
      )}
      accessory={
        <Accessory
          toasts={<>
            {notice && <Toast key="notice" duration={3500} onDismiss={() => setNotice(null)}>{notice}</Toast>}
            {deleted && (
              <Toast key="deleted" duration={5000} action={{ label: 'Desfazer', onClick: () => { haptic('light'); restore(deleted); setDeleted(null) } }} onDismiss={() => setDeleted(null)}>
                {deleted.title} apagada
              </Toast>
            )}
          </>}
        >
          {selecting ? (
            <div className="selection-bar glass">
              <strong>{selectedIds.length ? `${selectedIds.length} ${selectedIds.length === 1 ? 'selecionada' : 'selecionadas'}` : 'Selecione as contas'}</strong>
              <button className="glass-button is-prominent" disabled={!selectedIds.length} onClick={() => setMoving(true)}>Mover</button>
            </div>
          ) : (
            <Composer
              value={text}
              onChange={setText}
              onSubmit={handleAdd}
              canSubmit={Boolean(entry)}
              placeholder="Luz 180 dia 10"
              label="Nova conta"
              sendLabel="Lançar conta"
              onFocus={() => scrollToEnd()}
              chip={entry && entry.amountCents > 0 ? `${formatBRL(entry.amountCents)}${entry.dueDay ? ` · dia ${entry.dueDay}` : ''}` : null}
              leading={
                <button
                  type="button"
                  role="switch"
                  aria-checked={recurring}
                  aria-label="Todo mês"
                  className={`repeat${recurring ? ' is-on' : ''}`}
                  onPointerDown={(e) => e.preventDefault()}
                  onClick={() => { setRecurring((v) => !v); sound.tick(); haptic('light') }}
                >
                  <Icon name="repeat" size={16} weight={2.2} />
                  {!text.trim() && <span>Todo mês</span>}
                </button>
              }
            />
          )}
        </Accessory>
      }
    >
      <div className="month-switch">
        <strong aria-live="polite">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span key={month} style={{ display: 'inline-block' }} initial={{ opacity: 0, y: reduced ? 0 : 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: reduced ? 0 : -6 }} transition={{ duration: 0.16 }}>
              {cap(monthLabel(month))}
            </motion.span>
          </AnimatePresence>
        </strong>
        {!isCurrentMonth(month) && <button className="today" onClick={() => { sound.tick(); haptic('light'); onMonthChange(monthKey()) }}>Hoje</button>}
        <button className="glass-button" onClick={() => goMonth(-1)} aria-label="Mês anterior"><Icon name="left" size={17} weight={2.4} /></button>
        <button className="glass-button" onClick={() => goMonth(1)} aria-label="Próximo mês"><Icon name="right" size={17} weight={2.4} /></button>
      </div>

      <section className="summary" aria-label="Resumo do mês">
        <p className="summary-head">
          <span>{summary.pendingCents > 0 ? 'Falta pagar' : summary.totalCents > 0 ? 'Mês pago' : 'Nada lançado'}</span>
          <span><Rolling value={paid.length} /> de {shown.length} pagas</span>
        </p>
        <Money className="summary-value" cents={summary.pendingCents > 0 ? summary.pendingCents : summary.paidCents} />
        <div className="meter" role="progressbar" aria-label="Contas pagas no mês" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}>
          <motion.span initial={false} animate={{ scaleX: progress }} transition={{ type: 'spring', stiffness: 200, damping: 30 }} />
        </div>
        <p className="summary-line">
          <span>{filterTitle}</span>
          <span>{formatAmount(summary.paidCents)} de {formatAmount(summary.totalCents)}</span>
        </p>
      </section>

      {summary.debt && (
        <Section>
          <Row
            icon={<Avatar person={summary.debt.from} size={30} />}
            title={summary.debt.from === me ? <>Você deve <strong>{formatBRL(summary.debt.cents)}</strong> para {summary.debt.to}</> : <>{summary.debt.from} te deve <strong>{formatBRL(summary.debt.cents)}</strong></>}
            detail="Conta do que já foi pago no mês"
          >
            <button className="pill" onClick={() => { sound.settle(); haptic('success'); settleMonth() }}>Acertar</button>
          </Row>
        </Section>
      )}
      {!summary.debt && paid.length > 0 && <p className="section-footer quits" style={{ margin: '10px var(--margin) 0' }}>Vocês estão quites.</p>}

      <FolderChips folders={folders} active={filter} counts={counts} onChange={(next) => { sound.tick(); setFilter(next); cancelSelection() }} onAdd={() => setFolderSheet({ folder: null })} />

      {error && <button className="banner" onClick={clearError}>{error}</button>}
      {!ready && <Skeleton rows={3} />}
      {ready && shown.length === 0 && <Empty icon={<Glyph name="doc" size={56} />} title={filter === 'all' ? 'Nenhuma conta' : `Nada em ${filterTitle}`} hint="Escreva abaixo: “Luz 180”. Ligue “Todo mês” para ela voltar sozinha." />}

      {pending.length > 0 && (
        <Section header={<>A pagar · <Rolling value={pending.length} /></>} action={activeFolder && <button className="link" onClick={() => setFolderSheet({ folder: activeFolder })}>Editar pasta</button>}>
          <ul className="list bill-list"><AnimatePresence initial={false} mode="popLayout">{pending.map(row)}</AnimatePresence></ul>
        </Section>
      )}
      {pending.length === 0 && activeFolder && (
        <div className="section-header" style={{ padding: '18px calc(var(--margin) + 16px) 0', justifyContent: 'flex-end' }}>
          <button className="link" onClick={() => setFolderSheet({ folder: activeFolder })}>Editar pasta</button>
        </div>
      )}

      {paid.length > 0 && (
        <Section header={`Pagas · ${paid.length}`}>
          <ul className="list bill-list"><AnimatePresence initial={false} mode="popLayout">{paid.map(row)}</AnimatePresence></ul>
        </Section>
      )}

      <EditExpenseSheet
        expense={editing}
        me={me}
        onClose={() => setEditing(null)}
        onSave={(expense, changes, scope) => { edit(expense, changes, scope); sound.add(); setEditing(null) }}
        onSplit={setSplit}
        onRemove={handleRemove}
      />

      <ActionSheet
        open={Boolean(asking)}
        onClose={() => setAsking(null)}
        title={asking ? `Apagar ${asking.title}?` : ''}
        message="Esta conta se repete todo mês. As que já foram pagas não são apagadas."
        actions={asking ? [
          { label: `Apagar só a de ${monthLabel(asking.month)}`, destructive: true, onSelect: () => { removeThisMonth(asking); setAsking(null) } },
          {
            label: 'Apagar esta e as próximas',
            destructive: true,
            onSelect: () => {
              sound.undo(); haptic('medium'); stopRecurring(asking); setAsking(null)
              setNotice(`${asking.title} parou de se repetir`)
            },
          },
        ] : []}
      />

      <FolderSheet
        open={folderSheet !== null}
        folder={folderSheet?.folder ?? null}
        onClose={() => setFolderSheet(null)}
        onSave={(name, color) => {
          if (folderSheet?.folder) editFolder(folderSheet.folder, name, color)
          else addFolder(name, color)
          setFolderSheet(null)
          haptic('success')
        }}
        onDelete={(folder) => {
          removeFolder(folder)
          if (filter === folder.id) setFilter('unfiled')
          setFolderSheet(null)
        }}
      />
      <MoveSheet open={moving} count={selectedIds.length} folders={folders} onMove={finishMove} onClose={() => setMoving(false)} />
      <Done show={closing} label="Mês pago" />
    </Screen>
  )
}

function BillRow({ expense, me, selecting, selected, onToggleSelect, onPay, overdue }: {
  expense: Expense
  me: string
  selecting: boolean
  selected: boolean
  onToggleSelect: (expense: Expense) => void
  onPay: (expense: Expense) => void
  overdue: boolean
}) {
  const paid = expense.status === 'pago'
  const meta = [
    paid
      ? expense.paid_by ? `Paga por ${expense.paid_by === me ? 'você' : expense.paid_by}` : 'Paga'
      : expense.due_day ? `${overdue ? 'Venceu' : 'Vence'} dia ${expense.due_day}` : 'Sem vencimento',
    expense.recurrence_id ? 'todo mês' : null,
    expense.split !== 'meio' ? (expense.split === me ? 'só sua' : `só ${expense.split}`) : null,
    expense.settled ? 'acertada' : null,
  ].filter(Boolean)
  return (
    <div className={`item${paid ? ' is-done' : ''}`}>
      {selecting
        ? <Check variant="select" checked={selected} onClick={() => onToggleSelect(expense)} label={`${selected ? 'Desmarcar' : 'Selecionar'} ${expense.title}`} />
        : <Check checked={paid} onClick={() => onPay(expense)} label={`${paid ? 'Desmarcar' : 'Pagar'} ${expense.title}`} />}
      <span className="item-text">
        <span className="item-name">{expense.title}</span>
        <span className={`item-meta${overdue ? ' is-overdue' : ''}`}>{meta.join(' · ')}</span>
      </span>
      <span className="item-amount">{formatAmount(expense.amount_cents)}</span>
    </div>
  )
}

function EditExpenseSheet({ expense, me, onClose, onSave, onSplit, onRemove }: {
  expense: Expense | null
  me: string
  onClose: () => void
  onSave: (expense: Expense, entry: ExpenseEntry, scope: 'mes' | 'futuro') => void
  onSplit: (expense: Expense, split: string) => void
  onRemove: (expense: Expense) => void
}) {
  const [text, setText] = useState('')
  const [last, setLast] = useState<Expense | null>(null)
  const [split, setSplitState] = useState('meio')
  const [scopeAsk, setScopeAsk] = useState(false)
  useEffect(() => {
    if (!expense) return
    setLast(expense)
    setSplitState(expense.split)
    setText(`${expense.title} ${(expense.amount_cents / 100).toFixed(2).replace('.', ',')}${expense.due_day ? ` dia ${expense.due_day}` : ''}`)
  }, [expense])
  const current = expense ?? last
  const understood = parseExpenseEntry(text)
  const label = current ? monthLabel(current.month) : ''
  const save = (scope: 'mes' | 'futuro') => { if (current && understood) onSave(current, understood, scope) }
  // conta que se repete pergunta o alcance, como o Calendário ao salvar um evento repetido
  const done = () => { if (!understood || !current) return; if (current.recurrence_id) setScopeAsk(true); else save('mes') }

  return (
    <>
      <Sheet open={Boolean(expense)} onClose={onClose} title="Editar conta" onDone={done} doneDisabled={!understood}>
        {current && (
          <form onSubmit={(e) => { e.preventDefault(); done() }}>
            <Section footer={understood ? `${understood.title} · ${formatBRL(understood.amountCents)}${understood.dueDay ? ` · dia ${understood.dueDay}` : ''}` : 'Escreva o nome'}>
              <input className="field" data-autofocus value={text} onChange={(e) => setText(e.target.value)} aria-label="Editar conta" autoComplete="off" enterKeyHint="done" />
            </Section>
            <Section header="Divisão">
              <div className="pad">
                <Segmented
                  label="Divisão da conta"
                  value={split}
                  onChange={(value) => { setSplitState(value); onSplit(current, value) }}
                  options={[{ value: 'meio', label: 'Meio a meio' }, ...PEOPLE.map((person) => ({ value: person as string, label: person === me ? `Só ${person}` : `Só ${person}` }))]}
                />
              </div>
            </Section>
            <Section>
              <Row title="Apagar conta" danger center onClick={() => onRemove(current)} />
            </Section>
          </form>
        )}
      </Sheet>
      <ActionSheet
        open={scopeAsk}
        onClose={() => setScopeAsk(false)}
        title="Esta conta se repete todo mês."
        actions={[
          { label: `Salvar só em ${label}`, onSelect: () => { setScopeAsk(false); save('mes') } },
          { label: `Salvar de ${label} em diante`, onSelect: () => { setScopeAsk(false); save('futuro') } },
        ]}
      />
    </>
  )
}
