import type { Item } from '../lib/types'

interface Props {
  item: Item
  onToggle: (item: Item) => void
  onRemove: (item: Item) => void
}

export function ItemRow({ item, onToggle, onRemove }: Props) {
  const picked = item.status === 'pegado'

  return (
    // fx-add / is-picked: placeholders dos momentos 1 e 2 (ver index.css)
    <li className={`item fx-add${picked ? ' is-picked' : ''}`}>
      <button
        className="item-main"
        onClick={() => onToggle(item)}
        aria-pressed={picked}
        aria-label={picked ? `Desmarcar ${item.name}` : `Marcar ${item.name} como pegado`}
      >
        <span className="check" aria-hidden>{picked ? '✓' : ''}</span>
        <span className="name">{item.name}</span>
        {item.quantity && <span className="qty">{item.quantity}</span>}
        <span className="who" title={`Adicionado por ${item.added_by}`}>
          {item.added_by.charAt(0)}
        </span>
      </button>
      <button className="remove" onClick={() => onRemove(item)} aria-label={`Remover ${item.name}`}>
        ×
      </button>
    </li>
  )
}
