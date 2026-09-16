// A "embalagem" de cada item na gôndola. É um dicionário local, feito à mão: a categoria
// aparece depois que o item já entrou, sem atrasar a digitação (e sem IA, que segue fora
// do escopo). Palavra que não está aqui vira a inicial num círculo.
const PRODUCTS: Array<[string, string[]]> = [
  ['🥛', ['leite', 'iogurte', 'coalhada', 'kefir']],
  ['🧀', ['queijo', 'requeijao', 'parmesao', 'mussarela', 'muçarela', 'ricota', 'cream cheese']],
  ['🧈', ['manteiga', 'margarina']],
  ['🥚', ['ovo', 'ovos']],
  ['🍞', ['pao', 'paes', 'bisnaguinha', 'torrada']],
  ['🥐', ['croissant']],
  ['☕', ['cafe', 'capsula', 'capsulas']],
  ['🍵', ['cha', 'mate']],
  ['🍚', ['arroz']],
  ['🫘', ['feijao', 'lentilha', 'grao de bico']],
  ['🍝', ['macarrao', 'massa', 'espaguete', 'lasanha', 'talharim']],
  ['🥫', ['molho', 'extrato', 'milho', 'ervilha', 'atum', 'sardinha', 'lata']],
  ['🫒', ['azeite', 'azeitona', 'oleo']],
  ['🧂', ['sal', 'tempero', 'pimenta do reino', 'oregano']],
  ['🍬', ['acucar', 'adocante', 'bala']],
  ['🌾', ['farinha', 'aveia', 'granola', 'fuba', 'trigo']],
  ['🥩', ['carne', 'bife', 'picanha', 'alcatra', 'patinho', 'costela', 'moida']],
  ['🍗', ['frango', 'peito', 'coxa', 'sobrecoxa', 'asa']],
  ['🐟', ['peixe', 'salmao', 'tilapia', 'bacalhau']],
  ['🥓', ['bacon', 'linguica', 'calabresa', 'salsicha', 'presunto', 'peito de peru', 'salame']],
  ['🍅', ['tomate', 'tomates']],
  ['🧅', ['cebola', 'cebolas']],
  ['🧄', ['alho']],
  ['🥔', ['batata', 'batatas', 'mandioca', 'aipim']],
  ['🥕', ['cenoura', 'cenouras', 'beterraba']],
  ['🥬', ['alface', 'rucula', 'couve', 'espinafre', 'agriao', 'repolho', 'salada']],
  ['🥦', ['brocolis', 'couve flor']],
  ['🥒', ['pepino', 'abobrinha']],
  ['🫑', ['pimentao']],
  ['🌽', ['espiga']],
  ['🍋', ['limao', 'limoes']],
  ['🍌', ['banana', 'bananas']],
  ['🍎', ['maca', 'macas']],
  ['🍊', ['laranja', 'laranjas', 'tangerina', 'mexerica']],
  ['🍇', ['uva', 'uvas']],
  ['🍓', ['morango', 'morangos']],
  ['🍍', ['abacaxi']],
  ['🥭', ['manga', 'mamao']],
  ['🍉', ['melancia', 'melao']],
  ['🥑', ['abacate']],
  ['🫐', ['mirtilo', 'blueberry']],
  ['🍫', ['chocolate', 'nutella', 'brigadeiro', 'cacau']],
  ['🍪', ['biscoito', 'bolacha', 'cookie']],
  ['🍿', ['pipoca']],
  ['🥜', ['amendoim', 'castanha', 'nozes', 'amendoas']],
  ['🍦', ['sorvete', 'picole']],
  ['🎂', ['bolo']],
  ['🍯', ['mel', 'geleia']],
  ['🍺', ['cerveja', 'chope', 'chopp', 'breja']],
  ['🍷', ['vinho', 'espumante', 'prosecco']],
  ['🥤', ['refrigerante', 'coca', 'guarana', 'suco', 'energetico']],
  ['💧', ['agua', 'gas']],
  ['🧻', ['papel higienico', 'papel toalha', 'guardanapo', 'lenco']],
  ['🧼', ['sabonete', 'sabao', 'detergente', 'lava roupa', 'amaciante', 'alvejante', 'multiuso']],
  ['🧽', ['esponja', 'pano', 'bom bril', 'palha de aco']],
  ['🧴', ['shampoo', 'condicionador', 'creme', 'hidratante', 'protetor', 'desodorante']],
  ['🪥', ['escova', 'pasta de dente', 'creme dental', 'fio dental']],
  ['🗑️', ['saco de lixo', 'lixo']],
  ['🐈', ['racao', 'areia', 'sache', 'petisco']],
  ['💊', ['remedio', 'vitamina', 'dipirona']],
  ['🕯️', ['vela', 'fosforo', 'isqueiro']],
  ['🔋', ['pilha', 'pilhas', 'bateria']],
  ['💡', ['lampada']],
]

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

// procura primeiro as expressões de mais de uma palavra ("papel toalha" antes de "papel")
const INDEX = PRODUCTS.flatMap(([emoji, words]) => words.map((word) => ({ emoji, word: normalize(word) })))
  .sort((a, b) => b.word.length - a.word.length)
  .map(({ emoji, word }) => ({ emoji, pattern: new RegExp(`(^|\\s)${word}(\\s|$)`) }))

export function productEmoji(name: string): string | null {
  const text = normalize(name)
  return INDEX.find(({ pattern }) => pattern.test(text))?.emoji ?? null
}
