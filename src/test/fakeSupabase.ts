// Supabase de mentira para testes: guarda as tabelas na memória e deixa o teste
// "cortar o sinal" a qualquer momento, como no mercado.
type Row = Record<string, unknown> & { id?: string }

export function createFakeSupabase() {
  const tables: Record<string, Row[]> = {}
  const calls: string[] = []
  let online = true
  let rejectNext: string | null = null

  const offline = () => ({ data: null, error: { message: 'TypeError: Failed to fetch' } })
  const table = (name: string) => (tables[name] ??= [])

  function query(name: string) {
    const filters: Array<[string, unknown]> = []
    const builder = {
      select: () => builder,
      eq: (column: string, value: unknown) => {
        filters.push([column, value])
        return builder
      },
      order: () => builder,
      maybeSingle: () => builder,
      then(resolve: (r: unknown) => void) {
        if (!online) return resolve(offline())
        const rows = table(name).filter((r) => filters.every(([c, v]) => r[c] === v))
        resolve({ data: rows.map((r) => ({ ...r })), error: null })
      },
    }
    return builder
  }

  function write(_name: string, run: () => void, label: string) {
    return {
      then(resolve: (r: unknown) => void) {
        if (!online) return resolve(offline())
        if (rejectNext) {
          const message = rejectNext
          rejectNext = null
          return resolve({ data: null, error: { message } })
        }
        calls.push(label)
        run()
        resolve({ data: null, error: null })
      },
    }
  }

  const client = {
    from(name: string) {
      return {
        ...query(name),
        upsert: (values: Row) =>
          write(
            name,
            () => {
              const rows = table(name)
              const idx = rows.findIndex((r) => r.id === values.id)
              if (idx === -1) rows.push({ ...values })
              else rows[idx] = { ...rows[idx], ...values }
            },
            `upsert ${name}`,
          ),
        update: (values: Row) => ({
          eq: (_: string, id: unknown) =>
            write(
              name,
              () => {
                tables[name] = table(name).map((r) => (r.id === id ? { ...r, ...values } : r))
              },
              `update ${name}`,
            ),
        }),
        delete: () => ({
          eq: (_: string, id: unknown) =>
            write(
              name,
              () => {
                tables[name] = table(name).filter((r) => r.id !== id)
              },
              `delete ${name}`,
            ),
        }),
      }
    },
    rpc(name: string, args: Record<string, unknown>) {
      return write(
        name,
        () => {
          if (name === 'finish_shopping') {
            tables.items = table('items').filter((r) => !(r.room_id === args.p_room && r.status === 'pegado'))
          }
          if (name === 'update_recurring') {
            const base = table('expenses').find((r) => r.id === args.p_expense)
            tables.expenses = table('expenses').map((r) =>
              base && r.recurrence_id === base.recurrence_id && (r.id === base.id || r.status === 'pendente')
                ? { ...r, title: args.p_title, amount_cents: args.p_amount, due_day: args.p_due_day }
                : r,
            )
          }
          if (name === 'move_expenses_folder') {
            const ids = args.p_expenses as string[]
            const recurrenceIds = new Set<unknown>()
            tables.expenses = table('expenses').map((r) => {
              if (!ids.includes(String(r.id))) return r
              if (r.recurrence_id) recurrenceIds.add(r.recurrence_id)
              return { ...r, folder_id: args.p_folder }
            })
            tables.recurrences = table('recurrences').map((r) => recurrenceIds.has(r.id) ? { ...r, folder_id: args.p_folder } : r)
          }
          if (name === 'set_want') {
            tables.wishes = table('wishes').map((r) => {
              if (r.id !== args.p_wish) return r
              const wanted = (r.wanted_by as string[]).filter((p) => p !== args.p_person)
              return { ...r, wanted_by: args.p_want ? [...wanted, args.p_person] : wanted }
            })
          }
        },
        `rpc ${name}`,
      )
    },
    channel() {
      const channel = {
        on: () => channel,
        subscribe: (cb: (status: string) => void) => {
          queueMicrotask(() => cb(online ? 'SUBSCRIBED' : 'CHANNEL_ERROR'))
          return channel
        },
      }
      return channel
    },
    removeChannel: async () => {},
    functions: { invoke: async () => ({ data: null, error: null }) },
  }

  return {
    client,
    tables,
    calls,
    setOnline(value: boolean) {
      online = value
    },
    rejectNextWrite(message: string) {
      rejectNext = message
    },
  }
}
