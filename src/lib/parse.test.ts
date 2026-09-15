import { describe, expect, it } from 'vitest'
import { parseEntry } from './parse'

describe('parseEntry', () => {
  it.each([
    ['leite', 'leite', null],
    ['  leite   integral ', 'leite integral', null],
    ['2 leite', 'leite', '2'],
    ['500g queijo', 'queijo', '500g'],
    ['1,5 kg carne moída', 'carne moída', '1,5kg'],
    ['2x pão', 'pão', '2'],
    ['pão x6', 'pão', '6'],
    ['ovos 12', 'ovos', '12'],
    ['coca 2l', 'coca', '2l'],
    ['vitamina B12', 'vitamina B12', null],
    ['café 3 corações', 'café 3 corações', null],
  ])('%s', (input, name, quantity) => {
    expect(parseEntry(input)).toEqual({ name, quantity })
  })

  it('ignora entrada vazia', () => {
    expect(parseEntry('   ')).toBeNull()
  })

  it('número sozinho vira nome', () => {
    expect(parseEntry('7')).toEqual({ name: '7', quantity: null })
  })
})
