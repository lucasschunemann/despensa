import { motion, useReducedMotion } from 'motion/react'
import { haptic } from '../lib/haptics'
import { sound } from '../lib/sound'
import { Mark } from './Avatar'
import { Glyph, SCROLL_TOP_EVENT, type FilledName } from './ui'

export type View = 'inicio' | 'lista' | 'contas' | 'desejos'

const TABS: Array<{ id: View; label: string; icon: FilledName}> = [
  { id: 'inicio', label: 'Início', icon: 'house' },
  { id: 'lista', label: 'Mercado', icon: 'cart' },
  { id: 'contas', label: 'Contas', icon: 'doc' },
  { id: 'desejos', label: 'Desejos', icon: 'heart' },
]

interface Props {
  view: View
  onChange: (view: View) => void
  /** só informação crítica ganha selo */
  badges?: Partial<Record<View, number>>
}

/** Barra de abas flutuante de vidro no iPhone; barra lateral no iPad e no computador. */
export function TabBar({ view, onChange, badges }: Props) {
  const reduced = useReducedMotion()
  return (
    <nav className="tabbar" aria-label="Navegação principal">
      <div className="tabbar-brand" aria-hidden><Mark size={20} /><span>despensa</span></div>
      {TABS.map((tab) => {
        const active = tab.id === view
        const badge = badges?.[tab.id] ?? 0
        return (
          <button
            key={tab.id}
            type="button"
            className="tab"
            aria-current={active ? 'page' : undefined}
            aria-label={badge ? `${tab.label}, ${badge} em atraso` : tab.label}
            onClick={() => {
              haptic('light')
              if (active) {
                window.dispatchEvent(new Event(SCROLL_TOP_EVENT))
                return
              }
              sound.tick()
              onChange(tab.id)
            }}
          >
            {active && <motion.span layoutId="tab-lens" className="tab-lens" transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 480, damping: 38 }} aria-hidden />}
            <span className="tab-icon">
              <Glyph name={tab.icon} size={26} />
              {badge > 0 && <span className="tab-badge" aria-hidden>{badge > 9 ? '9+' : badge}</span>}
            </span>
            <span className="tab-label">{tab.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
