import { supabase } from './supabase'

type Kind = 'item' | 'conta' | 'desejo'

interface Pending {
  kind: Kind
  subjects: string[]
}

const WAIT_MS = 12000
const queue = new Map<Kind, Pending>()
let timer: ReturnType<typeof setTimeout> | null = null
let context: { roomId: string; person: string } | null = null

function phrase({ kind, subjects }: Pending, person: string): { title: string; body: string; url: string } {
  const list =
    subjects.length <= 2
      ? subjects.join(' e ')
      : `${subjects.slice(0, 2).join(', ')} e mais ${subjects.length - 2}`

  if (kind === 'item') {
    return {
      title: subjects.length === 1 ? `${person} colocou um item na lista` : `${person} colocou ${subjects.length} itens`,
      body: list,
      url: '/#lista',
    }
  }
  if (kind === 'conta') {
    return {
      title: subjects.length === 1 ? `${person} pagou uma conta` : `${person} pagou ${subjects.length} contas`,
      body: list,
      url: '/#contas',
    }
  }
  return {
    title: subjects.length === 1 ? `${person} quer uma coisa nova` : `${person} colocou ${subjects.length} desejos`,
    body: list,
    url: '/#desejos',
  }
}

function flush() {
  timer = null
  const ctx = context
  if (!ctx) return

  for (const pending of queue.values()) {
    const { title, body, url } = phrase(pending, ctx.person)
    // se a função ainda não estiver publicada, o app segue normal: aviso é bônus
    void supabase.functions
      .invoke('notificar', { body: { room_id: ctx.roomId, from: ctx.person, title, body, url } })
      .catch(() => {})
  }
  queue.clear()
}

/**
 * Avisa a outra pessoa, juntando o que aconteceu nos últimos segundos:
 * cinco itens seguidos viram um aviso só, não cinco.
 */
export function notifyOthers(roomId: string, person: string, kind: Kind, subject: string) {
  context = { roomId, person }
  const pending = queue.get(kind) ?? { kind, subjects: [] }
  pending.subjects.push(subject)
  queue.set(kind, pending)

  if (timer) clearTimeout(timer)
  timer = setTimeout(flush, WAIT_MS)
}
