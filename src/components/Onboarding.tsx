import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, useRef } from 'react'
import { haptic } from '../lib/haptics'
import { Glyph, Icon } from './ui'

type Props = {
  open: boolean
  name: string
  replay?: boolean
  onDismiss: () => void
}

const FEATURES = [
  { tint: 't-green', icon: <Glyph name="cart" size={34} />, title: 'Um campo para tudo', text: 'Escreva “2 leite”, “Luz 180 dia 10” ou “Abajur 320”. O app entende a quantidade, o valor e o vencimento.' },
  { tint: 't-blue', icon: <Icon name="check" size={34} weight={2.4} />, title: 'Deslize para concluir', text: 'Para a direita, você pega, paga ou realiza. Para a esquerda, apaga, sempre com Desfazer.' },
  { tint: 't-pink', icon: <Glyph name="heart" size={34} />, title: 'Sempre em dia, a dois', text: 'O que um adiciona aparece para o outro na hora. Sem sinal, tudo fica guardado e segue quando a conexão voltar.' },
]

/** Tela de boas-vindas no formato dos apps da Apple: título, três novidades e Continuar. */
export function Onboarding({ open, name, replay = false, onDismiss }: Props) {
  const reduced = useReducedMotion()
  const dialog = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const previous = document.activeElement as HTMLElement | null
    const shell = document.querySelector<HTMLElement>('.shell')
    if (shell) shell.inert = true
    requestAnimationFrame(() => dialog.current?.focus())
    return () => { if (shell) shell.inert = false; previous?.focus?.() }
  }, [open])

  const appear = (index: number) => ({
    initial: reduced ? false : { opacity: 0, y: 14 },
    animate: { opacity: 1, y: 0 },
    transition: { type: 'spring' as const, stiffness: 300, damping: 30, delay: 0.12 + index * 0.08 },
  })

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
          initial={{ opacity: 0, y: reduced ? 0 : 30 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: reduced ? 0 : 30 }}
          transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 320, damping: 36 }}
          onKeyDown={(event) => { if (event.key === 'Escape') onDismiss() }}
        >
          <div className="welcome-body">
            <motion.h1 {...appear(0)}>{replay ? <>Como funciona a <span>despensa</span></> : <>Boas-vindas à <span>despensa</span>{name ? `, ${name}` : ''}</>}</motion.h1>
            <div className="features">
              {FEATURES.map((feature, i) => (
                <motion.div key={feature.title} className={`feature ${feature.tint}`} {...appear(i + 1)}>
                  <span className="feature-icon">{feature.icon}</span>
                  <div>
                    <strong>{feature.title}</strong>
                    <p>{feature.text}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
          <motion.div className="welcome-foot" {...appear(4)}>
            <small>Mercado, contas e desejos da casa, no mesmo lugar para vocês dois.</small>
            <button className="button is-filled" onClick={() => { haptic('light'); onDismiss() }}>Continuar</button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
