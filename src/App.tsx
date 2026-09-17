import { motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { Avatar, Mark } from './components/Avatar'
import { FinanceScreen } from './components/FinanceScreen'
import { HomeScreen } from './components/HomeScreen'
import { ListScreen } from './components/ListScreen'
import { MenuSheet, type View } from './components/MenuSheet'
import { ReactionBurst } from './components/ReactionBurst'
import { Stage } from './components/Stage'
import { WishesScreen } from './components/WishesScreen'
import { useExpenses } from './hooks/useExpenses'
import { useItems } from './hooks/useItems'
import { useWishes } from './hooks/useWishes'
import { usePresence } from './hooks/usePresence'
import { haptic } from './lib/haptics'
import { monthKey } from './lib/month'
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
      <Gate title="despensa">
        <p className="gate-text">
          Supabase não configurado. Copie <code>.env.example</code> para <code>.env</code> e preencha.
        </p>
      </Gate>
    )
  }

  if (!code || joinError) {
    return (
      <Gate title="despensa">
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
      <Gate title="despensa">
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
      <Gate title="quem é você?">
        <PersonPicker
          onPick={(p) => {
            save(PERSON_KEY, p)
            setPerson(p)
          }}
        />
      </Gate>
    )
  }

  return <Room roomId={roomId} person={person} onSwitchPerson={() => {
    save(PERSON_KEY, null)
    setPerson(null)
  }} />
}

export function PersonPicker({ onPick }: { onPick: (person: string) => void }) {
  return (
    <div className="people">
      {PEOPLE.map((p, i) => (
        <motion.button
          key={p}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.06 * i, type: 'spring', stiffness: 380, damping: 30 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => {
            // primeiro toque da sessão: libera o áudio do navegador
            sound.unlock()
            haptic('light')
            onPick(p)
          }}
        >
          <Avatar person={p} size={104} variant="full" />
          {p}
        </motion.button>
      ))}
    </div>
  )
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
  // o app sempre abre no início. A exceção é tocar num aviso do celular, que chega com
  // ?abrir=contas (por exemplo) e cai direto no módulo do aviso.
  const [view, setView] = useState<View>(() => {
    const url = new URL(location.href)
    const target = url.searchParams.get('abrir')
    if (target) {
      url.searchParams.delete('abrir')
      history.replaceState(null, '', url)
    }
    return target === 'contas' || target === 'desejos' || target === 'lista' ? target : 'inicio'
  })
  const goHome = () => {
    setMonth(monthKey())
    setView('inicio')
  }
  const [month, setMonth] = useState(monthKey)
  const [menuOpen, setMenuOpen] = useState(false)

  const items = useItems(roomId, person)
  const expenses = useExpenses(roomId, person, month)
  const wishes = useWishes(roomId, person)
  const presence = usePresence(roomId, person)

  // restos do tempo em que o módulo ficava no endereço (#contas etc.)
  useEffect(() => {
    if (location.hash) history.replaceState(null, '', `${location.pathname}${location.search}`)
  }, [])

  return (
    <>
      <Stage
        view={view}
        home="inicio"
        onBack={goHome}
        renderHome={() => (
          <HomeScreen
            me={person}
            presence={presence}
            items={items}
            expenses={expenses}
            wishes={wishes}
            onOpen={setView}
            onOpenMenu={() => setMenuOpen(true)}
          />
        )}
        renderModule={(current) => {
          if (current === 'lista') {
            return (
              <ListScreen
                store={items}
                me={person}
                presence={presence}
                onOpenMenu={() => setMenuOpen(true)}
                onHome={goHome}
                onRegisterMarket={(amountCents) =>
                  expenses.add({ title: 'Mercado', amountCents, dueDay: null }, { paid: true })
                }
              />
            )
          }
          if (current === 'contas') {
            return (
              <FinanceScreen
                store={expenses}
                me={person}
                month={month}
                presence={presence}
                onMonthChange={setMonth}
                onOpenMenu={() => setMenuOpen(true)}
                onHome={goHome}
              />
            )
          }
          return (
            <WishesScreen
              store={wishes}
              me={person}
              presence={presence}
              onOpenMenu={() => setMenuOpen(true)}
              onHome={goHome}
              onRegisterExpense={(title, amountCents) =>
                expenses.add({ title, amountCents, dueDay: null }, { paid: true })
              }
            />
          )
        }}
      />

      <ReactionBurst reaction={presence.reaction} me={person} />

      <MenuSheet
        open={menuOpen}
        view={view}
        me={person}
        roomId={roomId}
        onClose={() => setMenuOpen(false)}
        onChangeView={(next) => (next === 'inicio' ? goHome() : setView(next))}
        onSwitchPerson={onSwitchPerson}
      />
    </>
  )
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
        <p className="gate-mark" aria-hidden>
          <Mark size={30} />
        </p>
        <h1>{title}</h1>
        {children}
      </motion.div>
    </div>
  )
}
