import { describe, expect, it } from 'vitest'
import { formatBRL, parseExpenseEntry, toCents } from './money'

describe('toCents', () => {
  it.each([
    ['180', 18000],
    ['89,90', 8990],
    ['1.850', 185000],
    ['1.850,50', 185050],
    ['12.50', 1250],
    ['0,99', 99],
  ])('%s', (input, cents) => {
    expect(toCents(input)).toBe(cents)
  })
})

describe('parseExpenseEntry', () => {
  it.each([
    ['luz 180', 'Luz', 18000, null],
    ['aluguel 1.850 dia 10', 'Aluguel', 185000, 10],
    ['internet r$ 129,90', 'Internet', 12990, null],
    ['dia 5 condomínio 640', 'Condomínio', 64000, 5],
    ['mercado', 'Mercado', 0, null],
    ['gás 89,90 dia 28', 'Gás', 8990, 28],
    ['conta de água 76', 'Conta de água', 7600, null],
  ])('%s', (input, title, amountCents, dueDay) => {
    expect(parseExpenseEntry(input)).toEqual({ title, amountCents, dueDay })
  })

  it('ignora dia inválido', () => {
    expect(parseExpenseEntry('seguro 120 dia 45')).toEqual({
      title: 'Seguro 120 dia',
      amountCents: 4500,
      dueDay: null,
    })
  })

  it('exige um nome', () => {
    expect(parseExpenseEntry('250')).toBeNull()
    expect(parseExpenseEntry('   ')).toBeNull()
  })
})

describe('formatBRL', () => {
  it('formata em reais', () => {
    expect(formatBRL(185050).replace(/ /g, ' ')).toBe('R$ 1.850,50')
    expect(formatBRL(0).replace(/ /g, ' ')).toBe('R$ 0,00')
  })
})
