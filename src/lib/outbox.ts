// Fila de alterações. Tudo que muda dados passa por aqui: a mudança aparece na tela na hora,
// entra na fila (guardada no aparelho) e é enviada assim que dá. Sem sinal no mercado, as
// alterações esperam; quando o sinal volta, saem na ordem em que foram feitas.
//
// Esta parte não conhece o Supabase: quem executa cada operação é injetado (ver sync.ts),
// o que deixa a lógica testável sem rede.

export type Row = { id: string } & Record<string, unknown>

/** Como a operação aparece na tela enquanto ainda não chegou ao servidor. */
export interface Rebase {
  table: string
  insert?: Row
  removeIds?: string[]
  patch?: { ids: string[]; set: Record<string, unknown> }
}

export interface Op {
  id: string
  createdAt: number
  kind: 'upsert' | 'update' | 'delete' | 'rpc'
  table?: string
  rpc?: string
  /** upsert: a linha inteira; update: os campos que mudam */
  values?: Record<string, unknown>
  /** update/delete: qual linha (sempre pelo id) */
  rowId?: string
  /** upsert em tabela cuja chave não é "id" (ex.: room_settings) */
  onConflict?: string
  args?: Record<string, unknown>
  rebase?: Rebase
  /** aviso para a outra pessoa, disparado só depois que a operação chega ao servidor */
  notify?: { roomId: string; person: string; kind: 'item' | 'conta' | 'desejo'; subject: string }
  attempts: number
}

export type ExecResult = { ok: true } | { ok: false; network: boolean; message: string }

export interface Storage {
  load(): Op[]
  save(ops: Op[]): void
}

export interface OutboxOptions {
  storage: Storage
  execute: (op: Op) => Promise<ExecResult>
  /** a operação foi recusada pelo servidor (não é falta de sinal): sai da fila */
  onRejected?: (op: Op, message: string) => void
  onSent?: (op: Op) => void
  /** fila esvaziou depois de enviar algo: hora de buscar a verdade do servidor */
  onDrained?: () => void
}

export type OutboxState = { pending: number; flushing: boolean; offline: boolean }

export function createOutbox({ storage, execute, onRejected, onSent, onDrained }: OutboxOptions) {
  let ops: Op[] = storage.load()
  let flushing = false
  let offline = false
  const listeners = new Set<() => void>()
  let snapshot: OutboxState = { pending: ops.length, flushing, offline }

  const emit = () => {
    snapshot = { pending: ops.length, flushing, offline }
    listeners.forEach((l) => l())
  }

  const persist = () => {
    storage.save(ops)
    emit()
  }

  async function flush(): Promise<void> {
    if (flushing || ops.length === 0) return
    flushing = true
    emit()
    let sentAny = false

    try {
      while (ops.length > 0) {
        const op = ops[0]
        const result = await execute(op)

        if (result.ok) {
          ops = ops.slice(1)
          offline = false
          sentAny = true
          persist()
          onSent?.(op)
          continue
        }

        if (result.network) {
          // sem sinal: para aqui e tenta de novo depois, sem perder nada nem mudar a ordem
          op.attempts += 1
          offline = true
          persist()
          return
        }

        // o servidor disse não (regra, dado inválido): tentar de novo não adianta
        ops = ops.slice(1)
        persist()
        onRejected?.(op, result.message)
      }
    } finally {
      flushing = false
      emit()
      if (sentAny && ops.length === 0) onDrained?.()
    }
  }

  return {
    enqueue(op: Omit<Op, 'createdAt' | 'attempts'>) {
      ops = [...ops, { ...op, createdAt: Date.now(), attempts: 0 }]
      persist()
      void flush()
    },
    flush,
    pending: () => ops,
    getState: () => snapshot,
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}

export type Outbox = ReturnType<typeof createOutbox>

/**
 * Aplica em cima dos dados do servidor o que ainda está na fila, para uma atualização vinda do
 * servidor não "desfazer" na tela algo que você fez sem sinal.
 */
export function applyPending<T extends { id: string }>(rows: T[], table: string, pending: Op[]): T[] {
  let result = rows.slice()

  for (const op of pending) {
    if (op.table === table && op.kind === 'upsert' && op.values) {
      const row = op.values as unknown as T
      const idx = result.findIndex((r) => r.id === row.id)
      result = idx === -1 ? [...result, row] : result.map((r, i) => (i === idx ? { ...r, ...row } : r))
    }
    if (op.table === table && op.kind === 'update' && op.rowId && op.values) {
      result = result.map((r) => (r.id === op.rowId ? { ...r, ...op.values } : r))
    }
    if (op.table === table && op.kind === 'delete' && op.rowId) {
      result = result.filter((r) => r.id !== op.rowId)
    }

    const rebase = op.rebase
    if (rebase && rebase.table === table) {
      if (rebase.insert && !result.some((r) => r.id === rebase.insert?.id)) {
        result = [...result, rebase.insert as unknown as T]
      }
      if (rebase.removeIds) {
        const gone = new Set(rebase.removeIds)
        result = result.filter((r) => !gone.has(r.id))
      }
      if (rebase.patch) {
        const ids = new Set(rebase.patch.ids)
        const set = rebase.patch.set
        result = result.map((r) => (ids.has(r.id) ? { ...r, ...set } : r))
      }
    }
  }

  return result
}

/** Falta de sinal, e não recusa do servidor. Os navegadores escrevem isso de jeitos diferentes. */
export function isNetworkFailure(message: string, online = true): boolean {
  if (!online) return true
  return /failed to fetch|load failed|networkerror|network request failed|fetch failed|timeout|timed out|err_internet|offline/i.test(
    message,
  )
}
