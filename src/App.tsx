import type { User } from '@supabase/supabase-js'
import { motion } from 'motion/react'
import { useEffect, useState, type FormEvent } from 'react'
import { AuthScreen, PasswordSetup } from './components/AuthScreen'
import { AppDock } from './components/AppDock'
import { Avatar, Mark } from './components/Avatar'
import { FinanceScreen } from './components/FinanceScreen'
import { HomeScreen } from './components/HomeScreen'
import { ListScreen } from './components/ListScreen'
import { MenuSheet, type View } from './components/MenuSheet'
import { ReactionBurst } from './components/ReactionBurst'
import { Stage } from './components/Stage'
import { UserSettingsSheet } from './components/UserSettingsSheet'
import { WishesScreen } from './components/WishesScreen'
import { useAuth } from './hooks/useAuth'
import { useExpenses } from './hooks/useExpenses'
import { useItems } from './hooks/useItems'
import { usePresence } from './hooks/usePresence'
import { useViewportFit } from './hooks/useViewportFit'
import { useWishes } from './hooks/useWishes'
import type { Profile } from './lib/auth'
import { friendlyAuthError } from './lib/auth'
import { haptic } from './lib/haptics'
import { monthKey } from './lib/month'
import { reconcilePush } from './lib/push'
import { createRoom, getMyRoom, joinRoom } from './lib/room'
import { load, save } from './lib/storage'
import { sound } from './lib/sound'
import { isConfigured } from './lib/supabase'
import { PEOPLE } from './lib/types'

const ROOM_KEY = 'despensa:sala'
const PERSON_KEY = 'despensa:quem'

function initialCode(): string | null {
  const fromUrl = new URLSearchParams(location.search).get('sala')
  if (fromUrl) save(ROOM_KEY, fromUrl)
  return fromUrl ?? load(ROOM_KEY)
}

export default function App() {
  useViewportFit()
  const auth = useAuth()
  const [code, setCode] = useState(initialCode)
  const [roomId, setRoomId] = useState<string | null>(null)
  const [roomBusy, setRoomBusy] = useState(true)
  const [roomError, setRoomError] = useState<string | null>(null)

  useEffect(() => {
    if (!auth.ready || !auth.user || auth.user.is_anonymous || !auth.profile) {
      setRoomBusy(false)
      return
    }
    let alive = true
    setRoomBusy(true); setRoomError(null)
    const resolve = async () => {
      try {
        if (code) {
          const id = await joinRoom(code)
          if (alive) setRoomId(id)
          return
        }
        const room = await getMyRoom()
        if (!alive) return
        if (room) {
          rememberRoom(room.code)
          setCode(room.code)
          setRoomId(room.id)
        } else setRoomId(null)
      } catch (cause) {
        if (!alive) return
        setRoomError(friendlyAuthError(cause))
        setRoomId(null)
        if (code) { save(ROOM_KEY, null); setCode(null) }
      } finally { if (alive) setRoomBusy(false) }
    }
    void resolve()
    return () => { alive = false }
  }, [auth.ready, auth.user?.id, auth.user?.is_anonymous, auth.profile?.id, code])

  if (!isConfigured) return <Gate title="despensa"><p className="gate-text">Supabase não configurado. Preencha o arquivo <code>.env</code>.</p></Gate>
  if (!auth.ready) return <Loading label="abrindo sua casa…" />
  if (!auth.session || !auth.user) return <AuthScreen />
  if (auth.user.is_anonymous) return <AuthScreen legacy initialUsername={load(PERSON_KEY) ?? ''} />

  const passwordPending = Boolean(auth.user.user_metadata?.onboarding_password_pending)
  if (auth.recovery || passwordPending) return <PasswordSetup recovery={auth.recovery} onDone={() => {
    auth.setRecovery(false)
    const url = new URL(location.href); url.searchParams.delete('recovery'); history.replaceState(null, '', url)
    void auth.refreshProfile()
  }} />

  if (!auth.profile) return <Loading label="preparando seu perfil…" />
  if (roomBusy) return <Loading label="sincronizando sua casa…" />
  if (!roomId) return <RoomGate error={roomError} onJoin={(value) => { rememberRoom(value); setCode(value) }} onCreate={async () => {
    const room = await createRoom(); rememberRoom(room.code); setCode(room.code); setRoomId(room.id)
  }} />

  return <Room roomId={roomId} user={auth.user} profile={auth.profile} onProfileChange={auth.setProfile} onSignOut={() => {
    save(ROOM_KEY, null); save(PERSON_KEY, null); setCode(null); setRoomId(null)
  }} />
}

function rememberRoom(code: string) {
  save(ROOM_KEY, code)
  const url = new URL(location.href)
  url.searchParams.set('sala', code)
  history.replaceState(null, '', url)
}

function RoomGate({ error, onJoin, onCreate }: { error: string | null; onJoin: (code: string) => void; onCreate: () => Promise<void> }) {
  const [busy, setBusy] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const value = new FormData(event.currentTarget).get('code')?.toString().trim()
    if (value) onJoin(value)
  }
  return <Gate title="sua casa"><p className="gate-text">Crie um espaço novo ou entre com o código de uma casa que já existe.</p><div className="room-choice"><button className="button-primary" disabled={busy} onClick={() => { setBusy(true); setLocalError(null); void onCreate().catch((cause) => setLocalError(friendlyAuthError(cause))).finally(() => setBusy(false)) }}>{busy ? 'criando…' : 'criar uma casa'}</button><span>ou</span><form className="gate-form" onSubmit={submit}><input name="code" placeholder="código da casa" autoComplete="off" aria-label="Código da casa" /><button type="submit" className="button-secondary">entrar</button></form></div>{(error || localError) && <p className="auth-message is-error">{error ?? localError}</p>}</Gate>
}

