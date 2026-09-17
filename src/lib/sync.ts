import { useSyncExternalStore } from 'react'
import { createOutbox, isNetworkFailure, type ExecResult, type Op, type OutboxState } from './outbox'
import { supabase } from './supabase'

const KEY = 'despensa:fila'

async function execute(op: Op): Promise<ExecResult> {
  let error: { message: string } | null = null
  try {
    if (op.kind === 'upsert' && op.table && op.values) {
      ;({ error } = await supabase.from(op.table).upsert(op.values, { onConflict: op.onConflict ?? 'id' }))
    } else if (op.kind === 'update' && op.table && op.rowId && op.values) {
      ;({ error } = await supabase.from(op.table).update(op.values).eq('id', op.rowId))
    } else if (op.kind === 'delete' && op.table && op.rowId) {
      ;({ error } = await supabase.from(op.table).delete().eq('id', op.rowId))
    } else if (op.kind === 'rpc' && op.rpc) {
      ;({ error } = await supabase.rpc(op.rpc, op.args ?? {}))
    } else {
      return { ok: false, network: false, message: 'operação malformada' }
    }
  } catch (e) {
    error = { message: e instanceof Error ? e.message : String(e) }
  }

  if (!error) return { ok: true }
  return { ok: false, network: isNetworkFailure(error.message, navigator.onLine), message: error.message }
}

const drainedListeners = new Set<() => void>()
const rejectedListeners = new Set<(message: string) => void>()

export const outbox = createOutbox({
  storage: {
    load() {
      try {
        return JSON.parse(localStorage.getItem(KEY) ?? '[]') as Op[]
      } catch {
        return []
      }
    },
    save(ops) {
      try {
        localStorage.setItem(KEY, JSON.stringify(ops))
      } catch {
        /* sem armazenamento (aba privada): a fila vive só na memória */
      }
    },
  },
  execute,
  // O banco cria o push na mesma transação da mudança, inclusive após sincronizar offline.
  onDrained() {
    drainedListeners.forEach((l) => l())
  },
  onRejected(_, message) {
    rejectedListeners.forEach((l) => l(message))
  },
})

/** Quando a fila esvazia (tudo chegou), cada módulo busca de novo a verdade do servidor. */
export function onSynced(listener: () => void) {
  drainedListeners.add(listener)
  return () => {
    drainedListeners.delete(listener)
  }
}

export function onRejected(listener: (message: string) => void) {
  rejectedListeners.add(listener)
  return () => {
    rejectedListeners.delete(listener)
  }
}

let started = false

/** Tenta enviar quando o sinal volta, quando o app volta a aparecer, e de tempos em tempos. */
export function startSync() {
  if (started) return
  started = true
  window.addEventListener('online', () => void outbox.flush())
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void outbox.flush()
  })
  setInterval(() => {
    if (outbox.pending().length > 0) void outbox.flush()
  }, 8000)
  void outbox.flush()
}

export function useSyncState(): OutboxState {
  return useSyncExternalStore(outbox.subscribe, outbox.getState, outbox.getState)
}
