import type { User } from '@supabase/supabase-js'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { friendlyAuthError, setAccountPassword, signIn, type Profile, updateProfile, uploadProfileAvatar } from '../lib/auth'
import { haptic } from '../lib/haptics'
import { prefs, useSoundOn, useThemePreference, type ThemePreference } from '../lib/prefs'
import { supabase } from '../lib/supabase'
import { PushSettings } from './PushSettings'
import { AvatarPicker, UserAvatar } from './UserAvatar'
import { Group, Icon, Row, Segmented, Sheet, Switch } from './ui'

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
  const [avatar, setAvatar] = useState(profile.avatar_value)
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [passwordOpen, setPasswordOpen] = useState(false)
  const soundOn = useSoundOn()
  const theme = useThemePreference()

  useEffect(() => { setUsername(profile.username); setAvatar(profile.avatar_value) }, [profile])
  useEffect(() => { if (!open) { setMessage(null); setPasswordOpen(false) } }, [open])

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
    <Sheet open={open} onClose={onClose} title="configurações" onClosed={onClosed}>
      <div className="settings">
        <div className="profile-card">
          <div className="profile-avatar">
            <UserAvatar profile={profile} size={64} />
            <button type="button" className="profile-camera" onClick={() => fileInput.current?.click()} aria-label="Enviar foto" disabled={busy === 'avatar'}><Icon name="camera" size={14} /></button>
            <input ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => void chooseFile(e.target.files?.[0])} />
          </div>
          <div>
            <strong>{profile.username}</strong>
            <span>{user.email}</span>
          </div>
        </div>

        <Group title="perfil">
          <div className="group-pad">
            <label className="field-label" htmlFor="settings-name">nome de usuário</label>
            <input id="settings-name" className="field" value={username} maxLength={32} onChange={(e) => setUsername(e.target.value)} autoComplete="username" />
            <span className="field-label">ícone</span>
            <AvatarPicker value={profile.avatar_type === 'preset' ? avatar : ''} onChange={(value) => { setAvatar(value); void saveProfile(value, 'preset') }} />
            <button className="btn btn-primary" disabled={busy === 'profile' || username.trim() === profile.username} onClick={() => void saveProfile()}>{busy === 'profile' ? 'salvando…' : 'salvar perfil'}</button>
          </div>
        </Group>

        <Group>
          <Row icon={<Icon name="lock" size={20} />} title="senha e segurança" detail="alterar a senha de acesso" onClick={() => setPasswordOpen((v) => !v)} ariaLabel="Senha e segurança" value={<Icon name="down" size={16} className={`row-chevron${passwordOpen ? ' is-open' : ''}`} />} />
          <AnimatePresence initial={false}>
            {passwordOpen && (
              <motion.div className="group-pad" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                <PasswordChange user={user} onDone={() => { setPasswordOpen(false); setMessage('Senha alterada.') }} />
              </motion.div>
            )}
          </AnimatePresence>
        </Group>

        <Group title="neste aparelho">
          <div className="group-pad">
            <span className="field-label">aparência</span>
            <Segmented<ThemePreference>
              label="Aparência do app"
              value={theme}
              onChange={(value) => prefs.setTheme(value)}
              options={[{ value: 'system', label: 'auto' }, { value: 'light', label: 'claro' }, { value: 'dark', label: 'escuro' }]}
            />
          </div>
          <Row icon={<Icon name="sound" size={20} />} title="sons do app" detail="um som curto ao adicionar, pegar e pagar">
            <Switch checked={soundOn} onChange={(value) => prefs.setSoundOn(value)} label="Sons do app" />
          </Row>
          <Row icon={<Icon name="play" size={20} />} title="ver a apresentação de novo" chevron onClick={() => { haptic('light'); onReplayOnboarding() }} />
        </Group>

        {roomId && <PushSettings roomId={roomId} me={profile.username} />}

        {message && <p className="settings-message" role="status">{message}</p>}
        <Group>
          <Row icon={<Icon name="logout" size={20} />} title={busy === 'logout' ? 'saindo…' : 'sair desta conta'} danger onClick={() => void logout()} disabled={busy === 'logout'} />
        </Group>
        <p className="settings-footnote">Os dados da casa ficam disponíveis só para quem faz parte dela.</p>
      </div>
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
    <form className="sheet-form" onSubmit={submit}>
      {hasEmailIdentity && <><label className="field-label" htmlFor="pw-current">senha atual</label><input id="pw-current" className="field" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} required /></>}
      <label className="field-label" htmlFor="pw-new">nova senha</label>
      <input id="pw-new" className="field" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required />
      <label className="field-label" htmlFor="pw-confirm">confirmar nova senha</label>
      <input id="pw-confirm" className="field" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} minLength={8} required />
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="btn btn-primary" disabled={busy}>{busy ? 'alterando…' : 'alterar senha'}</button>
    </form>
  )
}
