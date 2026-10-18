import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { ExpensesStore } from '../hooks/useExpenses'
import { useViewportFit } from '../hooks/useViewportFit'
import { summarize } from '../lib/balance'
import { haptic } from '../lib/haptics'
import { isCurrentMonth, monthKey, monthLabel, shiftMonth } from '../lib/month'
import { formatAmount, formatBRL, parseExpenseEntry, type ExpenseEntry } from '../lib/money'
import { sound } from '../lib/sound'
import type { Expense, ExpenseFolder } from '../lib/types'
import { PEOPLE } from '../lib/types'
import { Avatar } from './Avatar'
import { FOLDER_TAG, FolderSheet, FolderViews, MoveSheet, type FolderFilter } from './FinanceFolders'
import { Money } from './Money'
import { Rolling } from './Rolling'
import { PAGE_ICON } from './TabBar'
import { Check, Composer, Confirm, Dock, Done, Empty, GroupHead, Icon, NewRow, Page, Prop, Select, Sheet, Skeleton, SwipeRow, Tag, Toast } from './ui'

interface Props {
  store: ExpensesStore
  me: string
  month: string
  onMonthChange: (month: string) => void
}

const YEAR = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' })
const fullMonth = (key: string) => {
  const [year, month] = key.split('-').map(Number)
  const text = YEAR.format(new Date(year, month - 1, 1))
  return text.charAt(0).toUpperCase() + text.slice(1)
}

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
  const [folderSheet, setFolderSheet] = useState<{ folder: ExpenseFolder | null } | null>(null)
  const [selecting, setSelecting] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [moving, setMoving] = useState(false)
  const scroller = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLInputElement>(null)
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

  const row = (expense: Expense) => {
    const folder = filter === 'all' ? folders.find((item) => item.id === expense.folder_id) : undefined
    return (
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
          folder={folder}
          selecting={selecting}
          selected={selectedIds.includes(expense.id)}
          onToggleSelect={toggleSelection}
          onPay={pay}
          overdue={Boolean(expense.status === 'pendente' && expense.due_day && expense.due_day < today && isCurrentMonth(month))}
        />
      </SwipeRow>
    )
  }

  return (
    <Page
      icon={PAGE_ICON.contas}
      title="Contas"
      scrollRef={scroller}
      onScroll={(el) => { nearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80 }}
      properties={
        <>
          <Prop icon="calendar" label="Mês">
            <span className="month">
              <button className="icon-button" onClick={() => goMonth(-1)} aria-label="Mês anterior"><Icon name="left" size={16} /></button>
              <strong aria-live="polite">
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.span key={month} style={{ display: 'inline-block' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduced ? 0 : 0.12 }}>
                    {fullMonth(month)}
                  </motion.span>
                </AnimatePresence>
              </strong>
              <button className="icon-button" onClick={() => goMonth(1)} aria-label="Próximo mês"><Icon name="right" size={16} /></button>
            </span>
            {!isCurrentMonth(month) && <button className="text-button" onClick={() => { sound.tick(); haptic('light'); onMonthChange(monthKey()) }}>Hoje</button>}
          </Prop>
          <Prop icon="money" label={summary.pendingCents > 0 || summary.totalCents === 0 ? 'Falta pagar' : 'Pago no mês'}>
            <Money className="strong" cents={summary.pendingCents > 0 ? summary.pendingCents : summary.paidCents} />
            {summary.totalCents > 0 && summary.pendingCents > 0 && <span style={{ color: 'var(--text-3)' }}>de {formatBRL(summary.totalCents)}</span>}
          </Prop>
          <Prop icon="status" label="Pagas">
            <span><Rolling value={paid.length} /> de {shown.length}</span>
            <span className="mini-meter" role="progressbar" aria-label="Contas pagas no mês" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}>
              <motion.span initial={false} animate={{ scaleX: progress }} transition={{ duration: reduced ? 0 : 0.3 }} />
            </span>
          </Prop>
          <Prop icon="split" label="Acerto">
            {summary.debt ? (
              <>
                <Avatar person={summary.debt.from} size={18} />
                <span className="debt">{summary.debt.from === me ? `Você deve ${formatBRL(summary.debt.cents)} para ${summary.debt.to}` : `${summary.debt.from} te deve ${formatBRL(summary.debt.cents)}`}</span>
                <button className="text-button" onClick={() => { sound.settle(); haptic('success'); settleMonth() }}>Acertar</button>
              </>
            ) : <span className="quits">Vocês estão quites</span>}
          </Prop>
        </>
      }
      footer={
        <Dock
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
            <div className="selection-bar">
              <button className="text-button is-quiet" onClick={cancelSelection}>Cancelar</button>
              <strong>{selectedIds.length ? `${selectedIds.length} ${selectedIds.length === 1 ? 'selecionada' : 'selecionadas'}` : 'Selecione as contas'}</strong>
              <button className="text-button" disabled={!selectedIds.length} onClick={() => setMoving(true)}>Mover</button>
            </div>
          ) : (
            <Composer
              inputRef={input}
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
                  <Icon name="repeat" size={15} />
                  {!text.trim() && <span>Todo mês</span>}
                </button>
              }
            />
          )}
        </Dock>
      }
    >
      <FolderViews
        folders={folders}
        active={filter}
        counts={counts}
        onChange={(next) => { sound.tick(); setFilter(next); cancelSelection() }}
        onAdd={() => setFolderSheet({ folder: null })}
      />
      {(activeFolder || (ready && shown.length > 0)) && (
        <div className="table-tools">
          {activeFolder && <button className="text-button is-quiet" onClick={() => setFolderSheet({ folder: activeFolder })}>Editar pasta</button>}
          {ready && shown.length > 0 && <button className="text-button" onClick={() => { sound.tick(); if (selecting) cancelSelection(); else setSelecting(true) }}>{selecting ? 'Concluir' : 'Selecionar'}</button>}
        </div>
      )}

      {error && <button className="banner" onClick={clearError}>{error}</button>}
      {!ready && <Skeleton rows={3} />}
      {ready && shown.length === 0 && <Empty title={`Nada em ${filterTitle.toLowerCase()}.`} hint="Escreva abaixo: “Luz 180”. Ligue “Todo mês” para ela voltar sozinha." />}

      {ready && shown.length > 0 && (
        <div className="table-head" aria-hidden>
          <span />
          <span><Icon name="text" size={14} />Nome</span>
          <span><Icon name="calendar" size={14} />Vence</span>
          <span><Icon name="hash" size={14} />Valor</span>
        </div>
      )}

      {pending.length > 0 && (
        <>
          <GroupHead count={<Rolling value={pending.length} />}>A pagar</GroupHead>
          <ul className="table"><AnimatePresence initial={false} mode="popLayout">{pending.map(row)}</AnimatePresence></ul>
        </>
      )}
      {ready && !selecting && <NewRow label="Nova conta" onClick={() => input.current?.focus()} />}
      {paid.length > 0 && (
        <>
          <GroupHead count={paid.length}>Pagas</GroupHead>
          <ul className="table"><AnimatePresence initial={false} mode="popLayout">{paid.map(row)}</AnimatePresence></ul>
        </>
      )}

      <EditExpenseSheet
        expense={editing}
        me={me}
        folders={folders}
        onClose={() => setEditing(null)}
        onSave={(expense, changes, scope) => { edit(expense, changes, scope); sound.add(); setEditing(null) }}
        onSplit={setSplit}
        onRemove={handleRemove}
      />

      <Confirm
        open={Boolean(asking)}
        onClose={() => setAsking(null)}
        title={asking ? `Apagar ${asking.title}?` : ''}
        message="Esta conta se repete todo mês. As que já foram pagas não são apagadas."
        actions={asking ? [
          { label: `Só a de ${monthLabel(asking.month)}`, onSelect: () => { removeThisMonth(asking); setAsking(null) } },
          {
            label: 'Esta e as próximas',
            danger: true,
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
    </Page>
  )
}

function BillRow({ expense, me, folder, selecting, selected, onToggleSelect, onPay, overdue }: {
  expense: Expense
  me: string
  folder?: ExpenseFolder
  selecting: boolean
  selected: boolean
  onToggleSelect: (expense: Expense) => void
  onPay: (expense: Expense) => void
  overdue: boolean
}) {
  const paid = expense.status === 'pago'
  const splitTag = expense.split === 'meio' ? null : expense.split === me ? 'Só sua' : `Só ${expense.split}`
  return (
    <div className={`bill${paid ? ' is-paid' : ''}`}>
      {selecting
        ? <Check checked={selected} onClick={() => onToggleSelect(expense)} label={`${selected ? 'Desmarcar' : 'Selecionar'} ${expense.title}`} />
        : <Check checked={paid} onClick={() => onPay(expense)} label={`${paid ? 'Desmarcar' : 'Pagar'} ${expense.title}`} />}
      <span className="bill-name">
        <strong>{expense.title}</strong>
        {(expense.recurrence_id || splitTag || folder || (paid && expense.paid_by) || expense.settled) && (
          <span className="bill-meta">
            {paid && expense.paid_by && <Tag color="green">Paga por {expense.paid_by === me ? 'você' : expense.paid_by}</Tag>}
            {expense.recurrence_id && <Tag color="gray">Todo mês</Tag>}
            {splitTag && <Tag color="purple">{splitTag}</Tag>}
            {folder && <Tag color={FOLDER_TAG[folder.color] ?? 'default'}>{folder.name}</Tag>}
            {expense.settled && <Tag>Acertada</Tag>}
          </span>
        )}
      </span>
      <span className={`bill-due${overdue ? ' is-late' : ''}`}>{expense.due_day ? `dia ${expense.due_day}` : '–'}</span>
      <span className="bill-amount">{formatAmount(expense.amount_cents)}</span>
    </div>
  )
}

function EditExpenseSheet({ expense, me, folders, onClose, onSave, onSplit, onRemove }: {
  expense: Expense | null
  me: string
  folders: ExpenseFolder[]
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
  const folder = current ? folders.find((item) => item.id === current.folder_id) : undefined
  const save = (scope: 'mes' | 'futuro') => { if (current && understood) onSave(current, understood, scope) }
  // conta que se repete pergunta o alcance antes de salvar
  const done = () => { if (!understood || !current) return; if (current.recurrence_id) setScopeAsk(true); else save('mes') }

  return (
    <>
      <Sheet open={Boolean(expense)} onClose={onClose} title="Conta" action={{ label: 'Salvar', onClick: done, disabled: !understood }}>
        {current && (
          <form onSubmit={(e) => { e.preventDefault(); done() }}>
            <input className="doc-title" data-autofocus value={text} onChange={(e) => setText(e.target.value)} aria-label="Editar conta" autoComplete="off" enterKeyHint="done" />
            <p className="doc-hint">Escreva como no campo: “Luz 213,50 dia 22”.</p>
            <dl className="props">
              <Prop icon="hash" label="Valor">{understood ? formatBRL(understood.amountCents) : '–'}</Prop>
              <Prop icon="calendar" label="Vence">{understood?.dueDay ? `dia ${understood.dueDay}` : <span style={{ color: 'var(--text-3)' }}>Vazio</span>}</Prop>
              <Prop icon="split" label="Divisão">
                <Select
                  label="Divisão da conta"
                  value={split}
                  onChange={(value) => { setSplitState(value); onSplit(current, value) }}
                  options={[{ value: 'meio', label: 'Meio a meio', color: 'blue' }, ...PEOPLE.map((person) => ({ value: person as string, label: `Só ${person}`, color: person === me ? 'purple' : 'pink' }))]}
                />
              </Prop>
              <Prop icon="repeat" label="Repete">{current.recurrence_id ? <Tag color="gray">Todo mês</Tag> : <span style={{ color: 'var(--text-3)' }}>Só este mês</span>}</Prop>
              <Prop icon="folder" label="Pasta">{folder ? <Tag color={FOLDER_TAG[folder.color] ?? 'default'}>{folder.name}</Tag> : <span style={{ color: 'var(--text-3)' }}>Sem pasta</span>}</Prop>
              <Prop icon="status" label="Status">{current.status === 'pago' ? `Paga por ${current.paid_by === me ? 'você' : current.paid_by ?? '–'}` : 'A pagar'}</Prop>
            </dl>
            <div className="doc-actions">
              <button type="button" className="button is-danger" onClick={() => onRemove(current)}><Icon name="trash" size={16} />Apagar conta</button>
            </div>
          </form>
        )}
      </Sheet>
      <Confirm
        open={scopeAsk}
        onClose={() => setScopeAsk(false)}
        title="Esta conta se repete todo mês"
        message="A mudança vale só para este mês ou daqui em diante?"
        actions={[
          { label: `Só em ${label}`, onSelect: () => { setScopeAsk(false); save('mes') } },
          { label: `De ${label} em diante`, onSelect: () => { setScopeAsk(false); save('futuro') } },
        ]}
      />
    </>
  )
}
