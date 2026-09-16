// Quantidade sai do próprio texto digitado, para a entrada continuar sendo um campo só:
// "2 leite", "500g queijo", "1,5kg carne", "pão x6", "ovos 12".
const QTY = String.raw`\d+(?:[.,]\d+)?\s*(?:x|un|und|kg|g|l|ml|cx|pct|dz)?`
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
  return q.replace(/\s+/g, '').replace(/x$/i, '').toLowerCase()
}
