// Quantidade sai do próprio texto digitado, para a entrada continuar sendo um campo só:
// "2 leite", "500g queijo", "1,5kg carne", "pão x6", "ovos 12".
// Unidades reconhecidas (maiúsculas ou minúsculas, coladas ou separadas do número).
// Está documentado no README: se acrescentar aqui, acrescente lá também.
const UNITS = [
  'x', 'un', 'und', 'unid', 'u',
  'kg', 'g', 'mg',
  'l', 'lt', 'ml',
  'cx', 'pct', 'pc', 'dz', 'sc', 'fd',
]
// maiores primeiro, para "und" não ser lido como "un"
const ALT = [...UNITS].sort((a, b) => b.length - a.length).join('|')
const QTY = String.raw`\d+(?:[.,]\d+)?\s*(?:${ALT})?`
const LEADING = new RegExp(String.raw`^(?:x\s*)?(${QTY})\s+(.+)$`, 'i')
const TRAILING = new RegExp(String.raw`^(.+?)\s+(?:x\s*)?(${QTY})$`, 'i')

export function parseEntry(raw: string): { name: string; quantity: string | null } | null {
  const text = raw.trim().replace(/\s+/g, ' ')
  if (!text) return null

  const lead = text.match(LEADING)
  if (lead) return { name: capitalize(lead[2]), quantity: normalize(lead[1]) }

  const trail = text.match(TRAILING)
  if (trail) return { name: capitalize(trail[1]), quantity: normalize(trail[2]) }

  return { name: capitalize(text), quantity: null }
}

// No computador ninguém digita maiúscula na pressa; no celular o teclado já faz isso.
function capitalize(name: string): string {
  return name.charAt(0).toUpperCase() + name.slice(1)
}

function normalize(q: string): string {
  const compact = q.replace(/\s+/g, '').toLowerCase()
  // "2x" é multiplicador e vira só "2"; o x de "cx" tem que ficar
  if (/^\d+(?:[.,]\d+)?x$/.test(compact)) return compact.slice(0, -1)

  // número e unidade separados por um espaço: "500 g", "1,5 kg", "2 und"
  const parts = compact.match(/^(\d+(?:[.,]\d+)?)(.*)$/)
  return parts && parts[2] ? `${parts[1]} ${parts[2]}` : compact
}
