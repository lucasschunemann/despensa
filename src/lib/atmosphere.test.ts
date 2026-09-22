import { describe, expect, it } from 'vitest'
import { editionNumber, moonName, moonPath, moonPhase } from './atmosphere'

describe('lua', () => {
  it('acerta luas conhecidas', () => {
    // lua cheia de 7 de setembro de 2025 e lua nova de 21 de setembro de 2025
    expect(moonName(moonPhase(new Date(Date.UTC(2025, 8, 7, 18))))).toBe('lua cheia')
    expect(moonName(moonPhase(new Date(Date.UTC(2025, 8, 21, 19))))).toBe('lua nova')
  })

  it('fase fica sempre entre 0 e 1, inclusive antes de 2000', () => {
    for (const date of [new Date(1990, 0, 1), new Date(2026, 8, 22), new Date(2040, 5, 5)]) {
      const phase = moonPhase(date)
      expect(phase).toBeGreaterThanOrEqual(0)
      expect(phase).toBeLessThan(1)
    }
  })

  it('crescente acende a direita e minguante a esquerda', () => {
    expect(moonPath(0.2)).toContain('0 0 1 10 20')
    expect(moonPath(0.8)).toContain('0 0 0 10 20')
  })
})

describe('edição do dia', () => {
  it('é o dia do ano', () => {
    expect(editionNumber(new Date(2026, 0, 1, 9))).toBe(1)
    expect(editionNumber(new Date(2026, 8, 22, 9))).toBe(265)
  })
})
