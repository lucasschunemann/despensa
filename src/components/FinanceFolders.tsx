import { useEffect, useState } from 'react'
import { haptic } from '../lib/haptics'
import type { ExpenseFolder } from '../lib/types'
import { Icon, Row, Sheet } from './ui'

export type FolderFilter = 'all' | 'unfiled' | string

const COLORS = ['blue', 'mint', 'orange', 'rose', 'violet', 'slate'] as const

export function FolderDot({ color = 'slate' }: { color?: string }) {
  return <span className={`folder-dot folder-${color}`} aria-hidden />
}

/** Filtro por pasta: uma faixa de chips que rola junto com a lista. */
export function FolderChips({ folders, active, counts, onChange, onAdd }: {
  folders: ExpenseFolder[]
  active: FolderFilter
  counts: { all: number; unfiled: number; byFolder: Record<string, number> }
  onChange: (id: FolderFilter) => void
  onAdd: () => void
}) {
  const chip = (id: FolderFilter, name: string, count: number, color?: string) => (
    <button
      key={id}
      type="button"
      className="chip"
      aria-pressed={active === id}
      onClick={(event) => {
        haptic('light')
        onChange(id)
        event.currentTarget.scrollIntoView({ inline: 'nearest', block: 'nearest', behavior: 'smooth' })
      }}
    >
      {color && <FolderDot color={color} />}
      {name}
      <span className="chip-count">{count}</span>
    </button>
  )
  return (
    <nav className="chips" aria-label="Pastas das contas">
      {chip('all', 'todas', counts.all)}
      {folders.map((folder) => chip(folder.id, folder.name, counts.byFolder[folder.id] ?? 0, folder.color))}
      {chip('unfiled', 'sem pasta', counts.unfiled)}
      <button type="button" className="chip chip-add" onClick={onAdd} aria-label="Nova pasta"><Icon name="plus" size={16} /></button>
    </nav>
  )
}

/** Criar ou editar uma pasta: nome e cor. `folder` nulo = nova. */
export function FolderSheet({ open, folder, onClose, onSave, onDelete }: {
  open: boolean
  folder: ExpenseFolder | null
  onClose: () => void
  onSave: (name: string, color: string) => void
  onDelete: (folder: ExpenseFolder) => void
}) {
  const [name, setName] = useState('')
  const [color, setColor] = useState<string>('blue')
  useEffect(() => {
    if (!open) return
    setName(folder?.name ?? '')
    setColor(folder?.color ?? 'blue')
  }, [open, folder])
  return (
    <Sheet open={open} onClose={onClose} title={folder ? 'editar pasta' : 'nova pasta'}>
      <form className="sheet-form" onSubmit={(e) => { e.preventDefault(); if (name.trim()) onSave(name.trim(), color) }}>
        <input className="field" data-autofocus value={name} onChange={(e) => setName(e.target.value)} placeholder="ex.: casa" maxLength={36} aria-label="Nome da pasta" enterKeyHint="done" />
        <div className="swatches" role="radiogroup" aria-label="Cor da pasta">
          {COLORS.map((choice) => (
            <button type="button" key={choice} role="radio" aria-checked={color === choice} aria-label={`Cor ${choice}`} className={`swatch folder-${choice}`} onClick={() => { haptic('light'); setColor(choice) }}>
              {color === choice && <Icon name="check" size={16} />}
            </button>
          ))}
        </div>
        <button type="submit" className="btn btn-primary" disabled={!name.trim()}>{folder ? 'salvar' : 'criar pasta'}</button>
        {folder && <button type="button" className="btn btn-plain is-danger" onClick={() => onDelete(folder)}>apagar pasta</button>}
      </form>
    </Sheet>
  )
}

/** Para onde levar as contas selecionadas. */
export function MoveSheet({ open, count, folders, onMove, onClose }: {
  open: boolean
  count: number
  folders: ExpenseFolder[]
  onMove: (folderId: string | null) => void
  onClose: () => void
}) {
  return (
    <Sheet open={open} onClose={onClose} title={`mover ${count} ${count === 1 ? 'conta' : 'contas'}`}>
      <div className="group-body">
        {folders.map((folder) => (
          <Row key={folder.id} icon={<FolderDot color={folder.color} />} title={folder.name} chevron onClick={() => onMove(folder.id)} />
        ))}
        <Row icon={<FolderDot color="slate" />} title="sem pasta" chevron onClick={() => onMove(null)} />
      </div>
    </Sheet>
  )
}
