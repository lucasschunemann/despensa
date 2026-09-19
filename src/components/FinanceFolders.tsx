import { motion, useReducedMotion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import type { Expense, ExpenseFolder } from '../lib/types'
import { formatBRL } from '../lib/money'
import { haptic } from '../lib/haptics'

export type FolderFilter = 'all' | 'unfiled' | string

const COLORS = ['blue', 'mint', 'orange', 'rose', 'violet', 'slate'] as const

function FolderGlyph({ color = 'slate' }: { color?: string }) {
  return <span className={`folder-glyph folder-${color}`} aria-hidden><i /></span>
}

export function FinanceFolderNav({ folders, expenses, active, onChange, onAdd, onEdit, selecting, onSelectMode }: {
  folders: ExpenseFolder[]
  expenses: Expense[]
  active: FolderFilter
  onChange: (id: FolderFilter) => void
  onAdd: () => void
  onEdit: (folder: ExpenseFolder) => void
  selecting: boolean
  onSelectMode: () => void
}) {
  const sum = (folderId?: string | null) => expenses.filter((e) => folderId === undefined || e.folder_id === folderId).reduce((n, e) => n + e.amount_cents, 0)
  const row = (id: FolderFilter, name: string, count: number, cents: number, color?: string) => {
    const folder = folders.find((item) => item.id === id)
    return (
      <motion.div key={id} layout className={`folder-row-wrap${active === id ? ' is-active' : ''}`}>
        <motion.button
          className="folder-row"
          aria-current={active === id ? 'page' : undefined}
          onClick={() => { haptic('light'); onChange(id) }}
          whileTap={{ scale: 0.98 }}
        >
          {id === 'all' ? <span className="folder-all" aria-hidden>⌘</span> : <FolderGlyph color={color} />}
          <span className="folder-row-copy"><strong>{name}</strong><small>{count} {count === 1 ? 'conta' : 'contas'}</small></span>
          <span className="folder-row-value">{formatBRL(cents)}</span>
        </motion.button>
        {folder && <button className="folder-edit" aria-label={`Editar pasta ${name}`} onClick={() => onEdit(folder)}>•••</button>}
      </motion.div>
    )
  }

  return (
    <aside className="finance-folders" aria-label="Pastas das contas">
      <div className="folder-nav-head"><span>pastas</span><button onClick={onAdd} aria-label="Nova pasta">+</button></div>
      <div className="folder-list">
        {row('all', 'todas', expenses.length, sum())}
        {folders.map((folder) => row(folder.id, folder.name, expenses.filter((e) => e.folder_id === folder.id).length, sum(folder.id), folder.color))}
        {row('unfiled', 'sem pasta', expenses.filter((e) => !e.folder_id).length, sum(null), 'slate')}
      </div>
      <button className={`folder-select-mode${selecting ? ' is-active' : ''}`} onClick={onSelectMode}>
        <svg viewBox="0 0 24 24" aria-hidden><rect x="4" y="4" width="16" height="16" rx="5"/><path d="m8 12 2.5 2.5L16 9"/></svg>
        {selecting ? 'cancelar seleção' : 'organizar contas'}
      </button>
    </aside>
  )
}

export function FolderEditor({ folder, onClose, onSave, onDelete }: {
  folder: ExpenseFolder | null | undefined
  onClose: () => void
  onSave: (name: string, color: string) => void
  onDelete?: () => void
}) {
  const [name, setName] = useState(folder?.name ?? '')
  const [color, setColor] = useState(folder?.color ?? 'blue')
  const input = useRef<HTMLInputElement>(null)
  useEffect(() => { input.current?.focus() }, [])
  return (
    <motion.div className="folder-editor" role="dialog" aria-modal="true" aria-labelledby="folder-editor-title" initial={{ opacity: 0, y: 22, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 18, scale: 0.98 }} transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}>
      <div className="folder-editor-head"><div><small>{folder ? 'editar pasta' : 'nova pasta'}</small><h3 id="folder-editor-title">um lugar para cada conta</h3></div><button onClick={onClose} aria-label="Fechar">×</button></div>
      <label className="folder-name-field"><FolderGlyph color={color}/><input ref={input} value={name} onChange={(e) => setName(e.target.value)} placeholder="ex.: casa" maxLength={36} /></label>
      <fieldset className="folder-colors"><legend>cor</legend>{COLORS.map((choice) => <button type="button" key={choice} className={`folder-color folder-${choice}${color === choice ? ' is-active' : ''}`} aria-label={`Cor ${choice}`} aria-pressed={color === choice} onClick={() => { haptic('light'); setColor(choice) }} />)}</fieldset>
      <div className="folder-editor-actions">{folder && onDelete && <button className="folder-delete" onClick={onDelete}>apagar pasta</button>}<button className="folder-save" disabled={!name.trim()} onClick={() => onSave(name.trim(), color)}>{folder ? 'salvar' : 'criar pasta'}</button></div>
    </motion.div>
  )
}

export function MoveExpensesTray({ count, folders, onMove, onClose }: {
  count: number
  folders: ExpenseFolder[]
  onMove: (folderId: string | null) => void
  onClose: () => void
}) {
  const reduced = useReducedMotion()
  return (
    <motion.div className="move-tray" role="dialog" aria-modal="true" aria-labelledby="move-title" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={reduced ? { duration: 0 } : { duration: 0.32, ease: [0.16, 1, 0.3, 1] }}>
      <div className="move-tray-head"><div><small>{count} {count === 1 ? 'selecionada' : 'selecionadas'}</small><h3 id="move-title">mover para</h3></div><button onClick={onClose} aria-label="Fechar">×</button></div>
      <div className="move-destinations">
        {folders.map((folder, i) => <motion.button key={folder.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: reduced ? 0 : i * 0.025 }} onClick={() => onMove(folder.id)}><FolderGlyph color={folder.color}/><span>{folder.name}</span><b>›</b></motion.button>)}
        <button onClick={() => onMove(null)}><FolderGlyph color="slate"/><span>sem pasta</span><b>›</b></button>
      </div>
    </motion.div>
  )
}

export function SelectionBar({ count, total, onAll, onMove, onCancel }: { count: number; total: number; onAll: () => void; onMove: () => void; onCancel: () => void }) {
  return (
    <motion.div className="selection-bar" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }}>
      <button onClick={onCancel} aria-label="Cancelar seleção">×</button>
      <strong>{count ? `${count} selecionada${count > 1 ? 's' : ''}` : 'selecione as contas'}</strong>
      <button className="selection-all" onClick={onAll}>{count === total ? 'limpar' : 'todas'}</button>
      <button className="selection-move" disabled={!count} onClick={onMove}>mover</button>
    </motion.div>
  )
}
