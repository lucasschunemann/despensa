import { haptic } from '../lib/haptics'
import { sound } from '../lib/sound'
import { Mark } from './Avatar'
import { Icon, SCROLL_TOP_EVENT, type IconName } from './ui'

export type View = 'inicio' | 'lista' | 'contas' | 'desejos'

/** Emoji de cada página, o mesmo no caminho, no título e na barra lateral. */
export const PAGE_ICON: Record<Exclude<View, 'inicio'>, string> = {
  lista: '🛒',
  contas: '🧾',
  desejos: '🎁',
}

const TABS: Array<{ id: View; label: string; icon: IconName; emoji?: string }> = [
  { id: 'inicio', label: 'Início', icon: 'home' },
  { id: 'lista', label: 'Mercado', icon: 'cart', emoji: PAGE_ICON.lista },
  { id: 'contas', label: 'Contas', icon: 'doc', emoji: PAGE_ICON.contas },
  { id: 'desejos', label: 'Desejos', icon: 'heart', emoji: PAGE_ICON.desejos },
]

interface Props {
  view: View
  onChange: (view: View) => void
  /** só informação crítica ganha selo */
  badges?: Partial<Record<View, number>>
}

/** Barra de abas no celular; barra lateral com as páginas a partir do tablet. */
export function TabBar({ view, onChange, badges }: Props) {
  return (
    <nav className="tabbar" aria-label="Navegação principal">
      <div className="tabbar-brand" aria-hidden><Mark size={18} /><span>despensa</span></div>
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
            <span className="tab-icon">
              <Icon name={tab.icon} size={24} className="tab-line" />
              <span className="tab-emoji" aria-hidden>{tab.emoji ?? <Mark size={16} />}</span>
              {badge > 0 && <span className="tab-badge" aria-hidden>{badge > 9 ? '9+' : badge}</span>}
            </span>
            <span className="tab-label">{tab.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
