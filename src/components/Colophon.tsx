import { editionNumber, moonName, moonPath, moonPhase } from '../lib/atmosphere'

const DATE = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })

/**
 * O fim da página do início, como o colofão de um livro: cada dia é uma edição da casa,
 * com o número do dia do ano, a data e a lua daquela noite. Quieto de propósito.
 */
export function Colophon({ date = new Date() }: { date?: Date }) {
  const phase = moonPhase(date)
  return (
    <footer className="colophon">
      <span className="colophon-rule" aria-hidden />
      <p className="colophon-line">
        <span>despensa</span>
        <span aria-hidden>·</span>
        <span>nº {String(editionNumber(date)).padStart(3, '0')}</span>
        <span aria-hidden>·</span>
        <span>{DATE.format(date).replaceAll('/', '.')}</span>
      </p>
      <p className="colophon-line">
        <Moon phase={phase} />
        <span>{moonName(phase)}</span>
      </p>
    </footer>
  )
}

export function Moon({ phase }: { phase: number }) {
  return (
    <svg className="moon" viewBox="-1 -1 22 22" aria-hidden>
      <circle cx="10" cy="10" r="10" />
      <path d={moonPath(phase, 10)} />
    </svg>
  )
}
