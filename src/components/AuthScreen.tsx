import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { continueWith, friendlyAuthError, getSocialProviders, sendPasswordReset, setAccountPassword, signIn, signUp, upgradeAnonymous } from '../lib/auth'
import { haptic } from '../lib/haptics'
import { Mark } from './Avatar'
import { AvatarPicker } from './UserAvatar'
import { supabase } from '../lib/supabase'

type Mode = 'signin' | 'signup' | 'forgot'

export function AuthScreen({ legacy = false, initialUsername = '' }: { legacy?: boolean; initialUsername?: string }) {
  const reduced = useReducedMotion()
  const [mode, setMode] = useState<Mode>(legacy ? 'signup' : 'signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState(initialUsername)
  const [avatar, setAvatar] = useState('cat')
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [providers, setProviders] = useState({ apple: false, google: false })
  const strength = useMemo(() => passwordScore(password), [password])
  useEffect(() => { void getSocialProviders().then(setProviders) }, [])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true); setError(null); setNotice(null)
    try {
      if (mode === 'forgot') {
        await sendPasswordReset(email.trim())
        setNotice('Enviamos um link seguro para redefinir sua senha.')
      } else if (mode === 'signin') {
        await signIn(email.trim(), password)
      } else {
        if (username.trim().length < 2) throw new Error('Escolha um nome com pelo menos 2 caracteres.')
        if (password.length < 8 && !legacy) throw new Error('Use uma senha com pelo menos 8 caracteres.')
        if (legacy) {
          await upgradeAnonymous(email.trim(), username, avatar)
          setNotice('Abra o e-mail de confirmação neste aparelho. Depois, você criará sua senha.')
        } else {
          const result = await signUp(email.trim(), password, username, avatar)
          if (!result.session) setNotice('Conta criada. Confirme pelo e-mail e depois abra novamente o Despensa na tela inicial.')
        }
      }
    } catch (cause) {
      setError(friendlyAuthError(cause))
      haptic('medium')
    } finally { setBusy(false) }
  }

  const title = legacy ? 'proteja sua casa' : mode === 'signin' ? 'que bom te ver' : mode === 'signup' ? 'crie sua casa' : 'recupere o acesso'
  const subtitle = legacy
    ? 'Transforme este acesso em uma conta sem perder uma única conta, desejo ou item de Lucas e Bela.'
    : mode === 'signin' ? 'Sua rotina compartilhada, exatamente onde você deixou.'
      : mode === 'signup' ? 'Um espaço privado para organizar a vida de quem mora com você.'
        : 'Vamos enviar um link de uso único para o seu e-mail.'

  return (
    <main className="auth-shell">
      <motion.aside className="auth-story" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div className="auth-orb auth-orb-one" /><div className="auth-orb auth-orb-two" />
        <div className="auth-brand"><Mark size={34} /><span>despensa</span></div>
        <div className="auth-story-copy">
          <span className="auth-kicker">uma casa em sintonia</span>
          <h2>Menos coisas<br />na cabeça.</h2>
          <p>Contas, mercado e planos vivendo juntos em um lugar calmo.</p>
        </div>
        <div className="auth-preview" aria-hidden>
          <span>hoje</span><strong>tudo em ordem</strong>
          <div><i /><i /><i /></div>
        </div>
      </motion.aside>

      <section className="auth-panel">
        <div className="auth-mobile-brand"><Mark size={30} /><span>despensa</span></div>
        <motion.div className="auth-card" layout transition={{ type: 'spring', stiffness: 360, damping: 32 }}>
          <div className="auth-heading"><h1>{title}</h1><p>{subtitle}</p></div>

          {!legacy && mode !== 'forgot' && (
            <div className="auth-tabs" role="tablist">
              {(['signin', 'signup'] as const).map((tab) => (
                <button key={tab} type="button" role="tab" aria-selected={mode === tab} onClick={() => { setMode(tab); setError(null); setNotice(null) }}>
                  {mode === tab && <motion.span layoutId="auth-tab" className="auth-tab-pill" transition={{ type: 'spring', stiffness: 440, damping: 36 }} />}
                  <span>{tab === 'signin' ? 'entrar' : 'criar conta'}</span>
                </button>
              ))}
            </div>
          )}

          <AnimatePresence mode="wait" initial={false}>
            <motion.form
              key={`${mode}-${legacy}`}
              className="auth-form"
              onSubmit={submit}
              initial={{ opacity: 0, x: reduced ? 0 : 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: reduced ? 0 : -10 }}
              transition={{ duration: reduced ? 0 : .2 }}
            >
              {(mode === 'signup' || legacy) && (
                <>
                  <label className="auth-field"><span>nome de usuário</span><input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" maxLength={32} placeholder="como devemos te chamar?" required /></label>
                  <div className="auth-avatar-field"><span>seu avatar</span><AvatarPicker value={avatar} onChange={setAvatar} /></div>
                </>
              )}
              <label className="auth-field"><span>e-mail</span><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" inputMode="email" placeholder="voce@exemplo.com" required /></label>
              {mode !== 'forgot' && !legacy && (
                <label className="auth-field"><span>senha</span><div className="password-field"><input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} placeholder="mínimo de 8 caracteres" required minLength={8} /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}>{showPassword ? 'ocultar' : 'mostrar'}</button></div>{mode === 'signup' && <span className={`password-strength s${strength}`}><i /><i /><i /><i /><small>{['muito curta', 'fraca', 'boa', 'forte', 'excelente'][strength]}</small></span>}</label>
              )}
              <AnimatePresence>{(error || notice) && <motion.p className={error ? 'auth-message is-error' : 'auth-message is-success'} initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}>{error ?? notice}</motion.p>}</AnimatePresence>
              <motion.button className="auth-submit" type="submit" disabled={busy} whileTap={{ scale: .985 }}>
                {busy ? <span className="auth-spinner" /> : mode === 'signin' ? 'entrar' : mode === 'forgot' ? 'enviar link' : legacy ? 'proteger minha casa' : 'criar minha conta'}
              </motion.button>
              {mode === 'signin' && <button className="auth-link" type="button" onClick={() => setMode('forgot')}>esqueci minha senha</button>}
              {mode === 'forgot' && <button className="auth-link" type="button" onClick={() => setMode('signin')}>voltar para entrar</button>}
            </motion.form>
          </AnimatePresence>

          {mode !== 'forgot' && (
            <>
              <div className="auth-divider"><span>ou continue com</span></div>
              <div className="social-buttons">
                <button type="button" disabled={!providers.apple} title={!providers.apple ? 'Disponível após configurar o provedor Apple' : undefined} onClick={() => void social('apple', legacy, setBusy, setError)}><AppleIcon /><span>Apple{!providers.apple && <small>em breve</small>}</span></button>
                <button type="button" disabled={!providers.google} title={!providers.google ? 'Disponível após configurar o provedor Google' : undefined} onClick={() => void social('google', legacy, setBusy, setError)}><GoogleIcon /><span>Google{!providers.google && <small>em breve</small>}</span></button>
              </div>
            </>
          )}
          {legacy && <button className="auth-link legacy-login" type="button" onClick={() => void supabase.auth.signOut()}>já tenho uma conta</button>}
          <p className="auth-legal">Ao continuar, você concorda em manter os dados da sua casa protegidos neste aparelho.</p>
        </motion.div>
      </section>
    </main>
  )
}

