import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { haptic } from '../lib/haptics'
import { sound } from '../lib/sound'
import type { View } from './MenuSheet'

// As HIG pedem ícone preenchido e rótulo de uma palavra só.
const DESTINATIONS: Array<{ id: View; label: string; icon: ReactNode }> = [
  { id: 'inicio', label: 'início', icon: <HomeIcon /> },
  { id: 'lista', label: 'mercado', icon: <BasketIcon /> },
  { id: 'contas', label: 'contas', icon: <BillIcon /> },
  { id: 'desejos', label: 'desejos', icon: <HeartIcon /> },
]

const GLASS = { type: 'spring' as const, stiffness: 420, damping: 38, mass: .9 }

/**
 * Encolher a barra é o comportamento documentado para quando a leitura desce.
 * Sair dele, segundo as HIG, acontece de dois jeitos e só dois: tocar numa aba
 * ou voltar ao topo da tela. Rolar um pouco para cima não devolve a barra.
 */
function useMinimizeOnScroll(view: View) {
  const [mini, setMini] = useState(false)

  useEffect(() => { setMini(false) }, [view])

  useEffect(() => {
    let waiting = false
    const onScroll = (event: Event) => {
      const target = event.target as HTMLElement | null
      if (!target || typeof target.scrollTop !== 'number') return
      const top = target.scrollTop
      if (waiting) return
      waiting = true
      requestAnimationFrame(() => {
        waiting = false
        if (top <= 4) setMini(false)
        else if (top > 40) setMini(true)
      })
    }
    document.addEventListener('scroll', onScroll, true)
    return () => document.removeEventListener('scroll', onScroll, true)
  }, [])

  return [mini, setMini] as const
}

interface Props {
  view: View
  onChange: (view: View) => void
  /** Só informação crítica ganha selo, para o selo não perder o sentido. */
  badges?: Partial<Record<View, number>>
}

export function AppDock({ view, onChange, badges }: Props) {
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
            const badge = badges?.[destination.id] ?? 0
            const label = badge ? `${destination.label}, ${badge} em atraso` : destination.label
            return (
              <motion.button
                key={destination.id}
                layout
                type="button"
                aria-current={active ? 'page' : undefined}
                aria-label={mini ? `${label} — abrir navegação` : label}
                aria-expanded={mini ? false : undefined}
                style={{ borderRadius: 999 }}
                initial={{ opacity: 0, scale: .7 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: .7 }}
                transition={spring}
                whileTap={{ scale: .9 }}
                onClick={() => {
                  // Tocar numa aba também é o jeito de sair do estado encolhido.
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
                <motion.span layout="position" className="app-dock-icon">
                  {destination.icon}
                  {badge > 0 && <span className="app-dock-badge" aria-hidden>{badge > 9 ? '!' : badge}</span>}
                </motion.span>
                <motion.span layout="position" className="app-dock-label">{destination.label}</motion.span>
              </motion.button>
            )
          })}
        </AnimatePresence>
      </motion.nav>
    </div>
  )
}

function HomeIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden><path d="M3.8 10.9 12 3.7l8.2 7.2V20.4h-5.9v-5.8H9.7v5.8H3.8Z" /></svg>
}
function BasketIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path data-stroke d="M8.6 8.1a3.4 3.4 0 0 1 6.8 0" />
      <path d="M3.9 9.2h16.2l-1.4 10.1a1.4 1.4 0 0 1-1.4 1.2H6.7a1.4 1.4 0 0 1-1.4-1.2Z" />
    </svg>
  )
}
function BillIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path fillRule="evenodd" clipRule="evenodd" d="M5.9 3.3h12.2v17a.7.7 0 0 1-1.1.6l-2.2-1.5-2.4 1.6a.8.8 0 0 1-.9 0l-2.3-1.6L7 20.9a.7.7 0 0 1-1.1-.6Zm2.9 4.4h6.4v1.7H8.8Zm0 4h6.4v1.7H8.8Z" />
    </svg>
  )
}
function HeartIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden><path d="M12 20.8 4.6 13.4a4.75 4.75 0 0 1 6.7-6.7l.7.7.7-.7a4.75 4.75 0 0 1 6.7 6.7Z" /></svg>
}
