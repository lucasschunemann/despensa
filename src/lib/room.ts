import { supabase } from './supabase'

// Sign-in anônimo (invisível para o usuário) + entrada idempotente na sala pelo código.
export async function joinRoom(code: string): Promise<string> {
  const { data: sessionData } = await supabase.auth.getSession()
  if (!sessionData.session) {
    const { error } = await supabase.auth.signInAnonymously()
    if (error) throw error
  }

  const { data, error } = await supabase.rpc('join_room', { p_code: code })
  if (error) throw error
  return data as string
}
