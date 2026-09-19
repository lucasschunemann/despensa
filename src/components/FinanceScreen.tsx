import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { ExpensesStore } from '../hooks/useExpenses'
import type { Presence } from '../hooks/usePresence'
import { useViewportFit } from '../hooks/useViewportFit'
import { summarize } from '../lib/balance'
import { haptic } from '../lib/haptics'
import { isCurrentMonth, monthKey, monthLabel, shiftMonth } from '../lib/month'
import { formatBRL, parseExpenseEntry } from '../lib/money'
import { sound } from '../lib/sound'
import type { Expense } from '../lib/types'
import { PEOPLE } from '../lib/types'
import { AppHeader } from './AppHeader'
import { CompleteOverlay } from './CompleteOverlay'
import { EditCard } from './EditCard'
import { ExpenseComposer } from './ExpenseComposer'
import { FinanceFolderNav, FolderEditor, MoveExpensesTray, SelectionBar, type FolderFilter } from './FinanceFolders'
import { MoneyRain } from './Money'
import { Receipt } from './Receipt'
import { PaidTicket, Ticket } from './Ticket'
import { Skeleton } from './Skeleton'
import { Toast } from './Toast'

interface Props {
  store: ExpensesStore
  me: string
  month: string
  presence: Presence
  onMonthChange: (month: string) => void
  onOpenMenu: () => void
  onHome?: () => void
}

