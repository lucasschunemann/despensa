import type { User } from '@supabase/supabase-js'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { friendlyAuthError, setAccountPassword, signIn, type Profile, updateProfile, uploadProfileAvatar } from '../lib/auth'
import { haptic } from '../lib/haptics'
import { prefs, useSoundOn, useThemePreference, type ThemePreference } from '../lib/prefs'
import { supabase } from '../lib/supabase'
import { PushSettings } from './PushSettings'
import { AvatarPicker, UserAvatar } from './UserAvatar'
import { Icon, Select, Sheet, Switch } from './ui'

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
      setMessage({ text: 'Perfil atualizado.' })
      haptic('success')
    } catch (cause) { setMessage({ text: friendlyAuthError(cause), error: true }); haptic('medium') } finally { setBusy(null) }
  }

  async function chooseFile(file?: File) {
    if (!file) return
    setBusy('avatar'); setMessage(null)
    try {
      const url = await uploadProfileAvatar(user.id, file)
      const next = await updateProfile(user.id, { username: username.trim(), avatar_type: 'upload', avatar_value: url })
      onProfileChange(next); setMessage({ text: 'Foto atualizada.' }); haptic('success')
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
          <UserAvatar profile={profile} size={56} />
          <button type="button" className="profile-camera" onClick={() => fileInput.current?.click()} aria-label="Enviar foto" disabled={busy === 'avatar'}><Icon name="camera" size={13} /></button>
          <input ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => void chooseFile(e.target.files?.[0])} />
        </div>
        <div>
          <strong>{profile.username}</strong>
          <span>{user.email}</span>
        </div>
      </div>
      {message && <p className={message.error ? 'form-error' : 'form-notice'} role={message.error ? 'alert' : 'status'}>{message.text}</p>}

      <section className="settings-section">
        <h3>Minha conta</h3>
        <label className="field-label" htmlFor="settings-name">Nome</label>
        <input
          id="settings-name"
          className="field"
          value={username}
          maxLength={32}
          onChange={(e) => setUsername(e.target.value)}
          onBlur={() => void saveProfile()}
          onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
          autoComplete="username"
        />
        <p className="field-label">Ícone</p>
        <AvatarPicker value={profile.avatar_type === 'preset' ? profile.avatar_value : ''} onChange={(value) => void saveProfile(value, 'preset')} />
        <div style={{ marginTop: 12 }}>
          <button className="setting" onClick={() => setPasswordOpen((v) => !v)} aria-expanded={passwordOpen}>
            <Icon name="lock" size={18} />
            <span className="setting-text"><span className="setting-title">Senha</span><span className="setting-detail">Alterar a senha de acesso</span></span>
            <Icon name="down" size={16} />
          </button>
          <AnimatePresence initial={false}>
            {passwordOpen && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
                <PasswordChange user={user} onDone={() => { setPasswordOpen(false); setMessage({ text: 'Senha alterada.' }) }} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      <section className="settings-section">
        <h3>Neste aparelho</h3>
        <div className="setting">
          <Icon name="sun" size={18} />
          <span className="setting-text"><span className="setting-title">Aparência</span></span>
          <Select<ThemePreference>
            label="Aparência do app"
            value={theme}
            onChange={(value) => prefs.setTheme(value)}
            options={[{ value: 'system', label: 'Auto' }, { value: 'light', label: 'Claro' }, { value: 'dark', label: 'Escuro' }]}
          />
        </div>
        <div className="setting">
          <Icon name="speaker" size={18} />
          <span className="setting-text"><span className="setting-title">Sons</span><span className="setting-detail">Um som curto ao adicionar, pegar e pagar</span></span>
          <Switch checked={soundOn} onChange={(value) => prefs.setSoundOn(value)} label="Sons do app" />
        </div>
        <button className="setting" onClick={() => { haptic('light'); onReplayOnboarding() }}>
          <Icon name="play" size={18} />
          <span className="setting-text"><span className="setting-title">Ver a apresentação</span></span>
          <Icon name="right" size={16} />
        </button>
      </section>

      {roomId && <PushSettings roomId={roomId} me={profile.username} />}

      <section className="settings-section">
        <button className="setting is-danger" onClick={() => void logout()} disabled={busy === 'logout'}>
          <Icon name="logout" size={18} />
          <span className="setting-text"><span className="setting-title">{busy === 'logout' ? 'Saindo…' : 'Sair'}</span><span className="setting-detail">Os dados da casa ficam só com quem faz parte dela.</span></span>
        </button>
      </section>
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
    <form onSubmit={submit} style={{ paddingBottom: 8 }}>
      {hasEmailIdentity && <><label className="field-label" htmlFor="pw-current">Senha atual</label><input id="pw-current" className="field" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} required /></>}
      <label className="field-label" htmlFor="pw-new">Nova senha</label>
      <input id="pw-new" className="field" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required />
      <label className="field-label" htmlFor="pw-confirm">Confirmar nova senha</label>
      <input id="pw-confirm" className="field" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} minLength={8} required />
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="button is-primary" style={{ marginTop: 12 }} disabled={busy}>{busy ? 'Alterando…' : 'Alterar senha'}</button>
    </form>
  )
}
