import { describe, expect, it } from 'vitest'
import { shoppingDuration } from './Credits'

const now = Date.parse('2026-09-22T18:00:00Z')
const ago = (min: number) => ({ picked_at: new Date(now - min * 60_000).toISOString() })

describe('quanto a compra levou', () => {
  it('conta do primeiro item pego até agora', () => {
    expect(shoppingDuration([ago(5), ago(23), ago(1)], now)).toBe('23 min')
    expect(shoppingDuration([ago(75)], now)).toBe('1h15')
  })

  it('não diz nada quando não faz sentido', () => {
    expect(shoppingDuration([{ picked_at: null }], now)).toBeNull()
    expect(shoppingDuration([ago(1)], now)).toBeNull()
    expect(shoppingDuration([ago(60 * 24)], now)).toBeNull()
  })
})
