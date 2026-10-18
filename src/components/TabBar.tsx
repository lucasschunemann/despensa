import { motion, useReducedMotion } from 'motion/react'
import { haptic } from '../lib/haptics'
import { sound } from '../lib/sound'
import { Mark } from './Avatar'
import { Icon, type IconName } from './ui'

export type View = 'inicio' | 'lista' | 'contas' | 'desejos'

const TABS: Array<{ id: View; label: string; icon: IconName }> = [
  { id: 'inicio', label: 'início', icon: 'home' },
  { id: 'lista', label: 'mercado', icon: 'basket' },
  { id: 'contas', label: 'contas', icon: 'receipt' },
  { id: 'desejos', label: 'desejos', icon: 'heart' },
]

interface Props {
  view: View
  onChange: (view: View) => void
  /** só informação crítica ganha selo */
  badges?: Partial<Record<View, number>>
}

/** Barra de abas no celular; vira barra lateral a partir do tablet. */
export function TabBar({ view, onChange, badges }: Props) {
  const reduced = useReducedMotion()
  return (
    <nav className="tabbar" aria-label="Navegação principal">
      <div className="tabbar-brand" aria-hidden><Mark size={22} /><span>despensa</span></div>
      {TABS.map((tab) => {
        const active = tab.id === view
        const badge = badges?.[tab.id] ?? 0
        return (
          <motion.button
            key={tab.id}
            type="button"
            className="tab"
            aria-current={active ? 'page' : undefined}
            aria-label={badge ? `${tab.label}, ${badge} em atraso` : tab.label}
            whileTap={reduced ? undefined : { scale: 0.92 }}
            onClick={() => {
              if (active) return
              haptic('light')
              sound.tick()
              onChange(tab.id)
            }}
          >
            <span className="tab-icon">
              <Icon name={tab.icon} size={25} />
              {badge > 0 && <span className="tab-badge" aria-hidden>{badge > 9 ? '9+' : badge}</span>}
            </span>
            <span className="tab-label">{tab.label}</span>
          </motion.button>
        )
      })}
    </nav>
  )
}
