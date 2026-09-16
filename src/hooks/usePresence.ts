import { useCallback, useEffect, useRef, useState } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

export interface Presence {
  online: string[]
  typing: string | null
  notifyTyping: () => void
}

// Quem está com o app aberto agora e quem está escrevendo. Não passa pelo banco:
// é só o canal ao vivo do Supabase, então não deixa rastro nenhum.
export function usePresence(roomId: string, me: string): Presence {
  const [online, setOnline] = useState<string[]>([])
  const [typing, setTyping] = useState<string | null>(null)
  const channel = useRef<RealtimeChannel | null>(null)
  const lastSent = useRef(0)
  const clearTyping = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const room = supabase.channel(`presence:${roomId}`, { config: { presence: { key: me } } })

    room
      .on('presence', { event: 'sync' }, () => {
        setOnline(Object.keys(room.presenceState()).filter((person) => person !== me))
      })
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        const person = (payload as { person?: string }).person
        if (!person || person === me) return
        setTyping(person)
        if (clearTyping.current) clearTimeout(clearTyping.current)
        clearTyping.current = setTimeout(() => setTyping(null), 2600)
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') void room.track({ person: me })
      })

    channel.current = room
    return () => {
      if (clearTyping.current) clearTimeout(clearTyping.current)
      channel.current = null
      void supabase.removeChannel(room)
    }
  }, [roomId, me])

  // no máximo um aviso a cada 1,5s enquanto a pessoa digita
  const notifyTyping = useCallback(() => {
    const now = Date.now()
    if (now - lastSent.current < 1500) return
    lastSent.current = now
    void channel.current?.send({ type: 'broadcast', event: 'typing', payload: { person: me } })
  }, [me])

  return { online, typing, notifyTyping }
}