export function FinanceScreen({ store, me, month, presence, onMonthChange, onOpenMenu, onHome }: Props) {
  const {
    expenses,
    folders,
    ready,
    error,
    clearError,
    add,
    togglePaid,
    cycleSplit,
    edit,
    remove,
    stopRecurring,
    restore,
    settleMonth,
    addFolder,
    editFolder,
    removeFolder,
    moveExpenses,
  } = store
  const [openId, setOpenId] = useState<string | null>(null)
  const [rain, setRain] = useState(0)
  const [deleted, setDeleted] = useState<Expense | null>(null)
  const [asking, setAsking] = useState<Expense | null>(null)
  const [editing, setEditing] = useState<Expense | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [closing, setClosing] = useState(false)
  const [direction, setDirection] = useState(1)
  const [folderFilter, setFolderFilter] = useState<FolderFilter>('all')
  const [folderEditor, setFolderEditor] = useState<null | undefined | (typeof folders)[number]>(undefined)
  const [selecting, setSelecting] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [moving, setMoving] = useState(false)
  const scroller = useRef<HTMLDivElement>(null)
  const [scrolled, setScrolled] = useState(false)
  // começa falso: ao abrir o mês a pessoa precisa ver o resumo, não o fim da lista
  const nearBottom = useRef(false)
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

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

  const filteredExpenses = expenses.filter((expense) =>
    folderFilter === 'all' ? true : folderFilter === 'unfiled' ? !expense.folder_id : expense.folder_id === folderFilter,
  )
  const summary = summarize(filteredExpenses, PEOPLE)
  const pending = filteredExpenses
    .filter((e) => e.status === 'pendente')
    .sort((a, b) => (a.due_day ?? 99) - (b.due_day ?? 99) || a.created_at.localeCompare(b.created_at))
  const paid = filteredExpenses
    .filter((e) => e.status === 'pago')
    .sort((a, b) => (a.paid_at ?? '').localeCompare(b.paid_at ?? ''))
  const done = expenses.length > 0 && expenses.every((expense) => expense.status === 'pago')
  const activeFolder = folders.find((folder) => folder.id === folderFilter)
  const filterTitle = folderFilter === 'all' ? 'todas as contas' : folderFilter === 'unfiled' ? 'sem pasta' : activeFolder?.name ?? 'pasta'

  // o que já estava no mês ao abrir entra em cascata; o que é lançado depois "sai da impressora"
  const known = useRef<Set<string> | null>(null)
  useEffect(() => {
    if (!ready) return
    if (!known.current) known.current = new Set(expenses.map((e) => e.id))
    else expenses.forEach((e) => known.current?.add(e.id))
  }, [ready, expenses])
  useEffect(() => {
    known.current = null
  }, [month])

  // "mês fechado" só dispara na virada, nunca ao abrir um mês que já estava fechado
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

  useEffect(() => {
    wasDone.current = null
  }, [month])

  const goMonth = (delta: number) => {
    setDirection(delta)
    haptic('light')
    onMonthChange(shiftMonth(month, delta))
  }

  const handleUnpay = (expense: Expense) => {
    sound.undo()
    haptic('light')
    togglePaid(expense)
  }

  const removeThisMonth = (expense: Expense) => {
    sound.undo()
    haptic('medium')
    remove(expense)
    setDeleted(expense)
    if (undoTimer.current) clearTimeout(undoTimer.current)
    undoTimer.current = setTimeout(() => setDeleted(null), 5000)
  }

  // conta que se repete pergunta antes: só deste mês, ou deste mês em diante
  const handleRemove = (expense: Expense) => {
    setOpenId(null)
    if (expense.recurrence_id) {
      haptic('light')
      setAsking(expense)
      return
    }
    removeThisMonth(expense)
  }

  const handleStop = (expense: Expense) => {
    sound.undo()
    haptic('medium')
    stopRecurring(expense)
    setAsking(null)
    setNotice(`${expense.title} parou de se repetir`)
    setTimeout(() => setNotice(null), 4000)
  }

  const handleSettle = () => {
    sound.tear()
    haptic('success')
    setTimeout(() => sound.settle(), 260)
    setRain((n) => n + 1)
    settleMonth()
  }

  const handleAdd: typeof add = (entry, options) => {
    sound.print()
    haptic('light')
    add(entry, { ...options, folderId: activeFolder?.id ?? null })
  }

  const cancelSelection = () => {
    setSelecting(false)
    setSelectedIds([])
    setMoving(false)
  }
  const toggleSelection = (expense: Expense) => {
    haptic('light')
    setSelectedIds((prev) => prev.includes(expense.id) ? prev.filter((id) => id !== expense.id) : [...prev, expense.id])
  }
  const finishMove = (folderId: string | null) => {
    moveExpenses(selectedIds, folderId)
    const destination = folders.find((folder) => folder.id === folderId)?.name ?? 'sem pasta'
    setNotice(`${selectedIds.length} ${selectedIds.length === 1 ? 'conta movida' : 'contas movidas'} para ${destination}`)
    sound.print()
    haptic('success')
    cancelSelection()
    setTimeout(() => setNotice(null), 3500)
  }

  return (
    <div className="app finance-app">
      <AppHeader title="contas" presence={presence} onOpenMenu={onOpenMenu} onHome={onHome} scrolled={scrolled} />

      <div className="finance-workspace">
        <FinanceFolderNav
          folders={folders}
          expenses={expenses}
          active={folderFilter}
          onChange={(next) => { setFolderFilter(next); cancelSelection() }}
          onAdd={() => setFolderEditor(null)}
          onEdit={setFolderEditor}
          selecting={selecting}
          onSelectMode={() => selecting ? cancelSelection() : setSelecting(true)}
        />
        <main className="finance-main">

      <div className="month-bar">
        <button className="month-arrow" onClick={() => goMonth(-1)} aria-label="Mês anterior">
          <svg viewBox="0 0 24 24" aria-hidden>
            <path d="M14.5 5.5 8 12l6.5 6.5" />
          </svg>
        </button>

        <div className="month-name">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={month}
              initial={{ opacity: 0, x: direction * 18 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction * -18 }}
              transition={{ type: 'spring', stiffness: 460, damping: 36 }}
            >
              {monthLabel(month)}
            </motion.span>
          </AnimatePresence>
        </div>

        <button className="month-arrow" onClick={() => goMonth(1)} aria-label="Próximo mês">
          <svg viewBox="0 0 24 24" aria-hidden>
            <path d="M9.5 5.5 16 12l-6.5 6.5" />
          </svg>
        </button>

        <AnimatePresence>
          {!isCurrentMonth(month) && (
            <motion.button
              className="month-today"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={() => {
                setDirection(month < monthKey() ? 1 : -1)
                onMonthChange(monthKey())
              }}
            >
              hoje
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      <div className="finance-filter-head">
        <div>{activeFolder && <span className={`folder-glyph folder-${activeFolder.color}`} aria-hidden><i /></span>}<span>{filterTitle}</span><small>{filteredExpenses.length}</small></div>
        <button onClick={() => selecting ? cancelSelection() : setSelecting(true)}>{selecting ? 'cancelar' : 'selecionar'}</button>
      </div>

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
        <Receipt
          monthName={monthLabel(month)}
          summary={summary}
          count={filteredExpenses.length}
          paidCount={paid.length}
          me={me}
          onSettle={handleSettle}
        />

        {!ready && <Skeleton variant="tickets" />}

        {ready && filteredExpenses.length === 0 && (
          <motion.div className="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <p className="empty-title">Nada em {filterTitle}</p>
            <p className="empty-hint">
              Digite aí embaixo: “luz 180”. Ligue “todo mês” para ela voltar sozinha.
            </p>
          </motion.div>
        )}

        <ul className="tickets">
          <AnimatePresence initial={false} mode="popLayout">
            {pending.map((expense, index) => (
              <Ticket
                key={expense.id}
                expense={expense}
                me={me}
                open={openId === expense.id}
                printing={Boolean(known.current && !known.current.has(expense.id))}
                enterDelay={index * 0.05}
                onOpenChange={(open) => setOpenId(open ? expense.id : null)}
                onStamp={() => setRain((n) => n + 1)}
                onPaid={togglePaid}
                onCycleSplit={cycleSplit}
                onRemove={handleRemove}
                onEdit={setEditing}
                selecting={selecting}
                selected={selectedIds.includes(expense.id)}
                onToggleSelect={toggleSelection}
              />
            ))}
          </AnimatePresence>
        </ul>

        {paid.length > 0 && (
          <>
            <p className="divider">Pagas · {paid.length}</p>
            <ul className="paid-list">
              <AnimatePresence initial={false} mode="popLayout">
                {paid.map((expense, index) => (
                  <PaidTicket
                    key={expense.id}
                    expense={expense}
                    me={me}
                    enterDelay={index * 0.02}
                    onUnpay={handleUnpay}
                    onEdit={setEditing}
                    selecting={selecting}
                    selected={selectedIds.includes(expense.id)}
                    onToggleSelect={toggleSelection}
                  />
                ))}
              </AnimatePresence>
            </ul>
          </>
        )}
      </div>

      <div className="dock">
        <AnimatePresence>
          {selecting && !moving && <SelectionBar count={selectedIds.length} total={filteredExpenses.length} onCancel={cancelSelection} onMove={() => setMoving(true)} onAll={() => setSelectedIds(selectedIds.length === filteredExpenses.length ? [] : filteredExpenses.map((expense) => expense.id))} />}
          {moving && <MoveExpensesTray count={selectedIds.length} folders={folders} onMove={finishMove} onClose={() => setMoving(false)} />}
          {folderEditor !== undefined && (
            <FolderEditor
              folder={folderEditor}
              onClose={() => setFolderEditor(undefined)}
              onSave={(name, color) => {
                if (folderEditor) editFolder(folderEditor, name, color)
                else addFolder(name, color)
                setFolderEditor(undefined)
                haptic('success')
              }}
              onDelete={folderEditor ? () => {
                removeFolder(folderEditor)
                if (folderFilter === folderEditor.id) setFolderFilter('unfiled')
                setFolderEditor(undefined)
              } : undefined}
            />
          )}
          {editing && (
            <EditCard
              key={`edit-${editing.id}`}
              title={`Editar ${editing.title}`}
              initial={`${editing.title} ${(editing.amount_cents / 100).toFixed(2).replace('.', ',')}${editing.due_day ? ` dia ${editing.due_day}` : ''}`}
              preview={(text) => {
                const entry = parseExpenseEntry(text)
                if (!entry) return null
                return `${entry.title} · ${formatBRL(entry.amountCents)}${entry.dueDay ? ` · dia ${entry.dueDay}` : ''}`
              }}
              actions={
                editing.recurrence_id
                  ? [
                      {
                        label: `só de ${monthLabel(editing.month)}`,
                        hint: 'nos próximos meses fica como estava',
                        onSave: (text) => {
                          const entry = parseExpenseEntry(text)
                          if (!entry) return
                          edit(editing, entry, 'mes')
                          sound.print()
                          setEditing(null)
                        },
                      },
                      {
                        label: `de ${monthLabel(editing.month)} em diante`,
                        hint: 'a conta que se repete passa a ser assim',
                        onSave: (text) => {
                          const entry = parseExpenseEntry(text)
                          if (!entry) return
                          edit(editing, entry, 'futuro')
                          sound.print()
                          setEditing(null)
                        },
                      },
                    ]
                  : [
                      {
                        label: 'salvar',
                        onSave: (text) => {
                          const entry = parseExpenseEntry(text)
                          if (!entry) return
                          edit(editing, entry, 'mes')
                          sound.print()
                          setEditing(null)
                        },
                      },
                    ]
              }
              onClose={() => setEditing(null)}
            />
          )}
          {asking && (
            <motion.div
              key="asking"
              className="choice"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ type: 'spring', stiffness: 440, damping: 34 }}
            >
              <p className="choice-title">Apagar {asking.title}?</p>
              <p className="choice-hint">Essa conta se repete todo mês.</p>
              <div className="choice-actions">
                <button
                  className="choice-option"
                  onClick={() => {
                    removeThisMonth(asking)
                    setAsking(null)
                  }}
                >
                  <strong>só de {monthLabel(asking.month)}</strong>
                  <small>nos próximos meses ela continua</small>
                </button>
                <button className="choice-option is-danger" onClick={() => handleStop(asking)}>
                  <strong>de {monthLabel(asking.month)} em diante</strong>
                  <small>para de se repetir; as já pagas ficam</small>
                </button>
              </div>
              <button className="choice-cancel" onClick={() => setAsking(null)}>
                cancelar
              </button>
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
              action={{
                label: 'Desfazer',
                onClick: () => {
                  if (undoTimer.current) clearTimeout(undoTimer.current)
                  haptic('light')
                  restore(deleted)
                  setDeleted(null)
                },
              }}
              onDismiss={() => setDeleted(null)}
            >
              {deleted.title} apagada
            </Toast>
          )}
        </AnimatePresence>
        {!editing && !selecting && <ExpenseComposer onAdd={handleAdd} onFocus={() => scrollToEnd()} />}
      </div>
        </main>
      </div>

      <AnimatePresence>{rain > 0 && <MoneyRain key={rain} onDone={() => setRain(0)} />}</AnimatePresence>
      <CompleteOverlay show={closing} label="mês fechado" variant="stamp" />
    </div>
  )
}
