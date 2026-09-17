import { describe, expect, it, vi } from 'vitest'
import { applyPending, createOutbox, isNetworkFailure, type ExecResult, type Op } from './outbox'

function memoryStorage(initial: Op[] = []) {
  let saved = initial
  return {
    load: () => saved,
    save: (ops: Op[]) => {
      saved = ops
    },
    peek: () => saved,
  }
}

const insert = (id: string) => ({ id, kind: 'upsert' as const, table: 'items', values: { id, name: id } })

describe('outbox', () => {
  it('envia na ordem em que as coisas foram feitas', async () => {
    const sent: string[] = []
    const box = createOutbox({
      storage: memoryStorage(),
      execute: async (op) => {
        sent.push(op.id)
        return { ok: true }
      },
    })
    box.enqueue(insert('a'))
    box.enqueue(insert('b'))
    box.enqueue(insert('c'))
    await box.flush()
    await new Promise((r) => setTimeout(r, 0))
    expect(sent).toEqual(['a', 'b', 'c'])
    expect(box.pending()).toHaveLength(0)
  })

  it('sem sinal: guarda tudo, na mesma ordem, e manda quando volta', async () => {
    let online = false
    const sent: string[] = []
    const storage = memoryStorage()
    const box = createOutbox({
      storage,
      execute: async (op): Promise<ExecResult> => {
        if (!online) return { ok: false, network: true, message: 'Failed to fetch' }
        sent.push(op.id)
        return { ok: true }
      },
    })

    box.enqueue(insert('leite'))
    box.enqueue(insert('pao'))
    await box.flush()
    expect(sent).toEqual([])
    expect(box.getState()).toMatchObject({ pending: 2, offline: true })
    // guardado no aparelho: sobrevive a fechar o app
    expect(storage.peek().map((o) => o.id)).toEqual(['leite', 'pao'])

    online = true
    await box.flush()
    expect(sent).toEqual(['leite', 'pao'])
    expect(box.getState()).toMatchObject({ pending: 0, offline: false })
  })

  it('reabrindo o app, continua de onde parou', async () => {
    const leftover: Op[] = [{ ...insert('cafe'), createdAt: 1, attempts: 2 }]
    const execute = vi.fn(async (): Promise<ExecResult> => ({ ok: true }))
    const box = createOutbox({ storage: memoryStorage(leftover), execute })
    expect(box.getState().pending).toBe(1)
    await box.flush()
    expect(execute).toHaveBeenCalledTimes(1)
    expect(box.pending()).toHaveLength(0)
  })

  it('recusa do servidor tira da fila, avisa, e não trava o resto', async () => {
    const rejected: string[] = []
    const sent: string[] = []
    const box = createOutbox({
      storage: memoryStorage(),
      execute: async (op): Promise<ExecResult> => {
        if (op.id === 'ruim') return { ok: false, network: false, message: 'violates row-level security' }
        sent.push(op.id)
        return { ok: true }
      },
      onRejected: (op) => rejected.push(op.id),
    })
    box.enqueue(insert('ruim'))
    box.enqueue(insert('bom'))
    await box.flush()
    await new Promise((r) => setTimeout(r, 0))
    expect(rejected).toEqual(['ruim'])
    expect(sent).toEqual(['bom'])
  })

  it('só pede para buscar o servidor quando esvazia depois de enviar', async () => {
    const drained = vi.fn()
    const box = createOutbox({ storage: memoryStorage(), execute: async () => ({ ok: true }), onDrained: drained })
    await box.flush()
    expect(drained).not.toHaveBeenCalled()
    box.enqueue(insert('a'))
    await new Promise((r) => setTimeout(r, 0))
    expect(drained).toHaveBeenCalledTimes(1)
  })
})

describe('applyPending', () => {
  const server = [
    { id: '1', name: 'Leite', status: 'pendente' },
    { id: '2', name: 'Pão', status: 'pendente' },
  ]
  const op = (partial: Partial<Op>): Op => ({ id: 'x', createdAt: 0, attempts: 0, kind: 'rpc', ...partial })

  it('o que foi feito sem sinal não some quando chega atualização do servidor', () => {
    const pending = [
      op({ kind: 'upsert', table: 'items', values: { id: '3', name: 'Café', status: 'pendente' } }),
      op({ kind: 'update', table: 'items', rowId: '1', values: { status: 'pegado' } }),
      op({ kind: 'delete', table: 'items', rowId: '2' }),
    ]
    expect(applyPending(server, 'items', pending)).toEqual([
      { id: '1', name: 'Leite', status: 'pegado' },
      { id: '3', name: 'Café', status: 'pendente' },
    ])
  })

  it('ignora operações de outras tabelas', () => {
    const pending = [op({ kind: 'delete', table: 'wishes', rowId: '1' })]
    expect(applyPending(server, 'items', pending)).toEqual(server)
  })

  it('funções do servidor também aparecem na tela antes de chegar', () => {
    const pending = [
      op({ rpc: 'finish_shopping', rebase: { table: 'items', removeIds: ['1'] } }),
      op({ rpc: 'settle', rebase: { table: 'items', patch: { ids: ['2'], set: { status: 'pegado' } } } }),
    ]
    expect(applyPending(server, 'items', pending)).toEqual([{ id: '2', name: 'Pão', status: 'pegado' }])
  })
})

describe('isNetworkFailure', () => {
  it.each(['TypeError: Failed to fetch', 'Load failed', 'NetworkError when attempting to fetch resource.'])(
    '%s é falta de sinal',
    (message) => expect(isNetworkFailure(message)).toBe(true),
  )

  it('recusa do banco não é falta de sinal', () => {
    expect(isNetworkFailure('new row violates row-level security policy')).toBe(false)
  })

  it('aparelho offline é sempre falta de sinal', () => {
    expect(isNetworkFailure('qualquer coisa', false)).toBe(true)
  })
})
