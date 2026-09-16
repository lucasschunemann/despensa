// Só existe em desenvolvimento (?demo=1): roda a interface com dados de mentira,
// para ajustar animação e visual sem depender do Supabase nem mexer na lista real.
import { useCallback, useMemo, useState } from 'react'
import { PersonPicker } from '../App'
import { ListScreen } from '../components/ListScreen'
import type { ItemsStore } from '../hooks/useItems'
import type { Item } from '../lib/types'
import { uuid } from '../lib/uuid'

const SEED: Array<[string, string | null, string, boolean]> = [
  ['Leite integral', '2', 'Lucas', false],
  ['Pão de forma', null, 'Bela', false],
  ['Queijo minas', '500g', 'Bela', false],
  ['Café em grão', '1kg', 'Lucas', false],
  ['Tomate', null, 'Bela', true],
  ['Papel toalha', '2', 'Lucas', true],
]

export default function DemoApp() {
  const params = new URLSearchParams(location.search)
  const vazio = params.has('vazio')
  const [items, setItems] = useState<Item[]>(() =>
    (vazio ? [] : SEED).map(([name, quantity, added_by, picked], i) => ({
      id: uuid(),
      room_id: 'demo',
      name,
      quantity,
      added_by,
      status: picked ? 'pegado' : 'pendente',
      created_at: new Date(Date.now() - (SEED.length - i) * 60000).toISOString(),
      picked_at: picked ? new Date().toISOString() : null,
    })),
  )

  const add = useCallback((name: string, quantity: string | null) => {
    setItems((prev) => [
      ...prev,
      {
        id: uuid(),
        room_id: 'demo',
        name,
        quantity,
        added_by: 'Lucas',
        status: 'pendente',
        created_at: new Date().toISOString(),
        picked_at: null,
      },
    ])
  }, [])

  const store: ItemsStore = useMemo(
    () => ({
      items,
      arrivals: [],
      ready: true,
      connection: 'live',
      error: null,
      clearError: () => {},
      add,
      toggle: (item) =>
        setItems((prev) =>
          prev.map((i) =>
            i.id === item.id
              ? {
                  ...i,
                  status: i.status === 'pendente' ? 'pegado' : 'pendente',
                  picked_at: i.status === 'pendente' ? new Date().toISOString() : null,
                }
              : i,
          ),
        ),
      remove: (item) => setItems((prev) => prev.filter((i) => i.id !== item.id)),
      restore: (item) => setItems((prev) => [...prev, item]),
      finishShopping: () => setItems((prev) => prev.filter((i) => i.status === 'pendente')),
    }),
    [items, add],
  )

  if (params.has('quem')) {
    return (
      <div className="app gate">
        <div className="gate-inner">
          <h1>quem é você?</h1>
          <PersonPicker onPick={() => {}} />
        </div>
      </div>
    )
  }

  return (
    <ListScreen
      store={store}
      me="Lucas"
      presence={{
        online: ['Bela'],
        typing: params.has('digitando') ? 'Bela' : null,
        notifyTyping: () => {},
      }}
      onSwitchPerson={() => {}}
    />
  )
}
