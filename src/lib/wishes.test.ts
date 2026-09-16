import { describe, expect, it } from 'vitest'
import { forecast, sortWishes, totalDream, whenLabel } from './wishes'
import type { Wish } from './types'

function wish(partial: Partial<Wish> & { id: string }): Wish {
  return {
    room_id: 'r',
    title: 'Coisa',
    price_cents: 10000,
    link: null,
    image_url: null,
    want_level: 2,
    wanted_by: [],
    status: 'querendo',
    bought_at: null,
    bought_by: null,
    created_by: 'Lucas',
    created_at: '2026-09-01T00:00:00Z',
    ...partial,
  }
}

describe('sortWishes', () => {
  it('o que os dois querem vem primeiro', () => {
    const order = sortWishes([
      wish({ id: 'sozinho', wanted_by: ['Lucas'], want_level: 3 }),
      wish({ id: 'dos-dois', wanted_by: ['Lucas', 'Bela'], want_level: 1 }),
    ]).map((w) => w.id)
    expect(order).toEqual(['dos-dois', 'sozinho'])
  })

  it('depois vale o nível de vontade, e o empate é o mais antigo', () => {
    const order = sortWishes([
      wish({ id: 'novo-quero', want_level: 2, created_at: '2026-09-10T00:00:00Z' }),
      wish({ id: 'quero-muito', want_level: 3 }),
      wish({ id: 'velho-quero', want_level: 2, created_at: '2026-09-02T00:00:00Z' }),
    ]).map((w) => w.id)
    expect(order).toEqual(['quero-muito', 'velho-quero', 'novo-quero'])
  })
})

describe('forecast', () => {
  const fila = [
    wish({ id: 'a', price_cents: 30000 }),
    wish({ id: 'b', price_cents: 20000 }),
    wish({ id: 'c', price_cents: 100000 }),
  ]

  it('soma a fila e diz em quantos meses cada um sai', () => {
    const plan = forecast(fila, 50000)
    expect(plan.get('a')).toEqual({ cumulativeCents: 30000, monthsAway: 1 })
    expect(plan.get('b')).toEqual({ cumulativeCents: 50000, monthsAway: 1 })
    expect(plan.get('c')).toEqual({ cumulativeCents: 150000, monthsAway: 3 })
  })

  it('sem meta guardada, não promete prazo', () => {
    expect(forecast(fila, 0).get('a')?.monthsAway).toBeNull()
  })
})

describe('whenLabel', () => {
  const setembro = new Date(2026, 8, 16)

  it('conta os meses a partir de hoje', () => {
    expect(whenLabel(1, setembro)).toBe('outubro')
    expect(whenLabel(3, setembro)).toBe('dezembro')
  })

  it('mostra o ano quando vira', () => {
    expect(whenLabel(5, setembro)).toBe('fevereiro de 2027')
  })

  it('sem prazo e quando já dá', () => {
    expect(whenLabel(null)).toBeNull()
    expect(whenLabel(0, setembro)).toBe('já dá')
  })
})

describe('totalDream', () => {
  it('soma o que a lista custa', () => {
    expect(totalDream([wish({ id: 'a', price_cents: 32000 }), wish({ id: 'b', price_cents: 8000 })])).toBe(
      40000,
    )
  })
})
