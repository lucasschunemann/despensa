import { supabase } from './supabase'

export type RoomIdentity = { id: string; code: string }

// Entrada idempotente na sala. A autenticação agora acontece antes deste ponto.
export async function joinRoom(code: string): Promise<string> {
  const { data, error } = await supabase.rpc('join_room', { p_code: code })
  if (error) throw error
  return data as string
}

export async function getMyRoom(): Promise<RoomIdentity | null> {
  const { data, error } = await supabase.rpc('get_my_room')
  if (error) throw error
  return (data?.[0] as RoomIdentity | undefined) ?? null
}

export async function createRoom(): Promise<RoomIdentity> {
  const { data, error } = await supabase.rpc('create_room')
  if (error) throw error
  const room = data?.[0] as RoomIdentity | undefined
  if (!room) throw new Error('Não foi possível criar a casa.')
  return room
}
