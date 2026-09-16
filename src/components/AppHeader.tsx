import { AnimatePresence, motion } from 'motion/react'
import type { Presence } from '../hooks/usePresence'
import { Avatar } from './Avatar'

interface Props {
  title: string
  presence: Presence
  onOpenMenu: () => void
}

export function AppHeader({ title, presence, onOpenMenu }: Props) {
  return (
    <header className="header">
      <h1 className="wordmark">{title}</h1>
      <div className="header-actions">
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
