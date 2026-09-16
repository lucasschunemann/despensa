import { motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { ListScreen } from './components/ListScreen'
import { useItems } from './hooks/useItems'
import { haptic } from './lib/haptics'
import { joinRoom } from './lib/room'
import { sound } from './lib/sound'
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
      <Gate title="Despensa">
        <p className="gate-text">
          Supabase não configurado. Copie <code>.env.example</code> para <code>.env</code> e preencha.
        </p>
      </Gate>
    )
  }

  if (!code || joinError) {
    return (
      <Gate title="Despensa">
        <p className="gate-text">
          {joinError ? `Não deu para entrar: ${joinError}` : 'Cole o código da sala para entrar.'}
        </p>
        <form
          className="gate-form"
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
          <button type="submit" className="button-primary">
            Entrar
          </button>
        </form>
      </Gate>
    )
  }

  if (!roomId) {
    return (
      <Gate title="Despensa">
        <motion.p
          className="gate-text"
          animate={{ opacity: [0.35, 1, 0.35] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
        >
          Entrando…
        </motion.p>
      </Gate>
    )
  }

  if (!person) {
    return (
      <Gate title="Quem é você?">
        <div className="people">
          {PEOPLE.map((p, i) => (
            <motion.button
              key={p}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * i, type: 'spring', stiffness: 420, damping: 30 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                // primeiro toque da sessão: libera o áudio do navegador
                sound.unlock()
                haptic('light')
                save(PERSON_KEY, p)
                setPerson(p)
              }}
            >
              {p}
            </motion.button>
          ))}
        </div>
      </Gate>
    )
  }

  return <Room roomId={roomId} person={person} onSwitchPerson={() => {
    save(PERSON_KEY, null)
    setPerson(null)
  }} />
}

function Room({
  roomId,
  person,
  onSwitchPerson,
}: {
  roomId: string
  person: string
  onSwitchPerson: () => void
}) {
  const store = useItems(roomId, person)
  return <ListScreen store={store} me={person} onSwitchPerson={onSwitchPerson} />
}

function Gate({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="app gate">
      <motion.div
        className="gate-inner"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
      >
        <h1>{title}</h1>
        {children}
      </motion.div>
    </div>
  )
}
