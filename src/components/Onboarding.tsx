import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { haptic } from '../lib/haptics'
import { Mark } from './Avatar'
import { Icon, type IconName } from './ui'

type Props = {
  open: boolean
  name: string
  replay?: boolean
  onDismiss: () => void
}

const STEPS: Array<{ icon: IconName | null; title: string; text: string }> = [
  { icon: null, title: 'bem-vindo à despensa', text: 'Mercado, contas e desejos da casa, no mesmo lugar para vocês dois.' },
  { icon: 'plus', title: 'um campo para tudo', text: 'Escreva “2 leite” no mercado, “luz 180 dia 10” nas contas ou “abajur 320” nos desejos. O app entende quantidade, valor e vencimento.' },
  { icon: 'check', title: 'deslize para agir', text: 'Para a direita, você pega, paga ou realiza. Para a esquerda, apaga, e sempre dá para desfazer.' },
  { icon: 'repeat', title: 'sempre em dia', text: 'O que um adiciona aparece para o outro na hora. Sem sinal, as alterações ficam guardadas e seguem quando a conexão voltar.' },
]

/** Apresentação curta, de quatro telas. Pode ser pulada e revista nas configurações. */
export function Onboarding({ open, name, replay = false, onDismiss }: Props) {
  const reduced = useReducedMotion()
  const dialog = useRef<HTMLDivElement>(null)
  const [step, setStep] = useState(0)
  const [direction, setDirection] = useState(1)
  const last = step === STEPS.length - 1
  const current = STEPS[step]

  useEffect(() => {
    if (!open) return
    setStep(0)
    const previous = document.activeElement as HTMLElement | null
    const shell = document.querySelector<HTMLElement>('.shell')
    if (shell) shell.inert = true
    requestAnimationFrame(() => dialog.current?.focus())
    return () => { if (shell) shell.inert = false; previous?.focus?.() }
  }, [open])

  const go = (delta: number) => {
    const next = Math.min(STEPS.length - 1, Math.max(0, step + delta))
    if (next === step) return
    haptic('light')
    setDirection(delta)
    setStep(next)
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="onboarding"
          ref={dialog}
          role="dialog"
          aria-modal="true"
          aria-label="Apresentação"
          tabIndex={-1}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduced ? 0 : 0.2 }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') onDismiss()
            if (event.key === 'ArrowRight') go(1)
            if (event.key === 'ArrowLeft') go(-1)
          }}
        >
          <div className="onboarding-top">
            <button className="link-button" onClick={onDismiss}>{replay ? 'fechar' : 'pular'}</button>
          </div>
          <div className="onboarding-stage">
            <AnimatePresence mode="wait" custom={direction} initial={false}>
              <motion.div
                key={step}
                className="onboarding-step"
                custom={direction}
                variants={{
                  enter: (d: number) => ({ opacity: 0, x: reduced ? 0 : d * 28 }),
                  center: { opacity: 1, x: 0 },
                  exit: (d: number) => ({ opacity: 0, x: reduced ? 0 : d * -28 }),
                }}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: reduced ? 0 : 0.2 }}
              >
                <span className="onboarding-tile" aria-hidden>{current.icon ? <Icon name={current.icon} size={34} /> : <Mark size={38} />}</span>
                <h2>{step === 0 && !replay ? `${current.title}, ${name}` : current.title}</h2>
                <p>{current.text}</p>
              </motion.div>
            </AnimatePresence>
          </div>
          <div className="onboarding-bottom">
            <div className="dots" aria-label={`Passo ${step + 1} de ${STEPS.length}`} role="img">
              {STEPS.map((_, i) => <i key={i} className={i === step ? 'is-on' : ''} />)}
            </div>
            <button className="btn btn-primary" onClick={() => (last ? onDismiss() : go(1))}>{last ? 'começar' : 'continuar'}</button>
            <button className="btn btn-plain" onClick={() => go(-1)} disabled={step === 0} style={{ visibility: step === 0 ? 'hidden' : 'visible' }}>voltar</button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
