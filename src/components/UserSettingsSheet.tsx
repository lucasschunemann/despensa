import type { User } from '@supabase/supabase-js'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { friendlyAuthError, setAccountPassword, signIn, type Profile, updateProfile, uploadProfileAvatar } from '../lib/auth'
import { haptic } from '../lib/haptics'
import { prefs, useSoundOn, useThemePreference, type ThemePreference } from '../lib/prefs'
import { supabase } from '../lib/supabase'
import { CloseIcon } from './ControlIcons'
import { PushSettings } from './PushSettings'
import { AvatarPicker, UserAvatar } from './UserAvatar'

interface Props {
  open: boolean
  user: User
  profile: Profile
  roomId?: string
  onClose: () => void
  onProfileChange: (profile: Profile) => void
  onSignOut: () => void
}

export function UserSettingsSheet({ open, user, profile, roomId, onClose, onProfileChange, onSignOut }: Props) {
  const reduced = useReducedMotion()
  const panel = useRef<HTMLDivElement>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const [username, setUsername] = useState(profile.username)
  const [avatar, setAvatar] = useState(profile.avatar_value)
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [passwordOpen, setPasswordOpen] = useState(false)
  const soundOn = useSoundOn()
  const theme = useThemePreference()

  useEffect(() => { setUsername(profile.username); setAvatar(profile.avatar_value) }, [profile])
  useEffect(() => {
    if (!open) return
    const previous = document.activeElement as HTMLElement | null
    const stage = document.querySelector<HTMLElement>('.stage')
    if (stage) stage.inert = true
    requestAnimationFrame(() => panel.current?.focus())
    return () => { if (stage) stage.inert = false; previous?.focus() }
  }, [open])

  async function saveProfile(nextAvatar = avatar, avatarType: Profile['avatar_type'] = 'preset') {
    if (username.trim().length < 2) return setMessage('Escolha um nome com pelo menos 2 caracteres.')
    setBusy('profile'); setMessage(null)
    try {
      const next = await updateProfile(user.id, { username: username.trim(), avatar_type: avatarType, avatar_value: nextAvatar })
      onProfileChange(next); setMessage('Perfil atualizado.')
      haptic('success')
    } catch (cause) { setMessage(friendlyAuthError(cause)); haptic('medium') } finally { setBusy(null) }
  }

  async function chooseFile(file?: File) {
    if (!file) return
    setBusy('avatar'); setMessage(null)
    try {
      const url = await uploadProfileAvatar(user.id, file)
      const next = await updateProfile(user.id, { username: username.trim(), avatar_type: 'upload', avatar_value: url })
      onProfileChange(next); setMessage('Foto atualizada.'); haptic('success')
    } catch (cause) { setMessage(friendlyAuthError(cause)); haptic('medium') } finally { setBusy(null) }
  }

  async function logout() {
    setBusy('logout')
    const { error } = await supabase.auth.signOut()
    if (error) { setMessage(friendlyAuthError(error)); setBusy(null); return }
    onSignOut()
  }

  return (
    <AnimatePresence>
      {open && <motion.div className="settings-layer" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
        <motion.div
          className="settings-panel"
          ref={panel}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-labelledby="settings-title"
          initial={{ opacity: 0, x: reduced ? 0 : 36, scale: reduced ? 1 : .985 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: reduced ? 0 : 36, scale: reduced ? 1 : .985 }}
          transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 390, damping: 36 }}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.key === 'Escape' && onClose()}
        >
          <header className="settings-header"><div><span className="section-eyebrow">sua conta</span><h2 id="settings-title">configurações</h2></div><button className="round-control settings-close" onClick={onClose} aria-label="Fechar configurações"><CloseIcon size={20} /></button></header>

          <div className="settings-scroll">
            <section className="settings-profile-card">
              <div className="settings-avatar-wrap">
                <motion.div key={`${profile.avatar_type}-${profile.avatar_value}`} initial={{ scale: .82, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}><UserAvatar profile={profile} size={76} /></motion.div>
                <button type="button" className="avatar-camera" onClick={() => fileInput.current?.click()} aria-label="Enviar foto" disabled={busy === 'avatar'}>{busy === 'avatar' ? <span className="mini-spinner" /> : <CameraIcon />}</button>
                <input ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => void chooseFile(e.target.files?.[0])} />
              </div>
              <div><strong>{profile.username}</strong><span>{user.email}</span><small>{profile.role === 'admin' ? 'administrador' : 'membro da casa'}</small></div>
            </section>

            <section className="settings-group"><div className="settings-group-title"><span>perfil</span><small>como você aparece na casa</small></div><label className="settings-field"><span>nome de usuário</span><input value={username} maxLength={32} onChange={(e) => setUsername(e.target.value)} autoComplete="username" /></label><div className="settings-avatar-choice"><span>ícone</span><AvatarPicker value={profile.avatar_type === 'preset' ? avatar : ''} onChange={(value) => { setAvatar(value); void saveProfile(value, 'preset') }} /></div><button className="settings-save" disabled={busy === 'profile' || username.trim() === profile.username} onClick={() => void saveProfile()}>{busy === 'profile' ? <span className="mini-spinner" /> : 'salvar perfil'}</button></section>

            <section className="settings-group"><button className="settings-row" aria-expanded={passwordOpen} onClick={() => setPasswordOpen((value) => !value)}><span className="settings-row-icon"><LockIcon /></span><span><strong>senha e segurança</strong><small>altere sua senha de acesso</small></span><Chevron open={passwordOpen} /></button><AnimatePresence>{passwordOpen && <motion.div className="password-change" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}><PasswordChange user={user} onDone={() => { setPasswordOpen(false); setMessage('Senha alterada com segurança.') }} /></motion.div>}</AnimatePresence></section>

            <section className="settings-group"><div className="settings-group-title"><span>preferências</span><small>neste aparelho</small></div><div className="settings-theme"><div className="settings-theme-copy"><span className="settings-row-icon"><ThemeIcon /></span><span><strong>aparência</strong><small>segue o aparelho ou fica fixa</small></span></div><div className="theme-picker" role="radiogroup" aria-label="Aparência do app">{([['system', 'auto'], ['light', 'claro'], ['dark', 'escuro']] as Array<[ThemePreference, string]>).map(([value, label]) => <button key={value} type="button" role="radio" aria-checked={theme === value} onClick={() => { prefs.setTheme(value); haptic('light') }}>{theme === value && <motion.span className="theme-selection" layoutId="theme-selection" transition={{ type: 'spring', stiffness: 460, damping: 38 }} />}<span>{label}</span></button>)}</div></div><button className="settings-row" aria-pressed={soundOn} onClick={() => { prefs.setSoundOn(!soundOn); haptic('light') }}><span className="settings-row-icon"><SoundIcon /></span><span><strong>sons do app</strong><small>som curto ao adicionar, pegar e pagar</small></span><span className={`apple-switch${soundOn ? ' is-on' : ''}`}><i /></span></button>{roomId && <div className="settings-push"><PushSettings roomId={roomId} me={profile.username} /></div>}</section>

            {message && <motion.p className="settings-message" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}>{message}</motion.p>}
            <button className="settings-logout" disabled={busy === 'logout'} onClick={() => void logout()}><LogoutIcon />{busy === 'logout' ? 'saindo…' : 'sair desta conta'}</button>
            <p className="settings-footnote">Seus dados continuam na sua casa e só ficam disponíveis para membros autenticados.</p>
          </div>
        </motion.div>
      </motion.div>}
    </AnimatePresence>
  )
}

