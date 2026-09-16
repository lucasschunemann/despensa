import { describe, expect, it } from 'vitest'
import { parseEntry } from './parse'

describe('parseEntry', () => {
  it.each([
    ['leite', 'Leite', null],
    ['  leite   integral ', 'Leite integral', null],
    ['2 leite', 'Leite', '2'],
    ['500g queijo', 'Queijo', '500 g'],
    ['1,5 kg carne moída', 'Carne moída', '1,5 kg'],
    ['2x pão', 'Pão', '2'],
    ['pão x6', 'Pão', '6'],
    ['ovos 12', 'Ovos', '12'],
    ['coca 2l', 'Coca', '2 l'],
    ['vitamina B12', 'Vitamina B12', null],
    ['café 3 corações', 'Café 3 corações', null],
    ['Papel toalha', 'Papel toalha', null],
    ['2 UND ovos', 'Ovos', '2 und'],
    ['5 L água', 'Água', '5 l'],
    ['3 cx leite', 'Leite', '3 cx'],
    ['sabão 1 pct', 'Sabão', '1 pct'],
  ])('%s', (input, name, quantity) => {
    expect(parseEntry(input)).toEqual({ name, quantity })
  })

  it('ignora entrada vazia', () => {
    expect(parseEntry('   ')).toBeNull()
  })

  it('número sozinho vira nome', () => {
    expect(parseEntry('7')).toEqual({ name: '7', quantity: null })
  })

  it('não mexe no resto do texto', () => {
    expect(parseEntry('2 leite DESNATADO')).toEqual({ name: 'Leite DESNATADO', quantity: '2' })
  })
})
