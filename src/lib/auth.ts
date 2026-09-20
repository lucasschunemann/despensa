import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js'
import { supabase, supabasePublishableKey, supabaseUrl } from './supabase'
import { authRedirect } from './auth-url'

export const AVATAR_PRESETS = [
  { id: 'cat', emoji: '🐈', color: '#f0a35e' },
  { id: 'fox', emoji: '🦊', color: '#ec7d54' },
  { id: 'bear', emoji: '🐻', color: '#9d795e' },
  { id: 'panda', emoji: '🐼', color: '#80858d' },
  { id: 'frog', emoji: '🐸', color: '#75a86b' },
  { id: 'owl', emoji: '🦉', color: '#9b7d62' },
] as const

export type Profile = {
  id: string
  username: string
  avatar_type: 'preset' | 'upload'
  avatar_value: string
  role: 'member' | 'admin'
  created_at: string
  updated_at: string
}

export function friendlyAuthError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  if (/invalid login credentials/i.test(message)) return 'E-mail ou senha incorretos.'
  if (/email not confirmed/i.test(message)) return 'Confirme seu e-mail antes de entrar.'
  if (/user already registered|already been registered/i.test(message)) return 'Este e-mail já possui uma conta.'
  if (/password should be|weak password/i.test(message)) return 'Use uma senha com pelo menos 8 caracteres.'
  if (/unsupported provider|provider is not enabled/i.test(message)) return 'Este acesso ainda precisa ser ativado no servidor.'
  if (/profiles_username_unique|duplicate key/i.test(message)) return 'Este nome de usuário já está em uso.'
  return message
}

export async function signIn(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
}

export async function signUp(email: string, password: string, username: string, avatar: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: authRedirect('confirmation'), data: { username: username.trim(), avatar_value: avatar } },
  })
  if (error) throw error
  return data
}

export async function continueWith(provider: 'apple' | 'google', linking = false) {
  const redirectTo = authRedirect('oauth')
  const result = linking
    ? await supabase.auth.linkIdentity({ provider, options: { redirectTo } })
    : await supabase.auth.signInWithOAuth({ provider, options: { redirectTo } })
  if (result.error) throw result.error
}

export async function getSocialProviders(): Promise<{ apple: boolean; google: boolean }> {
  if (!supabaseUrl || !supabasePublishableKey) return { apple: false, google: false }
  try {
    const response = await fetch(`${supabaseUrl}/auth/v1/settings`, { headers: { apikey: supabasePublishableKey } })
    const data = await response.json() as { external?: Record<string, boolean> }
    return { apple: Boolean(data.external?.apple), google: Boolean(data.external?.google) }
  } catch { return { apple: false, google: false } }
}

export async function upgradeAnonymous(email: string, username: string, avatar: string) {
  const { data, error } = await supabase.auth.updateUser({
    email,
    data: { username: username.trim(), avatar_value: avatar, onboarding_password_pending: true },
  }, { emailRedirectTo: authRedirect('conversion') })
  if (error) throw error
  const profile = {
    id: data.user.id,
    username: username.trim(),
    avatar_type: 'preset' as const,
    avatar_value: avatar,
  }
  const { error: profileError } = await supabase.from('profiles').upsert(profile)
  if (profileError) throw profileError
  return data
}

export async function setAccountPassword(password: string) {
  const { data: current } = await supabase.auth.getUser()
  const data = { ...current.user?.user_metadata, onboarding_password_pending: false }
  const { error } = await supabase.auth.updateUser({ password, data })
  if (error) throw error
}

export async function sendPasswordReset(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: authRedirect('recovery'),
  })
  if (error) throw error
}

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
  if (error) throw error
  return data as Profile | null
}

export async function updateProfile(userId: string, values: Pick<Profile, 'username' | 'avatar_type' | 'avatar_value'>) {
  const { data, error } = await supabase.from('profiles').update(values).eq('id', userId).select().single()
  if (error) throw error
  await supabase.auth.updateUser({ data: { username: values.username, avatar_value: values.avatar_value } })
  return data as Profile
}

async function shrinkAvatar(file: File): Promise<Blob> {
  if (!file.type.startsWith('image/')) throw new Error('Escolha uma imagem válida.')
  const bitmap = await createImageBitmap(file)
  const size = Math.min(bitmap.width, bitmap.height)
  const sx = (bitmap.width - size) / 2
  const sy = (bitmap.height - size) / 2
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 512
  canvas.getContext('2d')?.drawImage(bitmap, sx, sy, size, size, 0, 0, 512, 512)
  bitmap.close()
  return await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Não foi possível preparar a imagem.')), 'image/webp', .84),
  )
}

export async function uploadProfileAvatar(userId: string, file: File): Promise<string> {
  const blob = await shrinkAvatar(file)
  const path = `${userId}/avatar.webp`
  const { error } = await supabase.storage.from('profile-avatars').upload(path, blob, {
    upsert: true,
    contentType: 'image/webp',
    cacheControl: '3600',
  })
  if (error) throw error
  const { data } = supabase.storage.from('profile-avatars').getPublicUrl(path)
  return `${data.publicUrl}?v=${Date.now()}`
}

export type AuthSnapshot = { session: Session | null; user: User | null; event?: AuthChangeEvent }
