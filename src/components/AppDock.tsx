import { motion, useReducedMotion } from 'motion/react'
import { useEffect, useState, type ReactNode } from 'react'
import { haptic } from '../lib/haptics'
import { sound } from '../lib/sound'
import type { View } from './MenuSheet'

const DESTINATIONS: Array<{ id: View; label: string; icon: ReactNode }> = [
  { id: 'inicio', label: 'início', icon: <HomeIcon /> },
  { id: 'lista', label: 'mercado', icon: <BasketIcon /> },
  { id: 'contas', label: 'contas', icon: <BillIcon /> },
  { id: 'desejos', label: 'desejos', icon: <HeartIcon /> },
]

// Padrão da barra do iOS 26: descer a tela recolhe a barra para só os ícones,
// subir devolve ela inteira. Escuta na fase de captura porque quem rola é o
// contêiner de cada módulo, não a janela.
function useCompactOnScroll(view: View) {
  const [compact, setCompact] = useState(false)

  useEffect(() => { setCompact(false) }, [view])

  useEffect(() => {
    let last = 0
    let waiting = false
    const onScroll = (event: Event) => {
      const target = event.target as HTMLElement | null
      if (!target || typeof target.scrollTop !== 'number') return
      const y = target.scrollTop
      if (waiting) return
      waiting = true
      requestAnimationFrame(() => {
        waiting = false
        const delta = y - last
        // Perto do topo a barra é sempre inteira; depois disso, o sentido manda.
        if (y < 26) setCompact(false)
        else if (delta > 5) setCompact(true)
        else if (delta < -7) setCompact(false)
        last = y
      })
    }
    document.addEventListener('scroll', onScroll, true)
    return () => document.removeEventListener('scroll', onScroll, true)
  }, [])

  return compact
}

export function AppDock({ view, onChange }: { view: View; onChange: (view: View) => void }) {
  const reduced = useReducedMotion()
  const compact = useCompactOnScroll(view)

  return (
    <nav className="app-dock" data-compact={compact ? 'true' : 'false'} aria-label="Navegação principal">
      <span className="app-dock-sheen" aria-hidden />
      {DESTINATIONS.map((destination) => {
        const active = destination.id === view
        return (
          <motion.button
            key={destination.id}
            type="button"
            aria-current={active ? 'page' : undefined}
            aria-label={destination.label}
            whileTap={{ scale: .88 }}
            transition={{ type: 'spring', stiffness: 600, damping: 30 }}
            onClick={() => {
              haptic(active ? 'light' : 'medium')
              sound.tick()
              if (!active) onChange(destination.id)
            }}
          >
            {active && (
              <motion.span
                layoutId="app-dock-lens"
                className="app-dock-lens"
                transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 520, damping: 36, mass: .7 }}
                aria-hidden
              />
            )}
            <span className="app-dock-icon">{destination.icon}</span>
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
