// Palavras que fazem alguma bobagem acontecer na tela. É brincadeira interna: ninguém
// precisa descobrir, mas quem escreve "cerveja" ganha uma chuva de cerveja.
interface Egg {
  id: string
  emoji: string
}

const EGGS: Array<{ match: RegExp; egg: Egg }> = [
  { match: /\btomates?\b/i, egg: { id: 'tomate', emoji: '🍅' } },
  { match: /\b(cerveja|chopp?e|breja|heineken)\b/i, egg: { id: 'cerveja', emoji: '🍺' } },
  { match: /\bovos?\b/i, egg: { id: 'ovo', emoji: '🥚' } },
  { match: /\b(chocolate|brigadeiro|nutella)\b/i, egg: { id: 'chocolate', emoji: '🍫' } },
  { match: /\bpizza\b/i, egg: { id: 'pizza', emoji: '🍕' } },
  { match: /\b(bolo|anivers[áa]rio)\b/i, egg: { id: 'bolo', emoji: '🎂' } },
  { match: /\bsorvetes?\b/i, egg: { id: 'sorvete', emoji: '🍦' } },
  { match: /\bcaf[ée]\b/i, egg: { id: 'cafe', emoji: '☕' } },
  { match: /\b(vinho|espumante|prosecco)\b/i, egg: { id: 'vinho', emoji: '🍷' } },
  { match: /\b(flor|flores|buqu[êe])\b/i, egg: { id: 'flor', emoji: '💐' } },
  { match: /\b(viagem|passagem|hotel)\b/i, egg: { id: 'viagem', emoji: '✈️' } },
  { match: /\b(gato|ra[çc][ãa]o|areia)\b/i, egg: { id: 'gato', emoji: '🐈' } },
]

export function eggFor(text: string): Egg | null {
  return EGGS.find(({ match }) => match.test(text))?.egg ?? null
}
