import { useEffect, useState, type ReactNode } from 'react'
import { haptic } from '../lib/haptics'
import type { ExpenseFolder } from '../lib/types'
import { Icon, Sheet } from './ui'

export type FolderFilter = 'all' | 'unfiled' | string

const COLORS: Array<[string, string]> = [
  ['blue', 'azul'],
  ['mint', 'verde'],
  ['orange', 'laranja'],
  ['rose', 'rosa'],
  ['violet', 'roxo'],
  ['slate', 'cinza'],
]

/** Cor da etiqueta de cada pasta, na paleta das opções do Notion. */
export const FOLDER_TAG: Record<string, string> = {
  blue: 'blue', mint: 'green', orange: 'orange', rose: 'pink', violet: 'purple', slate: 'gray',
}

export function FolderDot({ color = 'slate' }: { color?: string }) {
  return <span className={`folder-dot folder-${color}`} aria-hidden />
}

/** As pastas são visões da mesma tabela, como as abas de um banco de dados. */
export function FolderViews({ folders, active, counts, onChange, onAdd, tools }: {
  folders: ExpenseFolder[]
  active: FolderFilter
  counts: { all: number; unfiled: number; byFolder: Record<string, number> }
  onChange: (id: FolderFilter) => void
  onAdd: () => void
  tools?: ReactNode
}) {
  const tab = (id: FolderFilter, name: string, count: number, color?: string) => (
    <button
      key={id}
      type="button"
      className={`view-tab${color ? ` folder-${color}` : ''}`}
      aria-pressed={active === id}
      onClick={(event) => {
        haptic('light')
        onChange(id)
        event.currentTarget.scrollIntoView({ inline: 'nearest', block: 'nearest', behavior: 'smooth' })
      }}
    >
      {color && <span className="dot" aria-hidden />}
      {name}
      <span className="group-count">{count}</span>
    </button>
  )
  return (
    <nav className="views" aria-label="Pastas das contas">
      {tab('all', 'Todas', counts.all)}
      {folders.map((folder) => tab(folder.id, folder.name, counts.byFolder[folder.id] ?? 0, folder.color))}
      {tab('unfiled', 'Sem pasta', counts.unfiled)}
      <button type="button" className="view-tab is-add" onClick={onAdd} aria-label="Nova pasta"><Icon name="plus" size={16} /></button>
      {tools && <span className="views-tools">{tools}</span>}
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
  const save = () => { if (name.trim()) onSave(name.trim(), color) }
  return (
    <Sheet open={open} onClose={onClose} title={folder ? 'Pasta' : 'Nova pasta'} action={{ label: folder ? 'Salvar' : 'Criar pasta', onClick: save, disabled: !name.trim() }}>
      <form onSubmit={(e) => { e.preventDefault(); save() }}>
        <input className="doc-title" data-autofocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Sem título" maxLength={36} aria-label="Nome da pasta" enterKeyHint="done" />
        <p className="field-label">Cor</p>
        <div className="swatches" role="radiogroup" aria-label="Cor da pasta">
          {COLORS.map(([choice, label]) => (
            <button type="button" key={choice} role="radio" aria-checked={color === choice} aria-label={`Cor ${label}`} className={`swatch folder-${choice}`} onClick={() => { haptic('light'); setColor(choice) }}>
              {color === choice && <Icon name="check" size={16} />}
            </button>
          ))}
        </div>
        {folder && (
          <div className="doc-actions">
            <button type="button" className="button is-danger" onClick={() => onDelete(folder)}><Icon name="trash" size={16} />Apagar pasta</button>
          </div>
        )}
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
    <Sheet open={open} onClose={onClose} title={`Mover ${count} ${count === 1 ? 'conta' : 'contas'}`}>
      <div className="links">
        {folders.map((folder) => (
          <button key={folder.id} type="button" className="link-row" onClick={() => onMove(folder.id)}>
            <span className="link-icon"><FolderDot color={folder.color} /></span>
            <span className="link-text"><span>{folder.name}</span></span>
          </button>
        ))}
        <button type="button" className="link-row" onClick={() => onMove(null)}>
          <span className="link-icon"><FolderDot color="slate" /></span>
          <span className="link-text"><span>Sem pasta</span></span>
        </button>
      </div>
    </Sheet>
  )
}