function PasswordChange({ user, onDone }: { user: User; onDone: () => void }) {
  const hasEmailIdentity = user.identities?.some((identity) => identity.provider === 'email') ?? true
  const [current, setCurrent] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  async function submit(event: FormEvent) {
    event.preventDefault(); setError(null)
    if (password.length < 8) return setError('Use pelo menos 8 caracteres.')
    if (password !== confirm) return setError('As novas senhas não coincidem.')
    setBusy(true)
    try {
      if (hasEmailIdentity && user.email) await signIn(user.email, current)
      await setAccountPassword(password)
      setCurrent(''); setPassword(''); setConfirm(''); onDone(); haptic('success')
    } catch (cause) { setError(friendlyAuthError(cause)); haptic('medium') } finally { setBusy(false) }
  }
  return <form onSubmit={submit}>{hasEmailIdentity && <label className="settings-field"><span>senha atual</span><input type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} required /></label>}<label className="settings-field"><span>nova senha</span><input type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required /></label><label className="settings-field"><span>confirmar nova senha</span><input type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} minLength={8} required /></label>{error && <p className="auth-message is-error">{error}</p>}<button className="settings-save" disabled={busy}>{busy ? <span className="mini-spinner" /> : 'alterar senha'}</button></form>
}

function CameraIcon() { return <svg viewBox="0 0 24 24" aria-hidden><path d="M4 8.5h3l1.3-2h7.4l1.3 2h3v10H4Z"/><circle cx="12" cy="13.5" r="3.2"/></svg> }
function LockIcon() { return <svg viewBox="0 0 24 24" aria-hidden><rect x="5" y="10" width="14" height="10" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg> }
function SoundIcon() { return <svg viewBox="0 0 24 24" aria-hidden><path d="M11 5 6.5 9H3v6h3.5L11 19Z"/><path d="M15.5 9.5a3.5 3.5 0 0 1 0 5M18.5 7a7 7 0 0 1 0 10"/></svg> }
function ThemeIcon() { return <svg viewBox="0 0 24 24" aria-hidden><path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5 8.6 8.6 0 1 0 20.5 14.2Z"/></svg> }
function LogoutIcon() { return <svg viewBox="0 0 24 24" aria-hidden><path d="M10 5H5v14h5M14 8l4 4-4 4M9 12h9"/></svg> }
function Chevron({ open }: { open: boolean }) { return <motion.svg className="settings-chevron" viewBox="0 0 24 24" animate={{ rotate: open ? 180 : 0 }} aria-hidden><path d="m7 10 5 5 5-5"/></motion.svg> }
