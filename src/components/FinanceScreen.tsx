import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { ExpensesStore } from '../hooks/useExpenses'
import { useViewportFit } from '../hooks/useViewportFit'
import { summarize } from '../lib/balance'
import { haptic } from '../lib/haptics'
import { isCurrentMonth, monthKey, monthLabel, shiftMonth } from '../lib/month'
import { formatAmount, formatBRL, parseExpenseEntry } from '../lib/money'
import { sound } from '../lib/sound'
import type { Expense } from '../lib/types'
import { PEOPLE } from '../lib/types'
import { Avatar } from './Avatar'
import { FolderChips, FolderSheet, MoveSheet, type FolderFilter } from './FinanceFolders'
import { Money } from './Money'
import { Rolling } from './Rolling'
import { Check, Composer, Dock, Done, Empty, Icon, Screen, Segmented, Sheet, Skeleton, SwipeRow, Toast } from './ui'

interface Props {
  store: ExpensesStore
  me: string
  month: string
  onMonthChange: (month: string) => void
}

const splitLabel = (expense: Expense, me: string) =>
  expense.split === 'meio' ? '½' : expense.split === me ? 'só sua' : `só ${expense.split}`

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
  const filterTitle = filter === 'all' ? 'todas as contas' : filter === 'unfiled' ? 'sem pasta' : activeFolder?.name ?? 'pasta'
  const progress = summary.totalCents > 0 ? summary.paidCents / summary.totalCents : 0
  const entry = parseExpenseEntry(text)
  const today = new Date().getDate()

  const counts = {
    all: expenses.length,
    unfiled: expenses.filter((e) => !e.folder_id).length,
    byFolder: Object.fromEntries(folders.map((f) => [f.id, expenses.filter((e) => e.folder_id === f.id).length])),
  }

  // "mês pago" só na virada, nunca ao abrir um mês que já estava fechado
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
    const destination = folders.find((folder) => folder.id === folderId)?.name ?? 'sem pasta'
    setNotice(`${selectedIds.length} ${selectedIds.length === 1 ? 'conta movida' : 'contas movidas'} para ${destination}`)
    haptic('success')
    cancelSelection()
  }

  const rowProps = (expense: Expense) => ({
    expense, me, selecting,
    selected: selectedIds.includes(expense.id),
    onToggleSelect: toggleSelection,
    onEdit: setEditing,
    onPay: pay,
  })

  return (
    <Screen
      title="contas"
      scrollRef={scroller}
      onScroll={(el) => { nearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80 }}
      footer={
        <Dock
          toasts={<>
            {notice && <Toast key="notice" duration={3500} onDismiss={() => setNotice(null)}>{notice}</Toast>}
            {deleted && (
              <Toast key="deleted" duration={5000} action={{ label: 'desfazer', onClick: () => { haptic('light'); restore(deleted); setDeleted(null) } }} onDismiss={() => setDeleted(null)}>
                {deleted.title} apagada
              </Toast>
            )}
          </>}
        >
          {selecting ? (
            <div className="selection-bar">
              <button className="btn btn-plain" onClick={cancelSelection}>cancelar</button>
              <strong>{selectedIds.length ? `${selectedIds.length} ${selectedIds.length === 1 ? 'selecionada' : 'selecionadas'}` : 'selecione as contas'}</strong>
              <button className="btn btn-tinted" disabled={!selectedIds.length} onClick={() => setMoving(true)}>mover</button>
            </div>
          ) : (
            <Composer
              value={text}
              onChange={setText}
              onSubmit={handleAdd}
              canSubmit={Boolean(entry)}
              placeholder="luz 180 dia 10"
              label="Nova conta"
              sendLabel="Lançar conta"
              onFocus={() => scrollToEnd()}
              chip={entry && entry.amountCents > 0 ? <>{formatBRL(entry.amountCents)}{entry.dueDay ? ` · dia ${entry.dueDay}` : ''}</> : null}
              leading={
                <button
                  type="button"
                  role="switch"
                  aria-checked={recurring}
                  aria-label="todo mês"
                  className={`repeat${recurring ? ' is-on' : ''}`}
                  onPointerDown={(e) => e.preventDefault()}
                  onClick={() => { setRecurring((v) => !v); sound.tick(); haptic('light') }}
                >
                  <Icon name="repeat" size={16} />
                  {!text.trim() && <span>todo mês</span>}
                </button>
              }
            />
          )}
        </Dock>
      }
    >
      <div className="month-bar">
        <button className="icon-button" onClick={() => goMonth(-1)} aria-label="Mês anterior"><Icon name="left" size={18} /></button>
        <div className="month-name" aria-live="polite">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span key={month} initial={{ opacity: 0, y: reduced ? 0 : 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: reduced ? 0 : -6 }} transition={{ duration: 0.16 }}>
              {monthLabel(month)}
            </motion.span>
          </AnimatePresence>
        </div>
        <button className="icon-button" onClick={() => goMonth(1)} aria-label="Próximo mês"><Icon name="right" size={18} /></button>
        {!isCurrentMonth(month) && <button className="link-button" onClick={() => { sound.tick(); haptic('light'); onMonthChange(monthKey()) }}>hoje</button>}
      </div>

      <section className="summary">
        <p className="summary-label">{summary.pendingCents > 0 ? 'falta pagar' : summary.totalCents > 0 ? 'mês pago' : 'nada lançado'}{filter !== 'all' ? ` · ${filterTitle}` : ''}</p>
        <Money className="summary-value" cents={summary.pendingCents > 0 ? summary.pendingCents : summary.paidCents} />
        <div className="meter" role="progressbar" aria-label="Contas pagas no mês" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}>
          <motion.span initial={false} animate={{ scaleX: progress }} transition={{ type: 'spring', stiffness: 200, damping: 30 }} />
        </div>
        <p className="summary-line">
          <span><Rolling value={paid.length} /> de {shown.length} pagas</span>
          <span>{formatAmount(summary.paidCents)} de {formatAmount(summary.totalCents)}</span>
        </p>
      </section>

      <AnimatePresence initial={false}>
        {summary.debt ? (
          <motion.div key={`debt-${summary.debt.from}-${summary.debt.cents}`} className="debt" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
            <Avatar person={summary.debt.from} size={28} />
            <span className="debt-text">
              {summary.debt.from === me
                ? <>você deve <strong>{formatBRL(summary.debt.cents)}</strong> para {summary.debt.to}</>
                : <>{summary.debt.from} te deve <strong>{formatBRL(summary.debt.cents)}</strong></>}
            </span>
            <button className="btn btn-tinted" onClick={() => { sound.settle(); haptic('success'); settleMonth() }}>acertamos</button>
          </motion.div>
        ) : shown.length > 0 ? (
          <motion.p key="quites" className="quits" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>vocês estão quites</motion.p>
        ) : null}
      </AnimatePresence>

      <FolderChips folders={folders} active={filter} counts={counts} onChange={(next) => { sound.tick(); setFilter(next); cancelSelection() }} onAdd={() => setFolderSheet({ folder: null })} />
      {activeFolder && <button className="link-button folder-edit" onClick={() => setFolderSheet({ folder: activeFolder })}>editar pasta {activeFolder.name}</button>}

      {error && <button className="banner" onClick={clearError}>{error}</button>}
      {!ready && <Skeleton rows={3} />}
      {ready && shown.length === 0 && <Empty title={`nada em ${filterTitle}`} hint="escreva abaixo: “luz 180”. ligue “todo mês” para ela voltar sozinha." />}

      {ready && shown.length > 0 && (
        <div className="section-head">
          <h2>{pending.length > 0 ? 'a pagar' : 'tudo pago'}{pending.length > 0 && <small><Rolling value={pending.length} /></small>}</h2>
          <button className="link-button" onClick={() => { sound.tick(); if (selecting) cancelSelection(); else setSelecting(true) }}>{selecting ? 'cancelar' : 'selecionar'}</button>
        </div>
      )}

      <ul className="list">
        <AnimatePresence initial={false} mode="popLayout">
          {pending.map((expense) => (
            <SwipeRow key={expense.id} lead={{ label: 'pagar', onTrigger: () => pay(expense) }} onRemove={() => handleRemove(expense)} onPress={() => (selecting ? toggleSelection(expense) : setEditing(expense))} disabled={selecting}>
              <BillRow {...rowProps(expense)} overdue={Boolean(expense.due_day && expense.due_day < today && isCurrentMonth(month))} />
            </SwipeRow>
          ))}
        </AnimatePresence>
      </ul>

      {paid.length > 0 && (
        <>
          <div className="section-head"><h2>pagas<small>{paid.length}</small></h2></div>
          <ul className="list">
            <AnimatePresence initial={false} mode="popLayout">
              {paid.map((expense) => (
                <SwipeRow key={expense.id} onPress={() => (selecting ? toggleSelection(expense) : setEditing(expense))} disabled={selecting}>
                  <BillRow {...rowProps(expense)} overdue={false} />
                </SwipeRow>
              ))}
            </AnimatePresence>
          </ul>
        </>
      )}

      <EditExpenseSheet
        expense={editing}
        me={me}
        onClose={() => setEditing(null)}
        onSave={(expense, entry, scope) => { edit(expense, entry, scope); sound.add(); setEditing(null) }}
        onSplit={setSplit}
        onRemove={handleRemove}
      />

      <Sheet open={Boolean(asking)} onClose={() => setAsking(null)} title={asking ? `apagar ${asking.title}?` : 'apagar'}>
        {asking && (
          <div className="sheet-form">
            <p className="sheet-text">Essa conta se repete todo mês.</p>
            <button className="btn btn-tinted" onClick={() => { removeThisMonth(asking); setAsking(null) }}>só de {monthLabel(asking.month)}</button>
            <button className="btn btn-danger" onClick={() => {
              sound.undo(); haptic('medium'); stopRecurring(asking); setAsking(null)
              setNotice(`${asking.title} parou de se repetir`)
            }}>de {monthLabel(asking.month)} em diante</button>
            <p className="field-hint">Em diante, ela para de se repetir. As contas já pagas ficam.</p>
          </div>
        )}
      </Sheet>

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
      <Done show={closing} label="mês pago" />
    </Screen>
  )
}