export function PasswordSetup({ recovery = false, onDone }: { recovery?: boolean; onDone: () => void }) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (password.length < 8) return setError('Use pelo menos 8 caracteres.')
    if (password !== confirm) return setError('As senhas não coincidem.')
    setBusy(true); setError(null)
    try { await setAccountPassword(password); onDone() } catch (cause) { setError(friendlyAuthError(cause)) } finally { setBusy(false) }
  }
  return <main className="auth-shell auth-compact"><section className="auth-panel"><div className="auth-card"><div className="auth-mobile-brand always"><Mark size={30} /><span>despensa</span></div><div className="auth-heading"><span className="auth-kicker">último passo</span><h1>{recovery ? 'nova senha' : 'crie sua senha'}</h1><p>{recovery ? 'Escolha uma senha nova para recuperar sua conta.' : 'Seu e-mail foi confirmado. Agora escolha a chave da sua casa.'}</p></div><form className="auth-form" onSubmit={submit}><label className="auth-field"><span>senha</span><input type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label><label className="auth-field"><span>confirme a senha</span><input type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required /></label>{error && <p className="auth-message is-error">{error}</p>}<button className="auth-submit" disabled={busy}>{busy ? <span className="auth-spinner" /> : 'salvar e continuar'}</button></form></div></section></main>
}

async function social(provider: 'apple' | 'google', linking: boolean, setBusy: (v: boolean) => void, setError: (v: string | null) => void) {
  setBusy(true); setError(null)
  try { await continueWith(provider, linking) } catch (cause) { setError(friendlyAuthError(cause)); setBusy(false) }
}

function passwordScore(value: string) {
  if (!value) return 0
  let score = value.length >= 8 ? 1 : 0
  if (value.length >= 12) score++
  if (/[A-Z]/.test(value) && /[a-z]/.test(value)) score++
  if (/\d/.test(value) && /[^A-Za-z0-9]/.test(value)) score++
  return Math.min(4, score)
}

function AppleIcon() { return <svg viewBox="0 0 24 24" aria-hidden><path fill="currentColor" d="M17.1 12.5c0-2.7 2.2-4 2.3-4.1a5 5 0 0 0-4-2.2c-1.7-.2-3.3 1-4.2 1-.9 0-2.2-1-3.7-1A5.5 5.5 0 0 0 2.9 9c-2 3.4-.5 8.5 1.4 11.3.9 1.4 2 2.9 3.5 2.8 1.4-.1 1.9-.9 3.6-.9s2.2.9 3.7.9 2.5-1.4 3.4-2.8a12 12 0 0 0 1.6-3.3 4.8 4.8 0 0 1-3-4.5ZM14.3 4.4A4.9 4.9 0 0 0 15.4.9a5 5 0 0 0-3.3 1.7A4.6 4.6 0 0 0 11 6a4.1 4.1 0 0 0 3.3-1.6Z" /></svg> }
function GoogleIcon() { return <svg viewBox="0 0 24 24" aria-hidden><path fill="#4285f4" d="M21.6 12.2c0-.7-.1-1.5-.2-2.2H12v4.2h5.4a4.6 4.6 0 0 1-2 3v2.7h3.4c2-1.8 2.8-4.5 2.8-7.7Z"/><path fill="#34a853" d="M12 22c2.7 0 5-.9 6.8-2.4l-3.4-2.7c-.9.6-2.1 1-3.4 1a6 6 0 0 1-5.6-4.1H3v2.8A10.3 10.3 0 0 0 12 22Z"/><path fill="#fbbc05" d="M6.4 13.8a6 6 0 0 1 0-3.6V7.4H3a10.2 10.2 0 0 0 0 9.2l3.4-2.8Z"/><path fill="#ea4335" d="M12 6.1c1.5 0 2.8.5 3.9 1.5l2.9-2.9A9.8 9.8 0 0 0 3 7.4l3.4 2.8A6 6 0 0 1 12 6.1Z"/></svg> }
