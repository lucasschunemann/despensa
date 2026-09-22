import { motion } from 'motion/react'
import { editionNumber } from '../lib/atmosphere'
import { Mark } from './Avatar'

const WORD = 'despensa'
const DATE = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })

/**
 * O letreiro de abertura. Não acrescenta espera: ocupa o tempo que o app já gastava
 * abrindo a sessão e buscando a casa, que antes era um texto piscando.
 * As letras sobem uma a uma, a régua risca por baixo e a legenda diz o que está acontecendo.
 */
export function Overture({ label }: { label: string }) {
  const today = new Date()
  return (
    <div className="overture" role="status" aria-label={label}>
      <div className="overture-inner">
        <h1 className="overture-word" aria-hidden>
          {WORD.split('').map((letter, index) => (
            <motion.span
              key={index}
              initial={{ opacity: 0, y: '0.42em', filter: 'blur(6px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ type: 'spring', stiffness: 260, damping: 24, delay: 0.08 + index * 0.045 }}
            >
              {letter}
            </motion.span>
          ))}
        </h1>
        <motion.span
          className="overture-rule"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.9, delay: 0.42, ease: [0.65, 0, 0.35, 1] }}
        />
        <motion.p className="overture-caption" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9, duration: 0.5 }}>
          <motion.span animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut', delay: 1.4 }}>{label}</motion.span>
          <span>nº {String(editionNumber(today)).padStart(3, '0')} · {DATE.format(today).replaceAll('/', '.')}</span>
        </motion.p>
      </div>
      <motion.span className="overture-mark" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.1, duration: 0.6 }}>
        <Mark size={30} />
      </motion.span>
    </div>
  )
}