function BillRow({ expense, me, selecting, selected, onToggleSelect, onPay, overdue }: {
  expense: Expense
  me: string
  selecting: boolean
  selected: boolean
  onToggleSelect: (expense: Expense) => void
  onEdit: (expense: Expense) => void
  onPay: (expense: Expense) => void
  overdue: boolean
}) {
  const paid = expense.status === 'pago'
  const meta = [
    paid
      ? expense.paid_by ? `paga por ${expense.paid_by === me ? 'você' : expense.paid_by}` : 'paga'
      : expense.due_day ? `vence dia ${expense.due_day}` : 'sem vencimento',
    expense.recurrence_id ? 'todo mês' : null,
    expense.split !== 'meio' ? splitLabel(expense, me) : null,
    expense.settled ? 'acertada' : null,
  ].filter(Boolean)
  return (
    <div className={`item bill${paid ? ' is-done' : ''}`}>
      {selecting && <Check checked={selected} onClick={() => onToggleSelect(expense)} label={`${selected ? 'Desmarcar' : 'Selecionar'} ${expense.title}`} />}
      <span className="item-text">
        <span className="item-name">{expense.title}</span>
        <span className={`item-meta${overdue ? ' is-overdue' : ''}`}>
          {paid && expense.paid_by && <Avatar person={expense.paid_by} size={15} />}
          {meta.join(' · ')}
        </span>
      </span>
      <span className="item-amount">{formatAmount(expense.amount_cents)}</span>
      {!selecting && <Check checked={paid} onClick={() => onPay(expense)} label={`${paid ? 'Desmarcar' : 'Pagar'} ${expense.title}`} />}
    </div>
  )
}

