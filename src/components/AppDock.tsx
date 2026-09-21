import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { haptic } from '../lib/haptics'
import { sound } from '../lib/sound'
import type { View } from './MenuSheet'

const DESTINATIONS: Array<{ id: View; label: string; icon: ReactNode }> = [
  { id: 'inicio', label: 'início', icon: <HomeIcon /> },
  { id: 'lista', label: 'mercado', icon: <BasketIcon /> },
  { id: 'contas', label: 'contas', icon: <BillIcon /> },
  { id: 'desejos', label: 'desejos', icon: <HeartIcon /> },
]

const GLASS = { type: 'spring' as const, stiffness: 420, damping: 38, mass: .9 }

// Descer a tela encolhe a barra até sobrar só a aba atual; subir, ou tocar na
// pílula, devolve ela inteira. Quem rola é o contêiner de cada módulo, então a
// escuta é na fase de captura.
function useMinimizeOnScroll(view: View) {
  const [mini, setMini] = useState(false)

  useEffect(() => { setMini(false) }, [view])

  useEffect(() => {
    let last = 0
    let waiting = false
    const onScroll = (event: Event) => {
      const target = event.target as HTMLElement | null
      if (!target || typeof target.scrollTop !== 'number') return
      const top = target.scrollTop
      if (waiting) return
      waiting = true
      requestAnimationFrame(() => {
        waiting = false
        const delta = top - last
        if (top < 28) setMini(false)
        else if (delta > 6) setMini(true)
        else if (delta < -8) setMini(false)
        last = top
      })
    }
    document.addEventListener('scroll', onScroll, true)
    return () => document.removeEventListener('scroll', onScroll, true)
  }, [])

  return [mini, setMini] as const
}

export function AppDock({ view, onChange }: { view: View; onChange: (view: View) => void }) {
  const reduced = useReducedMotion()
  const [mini, setMini] = useMinimizeOnScroll(view)
  const spring = reduced ? { duration: 0 } : GLASS
  const shown = mini ? DESTINATIONS.filter((item) => item.id === view) : DESTINATIONS

  const expand = useCallback(() => {
    haptic('light')
    sound.open()
    setMini(false)
  }, [setMini])

  return (
    <div className="app-dock-layer">
      <motion.nav
        layout
        transition={spring}
        className="app-dock"
        data-mini={mini ? 'true' : 'false'}
        style={{ borderRadius: 999 }}
        aria-label="Navegação principal"
      >
        <span className="app-dock-sheen" aria-hidden />
        <AnimatePresence initial={false} mode="popLayout">
          {shown.map((destination) => {
            const active = destination.id === view
            return (
              <motion.button
                key={destination.id}
                layout
                type="button"
                aria-current={active ? 'page' : undefined}
                aria-label={mini ? `${destination.label} — abrir navegação` : destination.label}
                aria-expanded={mini ? false : undefined}
                style={{ borderRadius: 999 }}
                initial={{ opacity: 0, scale: .7 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: .7 }}
                transition={spring}
                whileTap={{ scale: .9 }}
                onClick={() => {
                  if (mini) { expand(); return }
                  haptic(active ? 'light' : 'medium')
                  sound.tick()
                  if (!active) onChange(destination.id)
                }}
              >
                {active && !mini && (
                  <motion.span
                    layoutId="app-dock-lens"
                    className="app-dock-lens"
                    style={{ borderRadius: 999 }}
                    transition={spring}
                    aria-hidden
                  />
                )}
                <motion.span layout="position" className="app-dock-icon">{destination.icon}</motion.span>
                <motion.span layout="position" className="app-dock-label">{destination.label}</motion.span>
              </motion.button>
            )
          })}
        </AnimatePresence>
      </motion.nav>
    </div>
  )
}

function HomeIcon() { return <svg viewBox="0 0 24 24" aria-hidden><path d="M4 10.8 12 4l8 6.8V20h-6v-6h-4v6H4Z" /></svg> }
function BasketIcon() { return <svg viewBox="0 0 24 24" aria-hidden><path d="M4 8h16l-1.4 11H5.4Z" /><path d="M8.5 8A3.5 3.5 0 0 1 12 4.5 3.5 3.5 0 0 1 15.5 8" /></svg> }
function BillIcon() { return <svg viewBox="0 0 24 24" aria-hidden><path d="M6 3h12v18l-3-2-3 2-3-2-3 2Z" /><path d="M9 8h6M9 12h6" /></svg> }
function HeartIcon() { return <svg viewBox="0 0 24 24" aria-hidden><path d="M12 20 4.8 13a4.6 4.6 0 0 1 6.5-6.5l.7.7.7-.7A4.6 4.6 0 0 1 19.2 13Z" /></svg> }
