import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, useState, type ReactNode } from 'react'
import { haptic } from '../lib/haptics'
import { prefs, useSoundOn } from '../lib/prefs'
import { disablePush, enablePush, pushConfigured, pushState, type PushState } from '../lib/push'
import { sound } from '../lib/sound'
import { Avatar } from './Avatar'

export type View = 'inicio' | 'lista' | 'contas' | 'desejos'

interface Props {
  open: boolean
  view: View
  me: string
  /** sem sala (modo demonstração) o aviso no celular não aparece */
  roomId?: string
  onClose: () => void
  onChangeView: (view: View) => void
  onSwitchPerson: () => void
}

const MODULES: Array<{ id: View; label: string; hint: string; icon: ReactNode }> = [
  {
    id: 'inicio',
    label: 'início',
    hint: 'tudo de uma vez',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden>
        <path d="M4 11.2 12 4.5l8 6.7V19a1.5 1.5 0 0 1-1.5 1.5H15v-5.5H9v5.5H5.5A1.5 1.5 0 0 1 4 19Z" />
      </svg>
    ),
  },
  {
    id: 'lista',
    label: 'mercado',
    hint: 'o que falta comprar',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden>
        <path d="M4 7h16l-1.5 11.2a2 2 0 0 1-2 1.8H7.5a2 2 0 0 1-2-1.8L4 7Z" />
        <path d="M9 7V5.6A3 3 0 0 1 12 3a3 3 0 0 1 3 2.6V7" />
      </svg>
    ),
  },
  {
    id: 'desejos',
    label: 'desejos',
    hint: 'o que a gente quer comprar',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden>
        <path d="M12 20.2 4.8 13a4.6 4.6 0 0 1 6.5-6.5l.7.7.7-.7A4.6 4.6 0 0 1 19.2 13Z" />
      </svg>
    ),
  },
  {
    id: 'contas',
    label: 'contas do mês',
    hint: 'o que falta pagar',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden>
        <rect x="2.8" y="6" width="18.4" height="12" rx="2.4" />
        <circle cx="12" cy="12" r="2.8" />
        <path d="M6.2 9.6v4.8M17.8 9.6v4.8" />
      </svg>
    ),
  },
]

const PUSH_LABEL: Record<PushState, string> = {
  ligado: 'ligado',
  desligado: 'desligado',
  bloqueado: 'bloqueado no aparelho',
  'instale-primeiro': 'instale na tela inicial',
  indisponível: 'não dá neste aparelho',
}

export function MenuSheet({ open, view, me, roomId, onClose, onChangeView, onSwitchPerson }: Props) {
  const soundOn = useSoundOn()
  const [push, setPush] = useState<PushState>('desligado')
  const [pushBusy, setPushBusy] = useState(false)

  useEffect(() => {
    if (open && roomId && pushConfigured()) void pushState().then(setPush)
  }, [open, roomId])
  const reduced = useReducedMotion()
  const spring = reduced ? { duration: 0 } : { type: 'spring' as const, stiffness: 380, damping: 34 }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="sheet-layer"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduced ? 0 : 0.2 }}
          onClick={onClose}
        >
          <motion.div
            className="sheet"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={spring}
            drag={reduced ? false : 'y'}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.4 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 90 || info.velocity.y > 600) onClose()
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <span className="sheet-grab" aria-hidden />

            <nav className="sheet-modules">
              {MODULES.map((module, i) => (
                <motion.button
                  key={module.id}
                  className={`module${view === module.id ? ' is-current' : ''}`}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...spring, delay: reduced ? 0 : 0.04 * i }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    haptic('light')
                    sound.unlock()
                    onChangeView(module.id)
                    onClose()
                  }}
                >
                  <span className="module-icon">{module.icon}</span>
                  <span className="module-text">
                    <strong>{module.label}</strong>
                    <small>{module.hint}</small>
                  </span>
                  {view === module.id && (
                    <motion.span layoutId="module-dot" className="module-dot" aria-hidden />
                  )}
                </motion.button>
              ))}
            </nav>

            <div className="sheet-options">
              <button
                className="sheet-option"
                onClick={() => {
                  haptic('light')
                  onSwitchPerson()
                  onClose()
                }}
              >
                <Avatar person={me} size={26} />
                <span>você é {me}</span>
                <small>trocar</small>
              </button>

              {roomId && pushConfigured() && (
                <button
                  className="sheet-option"
                  aria-pressed={push === 'ligado'}
                  disabled={pushBusy}
                  onClick={() => {
                    if (push === 'bloqueado' || push === 'indisponível' || push === 'instale-primeiro') return
                    haptic('light')
                    setPushBusy(true)
                    const action = push === 'ligado' ? disablePush() : enablePush(roomId, me)
                    void action
                      .then(setPush)
                      .catch(() => setPush('desligado'))
                      .finally(() => setPushBusy(false))
                  }}
                >
                  <span className="sheet-icon" aria-hidden>
                    <svg viewBox="0 0 24 24">
                      <path d="M18 9a6 6 0 1 0-12 0c0 5-2 6.5-2 6.5h16S18 14 18 9Z" />
                      <path d="M13.7 19.5a2 2 0 0 1-3.4 0" />
                    </svg>
                  </span>
                  <span>avisos no celular</span>
                  <small>{pushBusy ? '…' : PUSH_LABEL[push]}</small>
                </button>
              )}

              <button
                className="sheet-option"
                aria-pressed={soundOn}
                onClick={() => {
                  const next = !soundOn
                  prefs.setSoundOn(next)
                  haptic('light')
                  if (next) {
                    sound.unlock()
                    sound.pick()
                  }
                }}
              >
                <span className="sheet-icon" aria-hidden>
                  <svg viewBox="0 0 24 24">
                    <path d="M11 5 6.5 9H3v6h3.5L11 19V5Z" />
                    {soundOn ? (
                      <path d="M15.5 9.5a3.5 3.5 0 0 1 0 5M18.5 7a7 7 0 0 1 0 10" />
                    ) : (
                      <path d="M16 10l4 4M20 10l-4 4" />
                    )}
                  </svg>
                </span>
                <span>som</span>
                <small>{soundOn ? 'ligado' : 'desligado'}</small>
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
