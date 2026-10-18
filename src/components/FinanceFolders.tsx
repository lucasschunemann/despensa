import { useEffect, useState } from 'react'
import { haptic } from '../lib/haptics'
import type { ExpenseFolder } from '../lib/types'
import { Icon, Row, Section, Sheet } from './ui'

export type FolderFilter = 'all' | 'unfiled' | string

const COLORS: Array<[string, string]> = [
  ['blue', 'azul'],
  ['mint', 'verde-água'],
  ['orange', 'laranja'],
  ['rose', 'rosa'],
  ['violet', 'roxo'],
  ['slate', 'cinza'],
]

export function FolderDot({ color = 'slate' }: { color?: string }) {
  return <span className={`folder-dot folder-${color}`} aria-hidden />
}

/** Filtro por pasta: uma faixa de cápsulas que rola junto com a lista. */
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
      {chip('all', 'Todas', counts.all)}
      {folders.map((folder) => chip(folder.id, folder.name, counts.byFolder[folder.id] ?? 0, folder.color))}
      {chip('unfiled', 'Sem pasta', counts.unfiled)}
      <button type="button" className="chip chip-add" onClick={onAdd} aria-label="Nova pasta"><Icon name="plus" size={17} weight={2.3} /></button>
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
    <Sheet open={open} onClose={onClose} title={folder ? 'Editar pasta' : 'Nova pasta'} onDone={save} doneLabel={folder ? 'Salvar' : 'Criar pasta'} doneDisabled={!name.trim()}>
      <form onSubmit={(e) => { e.preventDefault(); save() }}>
        <Section>
          <input className="field" data-autofocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome, ex.: Casa" maxLength={36} aria-label="Nome da pasta" enterKeyHint="done" />
        </Section>
        <Section header="Cor">
          <div className="swatches" role="radiogroup" aria-label="Cor da pasta">
            {COLORS.map(([choice, label]) => (
              <button type="button" key={choice} role="radio" aria-checked={color === choice} aria-label={`Cor ${label}`} className={`swatch folder-${choice}`} onClick={() => { haptic('light'); setColor(choice) }}>
                {color === choice && <Icon name="check" size={18} weight={2.6} />}
              </button>
            ))}
          </div>
        </Section>
        {folder && (
          <Section>
            <Row title="Apagar pasta" danger center onClick={() => onDelete(folder)} />
          </Section>
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
      <Section>
        {folders.map((folder) => (
          <Row key={folder.id} icon={<FolderDot color={folder.color} />} title={folder.name} chevron onClick={() => onMove(folder.id)} />
        ))}
        <Row icon={<FolderDot color="slate" />} title="Sem pasta" chevron onClick={() => onMove(null)} />
      </Section>
    </Sheet>
  )
}