function EditExpenseSheet({ expense, me, onClose, onSave, onSplit, onRemove }: {
  expense: Expense | null
  me: string
  onClose: () => void
  onSave: (expense: Expense, entry: NonNullable<ReturnType<typeof parseExpenseEntry>>, scope: 'mes' | 'futuro') => void
  onSplit: (expense: Expense, split: string) => void
  onRemove: (expense: Expense) => void
}) {
  const [text, setText] = useState('')
  const [last, setLast] = useState<Expense | null>(null)
  const [split, setSplitState] = useState('meio')
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
  return (
    <Sheet open={Boolean(expense)} onClose={onClose} title="editar conta">
      {current && (
        <form className="sheet-form" onSubmit={(e) => { e.preventDefault(); if (!current.recurrence_id) save('mes') }}>
          <input className="field" data-autofocus value={text} onChange={(e) => setText(e.target.value)} aria-label="Editar conta" autoComplete="off" enterKeyHint="done" />
          <p className="field-hint">{understood ? `${understood.title} · ${formatBRL(understood.amountCents)}${understood.dueDay ? ` · dia ${understood.dueDay}` : ''}` : 'escreva o nome'}</p>

          <span className="field-label" id="split-label">divisão</span>
          <Segmented
            label="Divisão da conta"
            value={split}
            onChange={(value) => { setSplitState(value); onSplit(current, value) }}
            options={[{ value: 'meio', label: 'meio a meio' }, ...PEOPLE.map((person) => ({ value: person as string, label: person === me ? `só ${person} (você)` : `só ${person}` }))]}
          />

          {current.recurrence_id ? (
            <>
              <button type="button" className="btn btn-primary" disabled={!understood} onClick={() => save('mes')}>só de {label}</button>
              <button type="button" className="btn btn-tinted" disabled={!understood} onClick={() => save('futuro')}>de {label} em diante</button>
              <p className="field-hint">Em diante, a conta que se repete passa a ser assim.</p>
            </>
          ) : (
            <button type="submit" className="btn btn-primary" disabled={!understood}>salvar</button>
          )}
          <button type="button" className="btn btn-plain is-danger" onClick={() => onRemove(current)}>apagar conta</button>
        </form>
      )}
    </Sheet>
  )
}
