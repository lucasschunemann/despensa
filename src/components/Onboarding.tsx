import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { haptic } from '../lib/haptics'
import { sound } from '../lib/sound'
import { Mark } from './Avatar'
import { Check } from './ui'

type Props = {
  open: boolean
  name: string
  replay?: boolean
  onDismiss: () => void
}

const STEPS = [
  { title: 'Escreva do jeito que fala', hint: '“2 leite” vai para o mercado. “Luz 180 dia 10” vira conta. “Abajur 320” vira desejo.' },
  { title: 'Marque a caixa quando pegar ou pagar', hint: 'Ou arraste a linha para a direita. Para a esquerda, apaga, sempre com Desfazer.' },
  { title: 'Tudo aparece para vocês dois na hora', hint: 'Sem sinal, as mudanças ficam guardadas e seguem quando a conexão voltar.' },
]

/** A apresentação é uma página de primeiros passos: dá para marcar cada um, como no app. */
export function Onboarding({ open, name, replay = false, onDismiss }: Props) {
  const reduced = useReducedMotion()
  const dialog = useRef<HTMLDivElement>(null)
  const [checked, setChecked] = useState<boolean[]>(STEPS.map(() => false))

  useEffect(() => {
    if (!open) return
    setChecked(STEPS.map(() => false))
    const previous = document.activeElement as HTMLElement | null
    const shell = document.querySelector<HTMLElement>('.shell')
    if (shell) shell.inert = true
    requestAnimationFrame(() => dialog.current?.focus())
    return () => { if (shell) shell.inert = false; previous?.focus?.() }
  }, [open])

  const toggle = (index: number) => {
    setChecked((prev) => prev.map((value, i) => (i === index ? !value : value)))
    if (!checked[index]) { sound.pick(); haptic('light') }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="welcome"
          ref={dialog}
          role="dialog"
          aria-modal="true"
          aria-label="Apresentação"
          tabIndex={-1}
          initial={{ opacity: 0, y: reduced ? 0 : 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: reduced ? 0 : 16 }}
          transition={{ duration: reduced ? 0 : 0.22 }}
          onKeyDown={(event) => { if (event.key === 'Escape') onDismiss() }}
        >
          <div className="welcome-top">
            <button className="text-button is-quiet" onClick={onDismiss}>{replay ? 'Fechar' : 'Pular'}</button>
          </div>
          <div className="welcome-body">
            <div className="page-head">
              <span className="page-icon is-mark" aria-hidden><Mark size={44} /></span>
              <h1>{replay ? 'Primeiros passos' : `Boas-vindas, ${name}`}</h1>
            </div>
            <p className="welcome-lead">A despensa guarda o mercado, as contas e os desejos da casa, numa página para cada um. Três coisas para começar:</p>
            <ul className="todos">
              {STEPS.map((step, index) => (
                <li key={step.title} className={`todo${checked[index] ? ' is-done' : ''}`}>
                  <Check checked={checked[index]} onClick={() => toggle(index)} label={step.title} />
                  <span className="todo-text">
                    <span className="todo-name">{step.title}</span>
                    <span className="todo-hint">{step.hint}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div className="welcome-foot">
            <button className="button is-primary" onClick={() => { haptic('light'); onDismiss() }}>Começar</button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
