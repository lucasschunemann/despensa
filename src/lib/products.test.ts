import { describe, expect, it } from 'vitest'
import { productEmoji } from './products'

describe('productEmoji', () => {
  it.each([
    ['Leite integral', '🥛'],
    ['Pão de forma', '🍞'],
    ['Queijo minas', '🧀'],
    ['Café em grão', '☕'],
    ['Papel toalha', '🧻'],
    ['Feijão preto', '🫘'],
    ['Açúcar', '🍬'],
    ['Detergente de coco', '🧼'],
    ['Ração do gato', '🐈'],
    ['Tomate italiano', '🍅'],
  ])('%s → %s', (name, emoji) => {
    expect(productEmoji(name)).toBe(emoji)
  })

  it('não confunde pedaço de palavra', () => {
    // "sal" não pode acender em "salmão", nem "mel" em "melancia"
    expect(productEmoji('Salmão')).toBe('🐟')
    expect(productEmoji('Melancia')).toBe('🍉')
  })

  it('palavra desconhecida volta vazia', () => {
    expect(productEmoji('Coisa estranha')).toBeNull()
  })
})
