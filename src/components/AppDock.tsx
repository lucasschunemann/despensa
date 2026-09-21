import { motion } from 'motion/react'
import type { ReactNode } from 'react'
import { haptic } from '../lib/haptics'
import { sound } from '../lib/sound'
import type { View } from './MenuSheet'

const DESTINATIONS: Array<{ id: View; label: string; icon: ReactNode }> = [
  { id: 'inicio', label: 'início', icon: <HomeIcon /> },
  { id: 'lista', label: 'mercado', icon: <BasketIcon /> },
  { id: 'contas', label: 'contas', icon: <BillIcon /> },
  { id: 'desejos', label: 'desejos', icon: <HeartIcon /> },
]

export function AppDock({ view, onChange }: { view: View; onChange: (view: View) => void }) {
  return (
    <nav className="app-dock" aria-label="Navegação principal">
      <span className="app-dock-highlight" aria-hidden />
      {DESTINATIONS.map((destination) => {
        const active = destination.id === view
        return (
          <motion.button
            key={destination.id}
            type="button"
            aria-current={active ? 'page' : undefined}
            aria-label={destination.label}
            whileTap={{ scale: .86 }}
            onClick={() => {
              haptic(active ? 'light' : 'medium')
              sound.tick()
              if (!active) onChange(destination.id)
            }}
          >
            {active && (
              <motion.span
                layoutId="app-dock-selection"
                className="app-dock-selection"
                transition={{ type: 'spring', stiffness: 460, damping: 34, mass: .72 }}
                aria-hidden
              />
            )}
            <motion.span
              className="app-dock-icon"
              animate={{ y: active ? -1 : 0, scale: active ? 1.04 : 1 }}
              transition={{ type: 'spring', stiffness: 520, damping: 30 }}
            >
              {destination.icon}
            </motion.span>
            <span className="app-dock-label">{destination.label}</span>
          </motion.button>
        )
      })}
    </nav>
  )
}

function HomeIcon() { return <svg viewBox="0 0 24 24" aria-hidden><path d="M4 10.8 12 4l8 6.8V20h-6v-6h-4v6H4Z" /></svg> }
function BasketIcon() { return <svg viewBox="0 0 24 24" aria-hidden><path d="M4 8h16l-1.4 11H5.4Z" /><path d="M8.5 8A3.5 3.5 0 0 1 12 4.5 3.5 3.5 0 0 1 15.5 8" /></svg> }
function BillIcon() { return <svg viewBox="0 0 24 24" aria-hidden><path d="M6 3h12v18l-3-2-3 2-3-2-3 2Z" /><path d="M9 8h6M9 12h6" /></svg> }
function HeartIcon() { return <svg viewBox="0 0 24 24" aria-hidden><path d="M12 20 4.8 13a4.6 4.6 0 0 1 6.5-6.5l.7.7.7-.7A4.6 4.6 0 0 1 19.2 13Z" /></svg> }