function Room({ roomId, user, profile, onProfileChange, onSignOut }: { roomId: string; user: User; profile: Profile; onProfileChange: (profile: Profile) => void; onSignOut: () => void }) {
  const person = profile.username
  const [view, setView] = useState<View>(() => {
    const url = new URL(location.href)
    const target = url.searchParams.get('abrir')
    if (target) { url.searchParams.delete('abrir'); history.replaceState(null, '', url) }
    return target === 'contas' || target === 'desejos' || target === 'lista' ? target : 'inicio'
  })
  const [month, setMonth] = useState(monthKey)
  const [menuOpen, setMenuOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const goHome = () => { setMonth(monthKey()); setView('inicio') }
  const changeView = (next: View) => next === 'inicio' ? goHome() : setView(next)

  const items = useItems(roomId, person)
  const expenses = useExpenses(roomId, person, month)
  // Conta vencida é a única informação crítica o bastante para virar selo na barra.
  const overdueBills = expenses.expenses.filter((expense) => expense.status === 'pendente' && expense.due_day && expense.due_day < new Date().getDate()).length
  const wishes = useWishes(roomId, person)
  const presence = usePresence(roomId, person)

  useEffect(() => { save(PERSON_KEY, person) }, [person])
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState !== 'visible') return
      void reconcilePush(roomId, person).catch(() => {})
      if ('clearAppBadge' in navigator) void navigator.clearAppBadge().catch(() => {})
    }
    const navigate = (event: MessageEvent) => {
      if (event.data?.type !== 'OPEN_MODULE') return
      const next = event.data.view
      if (next === 'inicio' || next === 'lista' || next === 'contas' || next === 'desejos') {
        setMonth(monthKey()); setView(next); setMenuOpen(false); setSettingsOpen(false)
        event.ports[0]?.postMessage('opened')
      }
    }
    refresh(); document.addEventListener('visibilitychange', refresh); navigator.serviceWorker?.addEventListener('message', navigate)
    return () => { document.removeEventListener('visibilitychange', refresh); navigator.serviceWorker?.removeEventListener('message', navigate) }
  }, [roomId, person])

  useEffect(() => { if (location.hash) history.replaceState(null, '', `${location.pathname}${location.search}`) }, [])

  return <>
    <Stage view={view} home="inicio" onBack={goHome} dock={<AppDock view={view} onChange={changeView} badges={{ contas: overdueBills }} />} renderHome={() => <HomeScreen me={person} presence={presence} items={items} expenses={expenses} wishes={wishes} onOpen={setView} onOpenMenu={() => setMenuOpen(true)} onOpenSettings={() => setSettingsOpen(true)} />} renderModule={(current) => {
      if (current === 'lista') return <ListScreen store={items} me={person} presence={presence} onOpenMenu={() => setMenuOpen(true)} onHome={goHome} onRegisterMarket={(amountCents) => expenses.add({ title: 'Mercado', amountCents, dueDay: null }, { paid: true })} />
      if (current === 'contas') return <FinanceScreen store={expenses} me={person} month={month} presence={presence} onMonthChange={setMonth} onOpenMenu={() => setMenuOpen(true)} onHome={goHome} />
      return <WishesScreen store={wishes} me={person} presence={presence} onOpenMenu={() => setMenuOpen(true)} onHome={goHome} onRegisterExpense={(title, amountCents) => expenses.add({ title, amountCents, dueDay: null }, { paid: true })} />
    }} />
    <ReactionBurst reaction={presence.reaction} me={person} />
    <MenuSheet open={menuOpen} view={view} me={person} onClose={() => setMenuOpen(false)} onChangeView={changeView} onOpenSettings={() => setSettingsOpen(true)} />
    <UserSettingsSheet open={settingsOpen} user={user} profile={profile} roomId={roomId} onClose={() => setSettingsOpen(false)} onProfileChange={onProfileChange} onSignOut={onSignOut} />
  </>
}

function Loading({ label }: { label: string }) { return <Gate title="despensa"><motion.p className="gate-text" animate={{ opacity: [.35, 1, .35] }} transition={{ duration: 1.6, repeat: Infinity }}>{label}</motion.p></Gate> }

// Mantido no modo de demonstração para revisar a tela histórica de escolha de pessoa.
export function PersonPicker({ onPick }: { onPick: (person: string) => void }) {
  return <div className="people">{PEOPLE.map((person, index) => <motion.button key={person} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .06 * index, type: 'spring', stiffness: 380, damping: 30 }} whileTap={{ scale: .97 }} onClick={() => { sound.unlock(); haptic('light'); onPick(person) }}><Avatar person={person} size={104} variant="full" />{person}</motion.button>)}</div>
}

function Gate({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="app gate"><motion.div className="gate-inner" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 380, damping: 32 }}><p className="gate-mark" aria-hidden><Mark size={30} /></p><h1>{title}</h1>{children}</motion.div></div>
}
