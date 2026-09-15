import { useEffect, useState } from 'react'
import { ListScreen } from './components/ListScreen'
import { joinRoom } from './lib/room'
import { load, save } from './lib/storage'
import { isConfigured } from './lib/supabase'
import { PEOPLE } from './lib/types'

const ROOM_KEY = 'despensa:sala'
const PERSON_KEY = 'despensa:quem'

// O código fica na URL (?sala=...) de propósito: no iOS o app salvo na tela inicial
// não compartilha localStorage com o Safari, então o link precisa carregar o código.
function initialCode(): string | null {
  const fromUrl = new URLSearchParams(location.search).get('sala')
  if (fromUrl) save(ROOM_KEY, fromUrl)
  return fromUrl ?? load(ROOM_KEY)
}

export default function App() {
  const [code, setCode] = useState(initialCode)
  const [roomId, setRoomId] = useState<string | null>(null)
  const [joinError, setJoinError] = useState<string | null>(null)
  const [person, setPerson] = useState(() => load(PERSON_KEY))

  useEffect(() => {
    if (!code || !isConfigured) return
    let cancelled = false
    setJoinError(null)
    joinRoom(code)
      .then((id) => !cancelled && setRoomId(id))
      .catch((e: Error) => {
        if (cancelled) return
        setJoinError(e.message)
        save(ROOM_KEY, null)
      })
    return () => {
      cancelled = true
    }
  }, [code])

  if (!isConfigured) {
    return (
      <main className="screen gate">
        <h1>Despensa</h1>
        <p>Supabase não configurado. Copie <code>.env.example</code> para <code>.env</code> e preencha.</p>
      </main>
    )
  }

  if (!code || joinError) {
    return (
      <main className="screen gate">
        <h1>Despensa</h1>
        {joinError && <p className="error">Não deu para entrar: {joinError}</p>}
        <form
          className="add"
          onSubmit={(e) => {
            e.preventDefault()
            const value = new FormData(e.currentTarget).get('code')?.toString().trim()
            if (!value) return
            const url = new URL(location.href)
            url.searchParams.set('sala', value)
            history.replaceState(null, '', url)
            save(ROOM_KEY, value)
            setJoinError(null)
            setCode(value)
          }}
        >
          <input name="code" placeholder="Código da sala" autoFocus autoComplete="off" />
          <button type="submit">Entrar</button>
        </form>
      </main>
    )
  }

  if (!roomId) {
    return <main className="screen gate"><p className="empty">Entrando…</p></main>
  }

  if (!person) {
    return (
      <main className="screen gate">
        <h1>Quem é você?</h1>
        <div className="people">
          {PEOPLE.map((p) => (
            <button
              key={p}
              onClick={() => {
                save(PERSON_KEY, p)
                setPerson(p)
              }}
            >
              {p}
            </button>
          ))}
        </div>
      </main>
    )
  }

  return (
    <ListScreen
      roomId={roomId}
      me={person}
      onSwitchPerson={() => {
        save(PERSON_KEY, null)
        setPerson(null)
      }}
    />
  )
}
