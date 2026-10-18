import type { User } from '@supabase/supabase-js'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { friendlyAuthError, setAccountPassword, signIn, type Profile, updateProfile, uploadProfileAvatar } from '../lib/auth'
import { haptic } from '../lib/haptics'
import { prefs, useSoundOn, useThemePreference, type ThemePreference } from '../lib/prefs'
import { supabase } from '../lib/supabase'
import { PushSettings } from './PushSettings'
import { AvatarPicker, UserAvatar } from './UserAvatar'
import { Icon, Row, Section, Segmented, Sheet, Switch, Tile } from './ui'

interface Props {
  open: boolean
  user: User
  profile: Profile
  roomId?: string
  onClose: () => void
  onProfileChange: (profile: Profile) => void
  onSignOut: () => void
  onReplayOnboarding: () => void
  onClosed?: () => void
}

/** Configurações no formato do app Ajustes. */
export function UserSettingsSheet({ open, user, profile, roomId, onClose, onProfileChange, onSignOut, onReplayOnboarding, onClosed }: Props) {
  const fileInput = useRef<HTMLInputElement>(null)
  const [username, setUsername] = useState(profile.username)
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null)
  const [passwordOpen, setPasswordOpen] = useState(false)
  const soundOn = useSoundOn()
  const theme = useThemePreference()

  useEffect(() => { setUsername(profile.username) }, [profile])
  useEffect(() => { if (!open) { setMessage(null); setPasswordOpen(false) } }, [open])

  async function saveProfile(nextAvatar = profile.avatar_value, avatarType: Profile['avatar_type'] = profile.avatar_type) {
    const name = username.trim()
    if (name.length < 2) return setMessage({ text: 'Escolha um nome com pelo menos 2 caracteres.', error: true })
    if (name === profile.username && nextAvatar === profile.avatar_value) return
    setBusy('profile'); setMessage(null)
    try {
      const next = await updateProfile(user.id, { username: name, avatar_type: avatarType, avatar_value: nextAvatar })
      onProfileChange(next)
      haptic('success')
    } catch (cause) { setMessage({ text: friendlyAuthError(cause), error: true }); haptic('medium') } finally { setBusy(null) }
  }

  async function chooseFile(file?: File) {
    if (!file) return
    setBusy('avatar'); setMessage(null)
    try {
      const url = await uploadProfileAvatar(user.id, file)
      const next = await updateProfile(user.id, { username: username.trim(), avatar_type: 'upload', avatar_value: url })
      onProfileChange(next); haptic('success')
    } catch (cause) { setMessage({ text: friendlyAuthError(cause), error: true }); haptic('medium') } finally { setBusy(null) }
  }

  async function logout() {
    setBusy('logout')
    const { error } = await supabase.auth.signOut()
    if (error) { setMessage({ text: friendlyAuthError(error), error: true }); setBusy(null); return }
    onSignOut()
  }

  return (
    <Sheet open={open} onClose={onClose} title="Configurações" onClosed={onClosed}>
      <div className="profile">
        <div className="profile-avatar">
          <UserAvatar profile={profile} size={84} />
          <button type="button" className="profile-camera" onClick={() => fileInput.current?.click()} aria-label="Enviar foto" disabled={busy === 'avatar'}><Icon name="camera" size={15} weight={2.1} /></button>
          <input ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => void chooseFile(e.target.files?.[0])} />
        </div>
        <strong>{profile.username}</strong>
        <span>{user.email}</span>
      </div>

      {message && <p className={message.error ? 'form-error' : 'form-notice'} role={message.error ? 'alert' : 'status'}>{message.text}</p>}

      <Section header="Perfil" footer="É assim que você aparece para quem divide a casa.">
        <label className="field-row">
          <span>Nome</span>
          <input
            className="field is-end"
            value={username}
            maxLength={32}
            onChange={(e) => setUsername(e.target.value)}
            onBlur={() => void saveProfile()}
            onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
            autoComplete="username"
            aria-label="Nome de usuário"
          />
        </label>
        <AvatarPicker value={profile.avatar_type === 'preset' ? profile.avatar_value : ''} onChange={(value) => void saveProfile(value, 'preset')} />
      </Section>

      <Section header="Neste aparelho">
        <div className="pad">
          <Segmented<ThemePreference>
            label="Aparência do app"
            value={theme}
            onChange={(value) => prefs.setTheme(value)}
            options={[{ value: 'system', label: 'Automático' }, { value: 'light', label: 'Claro' }, { value: 'dark', label: 'Escuro' }]}
          />
        </div>
        <Row icon={<Tile color="pink"><Icon name="speaker" size={18} /></Tile>} title="Sons">
          <Switch checked={soundOn} onChange={(value) => prefs.setSoundOn(value)} label="Sons do app" />
        </Row>
        <Row icon={<Tile color="orange"><Icon name="play" size={18} /></Tile>} title="Ver a apresentação" chevron onClick={() => { haptic('light'); onReplayOnboarding() }} />
      </Section>

      {roomId && <PushSettings roomId={roomId} me={profile.username} />}

      <Section>
        <Row icon={<Tile color="gray"><Icon name="lock" size={18} /></Tile>} title="Alterar senha" onClick={() => setPasswordOpen((v) => !v)} ariaLabel="Alterar senha">
          <Icon name="right" size={14} weight={2.6} className={`row-chevron${passwordOpen ? ' is-open' : ''}`} />
        </Row>
        <AnimatePresence initial={false}>
          {passwordOpen && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
              <PasswordChange user={user} onDone={() => { setPasswordOpen(false); setMessage({ text: 'Senha alterada.' }) }} />
            </motion.div>
          )}
        </AnimatePresence>
      </Section>

      <Section footer="Os dados da casa ficam disponíveis só para quem faz parte dela.">
        <Row title={busy === 'logout' ? 'Saindo…' : 'Sair'} danger center onClick={() => void logout()} disabled={busy === 'logout'} />
      </Section>
    </Sheet>
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
  return (
    <form className="password-change" onSubmit={submit}>
      {hasEmailIdentity && <input className="field" type="password" placeholder="Senha atual" aria-label="Senha atual" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} required />}
      <input className="field" type="password" placeholder="Nova senha" aria-label="Nova senha" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required />
      <input className="field" type="password" placeholder="Confirmar nova senha" aria-label="Confirmar nova senha" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} minLength={8} required />
      {error && <p className="form-error" role="alert" style={{ margin: '0 0 6px' }}>{error}</p>}
      <div className="pad"><button className="button is-filled" disabled={busy}>{busy ? 'Alterando…' : 'Alterar senha'}</button></div>
    </form>
  )
}
