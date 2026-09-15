import { useItems } from '../hooks/useItems'
import { AddItem } from './AddItem'
import { ItemRow } from './ItemRow'

interface Props {
  roomId: string
  me: string
  onSwitchPerson: () => void
}

export function ListScreen({ roomId, me, onSwitchPerson }: Props) {
  const { items, status, error, clearError, add, toggle, remove, finishShopping } = useItems(roomId, me)

  const pendingItems = items
    .filter((i) => i.status === 'pendente')
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
  const pickedItems = items
    .filter((i) => i.status === 'pegado')
    .sort((a, b) => (b.picked_at ?? '').localeCompare(a.picked_at ?? ''))
  const allPicked = items.length > 0 && pendingItems.length === 0

  return (
    <main className="screen">
      <header className="top">
        <h1>Despensa</h1>
        <span className={`status status-${status}`} title={status === 'live' ? 'Sincronizado' : status} />
      </header>

      <AddItem onAdd={add} />

      {error && (
        <p className="error" role="alert" onClick={clearError}>
          {error}
        </p>
      )}

      {items.length === 0 && status !== 'loading' && <p className="empty">Lista vazia.</p>}

      {/* fx-complete: placeholder do momento 3 (lista completa) */}
      {allPicked && (
        <section className="complete fx-complete">
          <p>Tudo pegado.</p>
          <button onClick={finishShopping}>Finalizar compra</button>
        </section>
      )}

      <ul className="list">
        {pendingItems.map((item) => (
          <ItemRow key={item.id} item={item} onToggle={toggle} onRemove={remove} />
        ))}
      </ul>

      {pickedItems.length > 0 && (
        <>
          <h2 className="section">Pegados · {pickedItems.length}</h2>
          <ul className="list">
            {pickedItems.map((item) => (
              <ItemRow key={item.id} item={item} onToggle={toggle} onRemove={remove} />
            ))}
          </ul>
          {!allPicked && (
            <button className="link" onClick={finishShopping}>
              Finalizar compra (pendentes ficam para a próxima)
            </button>
          )}
        </>
      )}

      <footer className="foot">
        <button className="link" onClick={onSwitchPerson}>
          Você é {me} · trocar
        </button>
      </footer>
    </main>
  )
}
