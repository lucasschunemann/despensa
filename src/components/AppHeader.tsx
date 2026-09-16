import { AnimatePresence, motion } from 'motion/react'
import type { ReactNode } from 'react'
import type { Presence } from '../hooks/usePresence'
import { Avatar } from './Avatar'

interface Props {
  title: string
  presence: Presence
  onOpenMenu: () => void
  /** volta para o início; ausente na própria tela inicial */
  onHome?: () => void
  /** algo do módulo ao lado do menu (o carrinho, na lista) */
  accessory?: ReactNode
}

export function AppHeader({ title, presence, onOpenMenu, onHome, accessory }: Props) {
  return (
    <header className="header">
      {onHome ? (
        <button className="wordmark-button" onClick={onHome} aria-label="Voltar para o início">
          <svg viewBox="0 0 24 24" aria-hidden>
            <path d="M14.5 5.5 8 12l6.5 6.5" />
          </svg>
          <h1 className="wordmark">{title}</h1>
        </button>
      ) : (
        <h1 className="wordmark">{title}</h1>
      )}
      <div className="header-actions">
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

        <button className="icon-button" onClick={onOpenMenu} aria-label="Abrir menu">
          <svg viewBox="0 0 24 24" aria-hidden>
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>
      </div>
    </header>
  )
}
