const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const PLAIN = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export function formatBRL(cents: number): string {
  return BRL.format(cents / 100)
}

/** Sem o "R$": usado nas linhas da lista, onde o símbolo repetido vira ruído. */
export function formatAmount(cents: number): string {
  return PLAIN.format(cents / 100)
}

// "1.234,56" → 123456 centavos. Aceita as duas convenções que a gente digita na pressa.
export function toCents(token: string): number {
  const clean = token.replace(/\s/g, '')
  const brazilian = /^\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(clean)
  const normalized = brazilian ? clean.replace(/\./g, '').replace(',', '.') : clean.replace(',', '.')
  return Math.round(Number(normalized) * 100)
}

const MONEY = /(?:r\$\s*)?(\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+(?:[.,]\d{1,2})?)/gi
const DUE_DAY = /\bdia\s*(\d{1,2})\b/i

export interface ExpenseEntry {
  title: string
  amountCents: number
  dueDay: number | null
}

// "luz 180", "aluguel 1.850 dia 10", "internet r$ 129,90"
export function parseExpenseEntry(raw: string): ExpenseEntry | null {
  let text = raw.trim().replace(/\s+/g, ' ')
  if (!text) return null

  let dueDay: number | null = null
  const due = text.match(DUE_DAY)
  if (due) {
    const day = Number(due[1])
    if (day >= 1 && day <= 31) {
      dueDay = day
      text = text.replace(DUE_DAY, ' ').replace(/\s+/g, ' ').trim()
    }
  }

  // o valor é o último número do texto; o resto vira o nome da conta
  const matches = [...text.matchAll(MONEY)]
  const last = matches.at(-1)
  let amountCents = 0
  if (last) {
    amountCents = toCents(last[1])
    text = (text.slice(0, last.index) + text.slice(last.index + last[0].length)).replace(/\s+/g, ' ').trim()
  }

  const title = text.replace(/^[-–:]+|[-–:]+$/g, '').trim()
  if (!title) return null

  return { title: title.charAt(0).toUpperCase() + title.slice(1), amountCents, dueDay }
}
