import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import type { ReactNode } from 'react'
import type { Presence } from '../hooks/usePresence'
import { haptic } from '../lib/haptics'
import { sound } from '../lib/sound'
import { Avatar } from './Avatar'
import { SyncBadge } from './SyncBadge'

interface Props {
  title: string
  presence: Presence
  onOpenMenu: () => void
  /** volta para o início; ausente na própria tela inicial */
  onHome?: () => void
  /** algo do módulo ao lado do menu (o carrinho, na lista) */
  accessory?: ReactNode
  /** a lista rolou: o cabeçalho ganha régua e o título encolhe um pouco */
  scrolled?: boolean
}

export function AppHeader({ title, presence, onOpenMenu, onHome, accessory, scrolled = false }: Props) {
  const reduced = useReducedMotion()
  const titleEl = (
    <motion.h1
      className="wordmark"
      animate={{ scale: scrolled && !reduced ? 0.86 : 1 }}
      transition={{ type: 'spring', stiffness: 420, damping: 34 }}
    >
      {title}
    </motion.h1>
  )
  return (
    <header className={`header${scrolled ? ' is-scrolled' : ''}`}>
      {onHome ? (
        <button className="wordmark-button" onClick={onHome} aria-label="Voltar para o início">
          <svg viewBox="0 0 24 24" aria-hidden>
            <path d="M14.5 5.5 8 12l6.5 6.5" />
          </svg>
          {titleEl}
        </button>
      ) : (
        titleEl
      )}
      <div className="header-actions">
        <SyncBadge />
        {accessory}
        <AnimatePresence>
          {presence.online.map((person) => (
            <motion.span
              key={person}
              className="presence"
              title={`${person} está com o app aberto`}
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.6 }}
              transition={{ type: 'spring', stiffness: 420, damping: 28 }}
            >
              <Avatar person={person} size={24} />
            </motion.span>
          ))}
        </AnimatePresence>

        <button
          className="icon-button"
          onClick={() => {
            sound.tick()
            haptic('light')
            onOpenMenu()
          }}
          aria-label="Abrir menu"
        >
          <svg viewBox="0 0 24 24" aria-hidden>
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>
      </div>
    </header>
  )
}
