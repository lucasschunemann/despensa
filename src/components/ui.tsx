import {
  AnimatePresence,
  animate,
  motion,
  useDragControls,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from 'motion/react'
import { createContext, useContext, useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import type { Presence } from '../hooks/usePresence'
import { haptic } from '../lib/haptics'
import { Avatar } from './Avatar'
import { SyncBadge } from './SyncBadge'

/* ─── Contexto do app ─────────────────────────────────────────────────────── */

export interface ShellValue {
  me: string
  presence: Presence
  openSettings: () => void
}
export const Shell = createContext<ShellValue | null>(null)

/** Tocar de novo na aba atual leva a tela ao topo, como no iOS. */
export const SCROLL_TOP_EVENT = 'despensa:topo'

/* ─── Ícones (desenhados no espírito dos SF Symbols) ──────────────────────── */

const LINE = {
  right: <path d="m9.5 5 7 7-7 7" />,
  left: <path d="m14.5 5-7 7 7 7" />,
  down: <path d="m6 9.5 6 6 6-6" />,
  close: <path d="m6.5 6.5 11 11m0-11-11 11" />,
  check: <path d="m5 12.6 4.6 4.6L19 7.6" />,
  plus: <path d="M12 4.5v15M4.5 12h15" />,
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m15.4 15.4 5.1 5.1" />
    </>
  ),
  up: <path d="M12 19.5v-15M12 4.5 5.5 11M12 4.5l6.5 6.5" />,
  repeat: (
    <>
      <path d="M17 3.5 20 6.5l-3 3" />
      <path d="M4 11.5v-1a4 4 0 0 1 4-4h12" />
      <path d="M7 20.5l-3-3 3-3" />
      <path d="M20 12.5v1a4 4 0 0 1-4 4H4" />
    </>
  ),
  trash: <path d="M4.5 6.5h15M9.5 6.5V4.8c0-.7.5-1.3 1.2-1.3h2.6c.7 0 1.2.6 1.2 1.3v1.7M6.5 6.5l.9 12.4c.1 1 .9 1.6 1.8 1.6h5.6c.9 0 1.7-.6 1.8-1.6l.9-12.4" />,
  camera: (
    <>
      <path d="M3.5 8.8c0-1 .8-1.8 1.8-1.8h2.2l1.4-2h6.2l1.4 2h2.2c1 0 1.8.8 1.8 1.8v8.4c0 1-.8 1.8-1.8 1.8H5.3c-1 0-1.8-.8-1.8-1.8Z" />
      <circle cx="12" cy="12.8" r="3.4" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="10.5" width="14" height="10" rx="2.5" />
      <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
    </>
  ),
  speaker: (
    <>
      <path d="M11 5 6.5 9H3.5v6h3l4.5 4Z" />
      <path d="M15.5 9.2a4 4 0 0 1 0 5.6M18.3 6.6a7.6 7.6 0 0 1 0 10.8" />
    </>
  ),
  appearance: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 3.5v17a8.5 8.5 0 0 0 0-17Z" fill="currentColor" />
    </>
  ),
  play: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="m10.2 8.6 5 3.4-5 3.4Z" fill="currentColor" />
    </>
  ),
  bell: (
    <>
      <path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 1.5h-15Z" />
      <path d="M10 20.5a2 2 0 0 0 4 0" />
    </>
  ),
  logout: <path d="M10 4.5H6.5a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2H10M14.5 8l4 4-4 4M9 12h9.5" />,
  folder: <path d="M3.5 7.5a2 2 0 0 1 2-2h4l2 2.5h7a2 2 0 0 1 2 2v7.5a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2Z" />,
  person: (
    <>
      <circle cx="12" cy="8.5" r="3.8" />
      <path d="M4.8 20c.9-3.6 3.8-5.5 7.2-5.5s6.3 1.9 7.2 5.5" />
    </>
  ),
  ellipsis: (
    <>
      <circle cx="6" cy="12" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="18" cy="12" r="1.3" fill="currentColor" stroke="none" />
    </>
  ),
  warning: (
    <>
      <path d="M10.3 4.4 2.9 17.5A2 2 0 0 0 4.6 20.5h14.8a2 2 0 0 0 1.7-3L13.7 4.4a2 2 0 0 0-3.4 0Z" />
      <path d="M12 9.5v4.5M12 17.2v.1" />
    </>
  ),
  heart: <path d="M12 20.2s-8-4.7-8-10.4A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 8 2.8c0 5.7-8 10.4-8 10.4Z" />,
  cart: (
    <>
      <path d="M2.8 3.8h2.1l2.4 11.1a1.5 1.5 0 0 0 1.5 1.2h8.6a1.5 1.5 0 0 0 1.4-1.1l1.7-6.7H5.9" />
      <circle cx="9.4" cy="19.8" r="1.2" />
      <circle cx="16.6" cy="19.8" r="1.2" />
    </>
  ),
  doc: (
    <>
      <path d="M6 3.5h12V21l-3-1.8-3 1.8-3-1.8L6 21Z" />
      <path d="M9 8.5h6M9 12.5h6" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="15.5" rx="3" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </>
  ),
} satisfies Record<string, ReactNode>

// As abas do iOS usam sempre a versão preenchida do símbolo; a cor marca a aba atual.
const FILLED = {
  house: <path d="M11.3 3.4a1.1 1.1 0 0 1 1.4 0l8.6 7.3a.9.9 0 0 1-1.2 1.4l-.6-.5V19a2 2 0 0 1-2 2h-3.2v-5.1a.9.9 0 0 0-.9-.9h-2.8a.9.9 0 0 0-.9.9V21H6.5a2 2 0 0 1-2-2v-7.4l-.6.5a.9.9 0 0 1-1.2-1.4Z" />,
  cart: (
    <>
      <path d="M2 4a1 1 0 0 1 1-1h1.5a1.7 1.7 0 0 1 1.66 1.33L6.42 5.5H20a1 1 0 0 1 .97 1.25l-1.5 6.2a2.2 2.2 0 0 1-2.13 1.67H8.4l.3 1.38h9.3a1 1 0 1 1 0 2H8.5a1.7 1.7 0 0 1-1.66-1.33L4.4 5H3a1 1 0 0 1-1-1Z" />
      <circle cx="9.5" cy="20.2" r="1.7" />
      <circle cx="17" cy="20.2" r="1.7" />
    </>
  ),
  doc: (
    <path
      fillRule="evenodd"
      d="M6.2 2.5h11.6c.7 0 1.2.5 1.2 1.2v17.4a.6.6 0 0 1-.95.49L15.9 20.1l-1.95 1.42a.7.7 0 0 1-.82 0L12 20.7l-1.13.82a.7.7 0 0 1-.82 0L8.1 20.1l-2.15 1.49A.6.6 0 0 1 5 21.1V3.7c0-.7.5-1.2 1.2-1.2ZM8.6 7.2a.8.8 0 0 0 0 1.6h6.8a.8.8 0 0 0 0-1.6Zm0 4a.8.8 0 0 0 0 1.6h6.8a.8.8 0 0 0 0-1.6Zm0 4a.8.8 0 0 0 0 1.6h4.2a.8.8 0 0 0 0-1.6Z"
    />
  ),
  heart: <path d="M12 21.1c-.3 0-.6-.1-.8-.2C9.6 19.9 3 15.6 3 9.9A5.1 5.1 0 0 1 12 6.7a5.1 5.1 0 0 1 9 3.2c0 5.7-6.6 10-8.2 11-.2.1-.5.2-.8.2Z" />,
  bolt: <path d="M13.4 2.6 4.6 13.3a.7.7 0 0 0 .5 1.2h5.7l-1.2 6.9a.5.5 0 0 0 .9.4l8.8-10.7a.7.7 0 0 0-.5-1.2h-5.7l1.2-6.9a.5.5 0 0 0-.9-.4Z" />,
  check: <path fillRule="evenodd" d="M12 2.5a9.5 9.5 0 1 1 0 19 9.5 9.5 0 0 1 0-19Zm4.3 6.2a1 1 0 0 0-1.4.1l-4.1 4.9-1.8-1.8a1 1 0 0 0-1.4 1.4l2.6 2.6a1 1 0 0 0 1.5-.1l4.8-5.7a1 1 0 0 0-.2-1.4Z" />,
} satisfies Record<string, ReactNode>

export type IconName = keyof typeof LINE
export type FilledName = keyof typeof FILLED

export function Icon({ name, size = 22, className = '', weight }: { name: IconName; size?: number; className?: string; weight?: number }) {
  return (
    <svg className={`icon ${className}`.trim()} width={size} height={size} viewBox="0 0 24 24" aria-hidden style={weight ? { strokeWidth: weight } : undefined}>
      {LINE[name]}
    </svg>
  )
}

export function Glyph({ name, size = 24, className = '' }: { name: FilledName; size?: number; className?: string }) {
  return (
    <svg className={`glyph ${className}`.trim()} width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      {FILLED[name]}
    </svg>
  )
}

/** Quadrado colorido com o símbolo em branco, como nos Ajustes. */
export function Tile({ color, children }: { color: string; children: ReactNode }) {
  return <span className="tile" style={{ background: `var(--${color})` }}>{children}</span>
}

/* ─── Tela: título grande que vira título de barra ao rolar ───────────────── */

interface ScreenProps {
  title: string
  /** linha pequena acima do título (a data, no início) */
  eyebrow?: ReactNode
  /** linha logo abaixo do título */
  subtitle?: ReactNode
  /** botões da barra, à direita (ex.: Selecionar) */
  toolbar?: ReactNode
  /** o que flutua embaixo, acima da barra de abas: campo de adicionar e avisos */
  accessory?: ReactNode
  /** fundo branco liso (lista, como Lembretes) em vez do cinza agrupado */
  plain?: boolean
  tint?: string
  children: ReactNode
  scrollRef?: React.RefObject<HTMLDivElement | null>
  onScroll?: (element: HTMLDivElement) => void
}

export function Screen({ title, eyebrow, subtitle, toolbar, accessory, plain, tint, children, scrollRef, onScroll }: ScreenProps) {
  const shell = useContext(Shell)
  const [collapsed, setCollapsed] = useState(false)
  const own = useRef<HTMLDivElement>(null)
  const scroller = scrollRef ?? own

  useEffect(() => {
    const top = () => scroller.current?.scrollTo({ top: 0, behavior: 'smooth' })
    window.addEventListener(SCROLL_TOP_EVENT, top)
    return () => window.removeEventListener(SCROLL_TOP_EVENT, top)
  }, [scroller])

  const style = tint ? ({ '--tint': `var(--${tint})` } as CSSProperties) : undefined

  return (
    <section className={`screen${plain ? ' is-plain' : ''}${accessory ? ' has-accessory' : ''}`} style={style}>
      <header className={`navbar${collapsed ? ' is-collapsed' : ''}`}>
        <span className="navbar-title" aria-hidden>{title}</span>
        {toolbar && <div className="navbar-tools">{toolbar}</div>}
      </header>
      <div
        className="scroll"
        ref={scroller}
        onScroll={(event) => {
          const el = event.currentTarget
          setCollapsed(el.scrollTop > (eyebrow ? 58 : 40))
          onScroll?.(el)
        }}
      >
        <div className="large-title">
          <div className="large-title-text">
            {eyebrow && <p className="eyebrow">{eyebrow}</p>}
            <h1>{title}</h1>
          </div>
          <div className="large-title-side">
            <SyncBadge />
            {shell?.presence.online.map((person) => (
              <span className="presence" key={person} title={`${person} está com o app aberto`}>
                <Avatar person={person} size={34} />
              </span>
            ))}
            {shell && (
              <button className="me" onClick={shell.openSettings} aria-label="Abrir configurações">
                <Avatar person={shell.me} size={34} />
              </button>
            )}
          </div>
        </div>
        {subtitle && <div className="screen-sub">{subtitle}</div>}
        {children}
      </div>
      {accessory && <div className="accessory">{accessory}</div>}
    </section>
  )
}

/* ─── Listas agrupadas ────────────────────────────────────────────────────── */

export function Section({ header, footer, children, className = '', action }: { header?: ReactNode; footer?: ReactNode; children: ReactNode; className?: string; action?: ReactNode }) {
  return (
    <section className={`section ${className}`.trim()}>
      {(header || action) && (
        <div className="section-header">
          {header && <h2>{header}</h2>}
          {action}
        </div>
      )}
      <div className="section-body">{children}</div>
      {footer && <p className="section-footer">{footer}</p>}
    </section>
  )
}

interface RowProps {
  icon?: ReactNode
  title: ReactNode
  detail?: ReactNode
  value?: ReactNode
  chevron?: boolean
  danger?: boolean
  center?: boolean
  onClick?: () => void
  disabled?: boolean
  ariaLabel?: string
  children?: ReactNode
}

/** Linha de lista agrupada: ícone, título, valor à direita e seta quando abre algo. */
export function Row({ icon, title, detail, value, chevron, danger, center, onClick, disabled, ariaLabel, children }: RowProps) {
  const body = (
    <>
      {icon && <span className="row-icon">{icon}</span>}
      <span className="row-text">
        <span className="row-title">{title}</span>
        {detail && <span className="row-detail">{detail}</span>}
      </span>
      {value !== undefined && <span className="row-value">{value}</span>}
      {children}
      {chevron && <Icon name="right" size={14} weight={2.6} className="row-chevron" />}
    </>
  )
  const cls = `row${danger ? ' is-danger' : ''}${center ? ' is-center' : ''}${icon ? ' has-icon' : ''}`
  if (!onClick) return <div className={cls}>{body}</div>
  return <button type="button" className={cls} onClick={onClick} disabled={disabled} aria-label={ariaLabel}>{body}</button>
}

/* ─── Concluir: o círculo de Lembretes, e o de seleção ────────────────────── */

export function Check({ checked, onClick, label, variant = 'circle' }: { checked: boolean; onClick: () => void; label: string; variant?: 'circle' | 'select' }) {
  const reduced = useReducedMotion()
  const spring = reduced ? { duration: 0 } : { type: 'spring' as const, stiffness: 700, damping: 30 }
  return (
    <button type="button" role="checkbox" aria-checked={checked} aria-label={label} className={`check is-${variant}${checked ? ' is-on' : ''}`} onClick={onClick}>
      <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden>
        <circle className="check-ring" cx="12" cy="12" r="10.75" />
        {variant === 'circle' ? (
          <motion.circle className="check-dot" cx="12" cy="12" r="7.25" initial={false} animate={{ scale: checked ? 1 : 0, opacity: checked ? 1 : 0 }} transition={spring} />
        ) : (
          <>
            <motion.circle className="check-fill" cx="12" cy="12" r="11.5" initial={false} animate={{ scale: checked ? 1 : 0.4, opacity: checked ? 1 : 0 }} transition={spring} />
            <motion.path className="check-mark" d="M7.4 12.4 10.6 15.6 16.8 8.8" initial={false} animate={{ pathLength: checked ? 1 : 0, opacity: checked ? 1 : 0 }} transition={{ duration: reduced ? 0 : 0.18 }} />
          </>
        )}
      </svg>
    </button>
  )
}

/* ─── Linha com ações de arrastar ─────────────────────────────────────────── */

const REVEAL = 84
const OPEN_AT = 40
const TRIGGER = 76

let openRow: (() => void) | null = null

interface SwipeRowProps {
  children: ReactNode
  /** o que a direita faz: pegar, pagar, realizar */
  lead?: { label: string; onTrigger: () => void }
  onRemove?: () => void
  onPress?: () => void
  disabled?: boolean
  className?: string
}

export function SwipeRow({ children, lead, onRemove, onPress, disabled = false, className = '' }: SwipeRowProps) {
  const reduced = useReducedMotion()
  const x = useMotionValue(0)
  const face = useRef<HTMLDivElement>(null)
  const dragged = useRef(false)
  const crossed = useRef<'none' | 'lead' | 'full'>('none')
  const opened = useRef(false)
  const spring = reduced ? { duration: 0.1 } : { type: 'spring' as const, stiffness: 440, damping: 38, mass: 0.8 }
  const leadOpacity = useTransform(x, [0, 24, TRIGGER], [0, 0.6, 1])
  const trailWidth = useTransform(x, (v) => Math.max(0, -v))

  const close = () => {
    if (!opened.current) return
    opened.current = false
    animate(x, 0, spring)
    if (openRow === close) openRow = null
  }

  useEffect(() => () => { if (openRow === close) openRow = null })
  useEffect(() => {
    const away = (event: PointerEvent) => {
      if (!opened.current) return
      const el = event.target as HTMLElement | null
      if (!el?.closest('.swipe-trail')) close()
    }
    document.addEventListener('pointerdown', away, true)
    return () => document.removeEventListener('pointerdown', away, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const width = () => face.current?.offsetWidth ?? 320

  return (
    <motion.li
      layout={reduced ? false : 'position'}
      className={`swipe ${className}`.trim()}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0, transition: { duration: 0.24, ease: [0.32, 0.72, 0, 1] } }}
      transition={spring}
    >
      {lead && (
        <motion.span className="swipe-lead" style={{ opacity: leadOpacity }} aria-hidden>
          <Icon name="check" size={20} weight={2.4} />
          {lead.label}
        </motion.span>
      )}
      {onRemove && (
        <motion.button type="button" className="swipe-trail" style={{ width: trailWidth }} onClick={() => { close(); onRemove() }} tabIndex={-1} aria-label="Apagar">
          <span><Icon name="trash" size={20} weight={2} />Apagar</span>
        </motion.button>
      )}
      <motion.div
        ref={face}
        className="swipe-face"
        style={{ x }}
        drag={disabled ? false : 'x'}
        dragDirectionLock
        dragConstraints={{ left: onRemove ? -width() : 0, right: lead ? 110 : 0 }}
        dragElastic={{ left: 0.02, right: 0.1 }}
        dragMomentum={false}
        onPointerDown={() => { dragged.current = false }}
        onDragStart={() => { dragged.current = true }}
        onDrag={(_, info) => {
          const full = Boolean(onRemove) && info.offset.x < -width() * 0.6
          const next = lead && info.offset.x > TRIGGER ? 'lead' : full ? 'full' : 'none'
          if (next !== crossed.current) {
            crossed.current = next
            if (next !== 'none') haptic('light')
          }
        }}
        onDragEnd={(_, info) => {
          const reached = crossed.current
          crossed.current = 'none'
          if (reached === 'lead' && lead) {
            animate(x, 0, spring)
            lead.onTrigger()
            return
          }
          // arrastar até o fim apaga direto, como no Mail
          if (reached === 'full' && onRemove) {
            animate(x, -width(), { duration: 0.18 })
            onRemove()
            return
          }
          const open = Boolean(onRemove) && (info.offset.x < -OPEN_AT || info.velocity.x < -450)
          animate(x, open ? -REVEAL : 0, spring)
          if (open) {
            if (openRow && openRow !== close) openRow()
            openRow = close
          } else if (openRow === close) openRow = null
          opened.current = open
        }}
        // depois de arrastar, o soltar não pode virar toque no que estava embaixo do dedo
        onClickCapture={(event) => {
          if (dragged.current) {
            dragged.current = false
            event.stopPropagation()
            event.preventDefault()
            return
          }
          if (opened.current) {
            event.stopPropagation()
            event.preventDefault()
            close()
          }
        }}
        onClick={(event) => {
          if (!onPress) return
          if ((event.target as HTMLElement).closest('button, a, input, label')) return
          onPress()
        }}
        role={onPress ? 'button' : undefined}
        tabIndex={onPress ? 0 : undefined}
        onKeyDown={(event) => {
          if (onPress && event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) {
            event.preventDefault()
            onPress()
          }
        }}
      >
        {children}
      </motion.div>
    </motion.li>
  )
}

/* ─── Folha ───────────────────────────────────────────────────────────────── */

function useModal(open: boolean, panel: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!open) return
    const previous = document.activeElement as HTMLElement | null
    const shell = document.querySelector<HTMLElement>('.shell')
    if (shell) shell.inert = true
    const frame = requestAnimationFrame(() => {
      const field = panel.current?.querySelector<HTMLElement>('[data-autofocus]')
      ;(field ?? panel.current)?.focus({ preventScroll: true })
    })
    return () => {
      cancelAnimationFrame(frame)
      if (shell) shell.inert = false
      previous?.focus?.()
    }
  }, [open, panel])
}

function trapTab(event: React.KeyboardEvent, panel: HTMLElement | null) {
  if (event.key !== 'Tab' || !panel) return
  const nodes = Array.from(panel.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select, textarea, [href], [tabindex="0"]'))
  const first = nodes[0]
  const last = nodes[nodes.length - 1]
  if (event.shiftKey && (document.activeElement === first || document.activeElement === panel)) { event.preventDefault(); last?.focus() }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
}

interface SheetProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  /** botão de confirmar (✓) no canto direito */
  onDone?: () => void
  doneLabel?: string
  doneDisabled?: boolean
  onClosed?: () => void
}

export function Sheet({ open, onClose, title, children, onDone, doneLabel = 'Salvar', doneDisabled, onClosed }: SheetProps) {
  const reduced = useReducedMotion()
  const panel = useRef<HTMLDivElement>(null)
  const controls = useDragControls()
  const titleId = useId()
  useModal(open, panel)

  return createPortal(
    <AnimatePresence onExitComplete={onClosed}>
      {open && (
        <motion.div className="sheet-layer" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduced ? 0 : 0.25 }} onClick={onClose}>
          <motion.div
            className="sheet"
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            initial={{ y: '110%' }}
            animate={{ y: 0 }}
            exit={{ y: '110%' }}
            transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 380, damping: 40 }}
            drag={reduced ? false : 'y'}
            dragControls={controls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.05, bottom: 0.6 }}
            onDragEnd={(_, info) => { if (info.offset.y > 100 || info.velocity.y > 600) onClose() }}
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => {
              if (event.key === 'Escape') onClose()
              trapTab(event, panel.current)
            }}
          >
            <div className="sheet-head" onPointerDown={(event) => controls.start(event)}>
              <span className="sheet-grab" aria-hidden />
              <button type="button" className="glass-button" onClick={onClose} aria-label="Fechar" onPointerDown={(event) => event.stopPropagation()}>
                <Icon name="close" size={17} weight={2.3} />
              </button>
              <h2 id={titleId}>{title}</h2>
              {onDone ? (
                <button type="button" className="glass-button is-prominent" onClick={onDone} disabled={doneDisabled} aria-label={doneLabel} onPointerDown={(event) => event.stopPropagation()}>
                  <Icon name="check" size={19} weight={2.5} />
                </button>
              ) : <span className="glass-spacer" aria-hidden />}
            </div>
            <div className="sheet-body">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

/** Escolha com consequência (apagar, mudar o que se repete), no formato do iOS. */
export function ActionSheet({ open, onClose, title, message, actions }: {
  open: boolean
  onClose: () => void
  title: string
  message?: string
  actions: Array<{ label: string; destructive?: boolean; onSelect: () => void }>
}) {
  const reduced = useReducedMotion()
  const panel = useRef<HTMLDivElement>(null)
  const titleId = useId()
  useModal(open, panel)
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div className="sheet-layer is-action" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduced ? 0 : 0.2 }} onClick={onClose}>
          <motion.div
            className="action-sheet"
            ref={panel}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            initial={{ y: reduced ? 0 : 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: reduced ? 0 : 40, opacity: 0 }}
            transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 460, damping: 38 }}
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => { if (event.key === 'Escape') onClose(); trapTab(event, panel.current) }}
          >
            <div className="action-group">
              <div className="action-head">
                <p id={titleId} className="action-title">{title}</p>
                {message && <p className="action-message">{message}</p>}
              </div>
              {actions.map((action) => (
                <button key={action.label} type="button" className={action.destructive ? 'is-destructive' : ''} onClick={action.onSelect}>{action.label}</button>
              ))}
            </div>
            <div className="action-group">
              <button type="button" className="is-cancel" onClick={onClose}>Cancelar</button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

/* ─── Menu suspenso ───────────────────────────────────────────────────────── */

export function PullDown<T extends string>({ value, options, onChange, label, children }: {
  value: T
  options: Array<{ value: T; label: string; icon: ReactNode }>
  onChange: (value: T) => void
  label: string
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const reduced = useReducedMotion()
  const root = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const away = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false) }
    const esc = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false) }
    document.addEventListener('pointerdown', away, true)
    document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('pointerdown', away, true); document.removeEventListener('keydown', esc) }
  }, [open])
  return (
    <div className="pulldown" ref={root}>
      <button type="button" className="pulldown-trigger" aria-haspopup="menu" aria-expanded={open} aria-label={label} onPointerDown={(e) => e.preventDefault()} onClick={() => { haptic('light'); setOpen((v) => !v) }}>
        {children}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            className="menu"
            role="menu"
            aria-label={label}
            initial={{ opacity: 0, scale: reduced ? 1 : 0.6, y: reduced ? 0 : 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: reduced ? 1 : 0.7, y: reduced ? 0 : 8 }}
            transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 520, damping: 34 }}
          >
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                role="menuitemradio"
                aria-checked={option.value === value}
                onPointerDown={(e) => e.preventDefault()}
                onClick={() => { haptic('light'); onChange(option.value); setOpen(false) }}
              >
                <span className="menu-check">{option.value === value && <Icon name="check" size={16} weight={2.4} />}</span>
                <span className="menu-label">{option.label}</span>
                <span className="menu-icon">{option.icon}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ─── Controles ───────────────────────────────────────────────────────────── */

export function Segmented<T extends string | number>({ value, options, onChange, label }: { value: T; options: Array<{ value: T; label: string }>; onChange: (value: T) => void; label: string }) {
  const id = useId()
  const reduced = useReducedMotion()
  return (
    <div className="segmented" role="radiogroup" aria-label={label}>
      {options.map((option) => {
        const active = option.value === value
        return (
          <button key={String(option.value)} type="button" role="radio" aria-checked={active} onClick={() => { if (!active) { haptic('light'); onChange(option.value) } }}>
            {active && <motion.span layoutId={`seg-${id}`} className="segmented-thumb" transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 500, damping: 40 }} />}
            <span className="segmented-label">{option.label}</span>
          </button>
        )
      })}
    </div>
  )
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (value: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} className={`switch${checked ? ' is-on' : ''}`} onClick={() => { haptic('light'); onChange(!checked) }}>
      <i />
    </button>
  )
}

/* ─── Aviso temporário com "Desfazer" ─────────────────────────────────────── */

export function Toast({ children, action, duration, onDismiss }: { children: ReactNode; action?: { label: string; onClick: () => void }; duration?: number; onDismiss?: () => void }) {
  const reduced = useReducedMotion()
  useEffect(() => {
    if (!duration || !onDismiss) return
    const timer = setTimeout(onDismiss, duration)
    return () => clearTimeout(timer)
  }, [duration, onDismiss])
  return (
    <motion.div
      className="toast"
      layout
      role="status"
      initial={{ opacity: 0, y: 12, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.94 }}
      transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 520, damping: 36 }}
      drag={onDismiss && !reduced ? 'y' : false}
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={{ top: 0.05, bottom: 0.7 }}
      onDragEnd={(_, info) => { if (info.offset.y > 30 || info.velocity.y > 400) onDismiss?.() }}
    >
      <span>{children}</span>
      {action && <button type="button" onClick={action.onClick}>{action.label}</button>}
    </motion.div>
  )
}

/** O que flutua embaixo: avisos e "fulano está escrevendo" sobem a partir do campo. */
export function Accessory({ children, toasts, above }: { children?: ReactNode; toasts?: ReactNode; above?: ReactNode }) {
  return (
    <>
      <div className="toast-stack">
        <AnimatePresence>{toasts}</AnimatePresence>
        <AnimatePresence>{above}</AnimatePresence>
      </div>
      {children}
    </>
  )
}

/** Balão de "digitando", o mesmo do Mensagens. */
export function Typing({ person }: { person: string }) {
  return (
    <motion.div className="typing" initial={{ opacity: 0, y: 8, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 6, scale: 0.9 }} role="status">
      <Avatar person={person} size={22} />
      <span className="typing-bubble" aria-label={`${person} está escrevendo`}><i /><i /><i /></span>
    </motion.div>
  )
}

/* ─── Campo de adicionar ──────────────────────────────────────────────────── */

interface ComposerProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  canSubmit: boolean
  placeholder: string
  label: string
  sendLabel?: string
  leading?: ReactNode
  /** o que o app entendeu do texto, mostrado dentro do campo */
  chip?: ReactNode
  onFocus?: () => void
  inputRef?: React.RefObject<HTMLInputElement | null>
}

export function Composer({ value, onChange, onSubmit, canSubmit, placeholder, label, sendLabel = 'Adicionar', leading, chip, onFocus, inputRef }: ComposerProps) {
  const reduced = useReducedMotion()
  return (
    <form className="composer" onSubmit={(event) => { event.preventDefault(); if (canSubmit) onSubmit() }}>
      {leading ?? <span className="composer-plus" aria-hidden><Icon name="plus" size={20} weight={2.2} /></span>}
      <input
        ref={inputRef}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onFocus={onFocus}
        placeholder={placeholder}
        aria-label={label}
        autoComplete="off"
        autoCapitalize="sentences"
        enterKeyHint="send"
        maxLength={160}
      />
      <AnimatePresence initial={false}>
        {chip && (
          <motion.span key="chip" className="composer-chip" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: reduced ? 0 : 0.14 }}>
            {chip}
          </motion.span>
        )}
        {canSubmit && (
          <motion.button
            key="send"
            type="submit"
            className="composer-send"
            aria-label={sendLabel}
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.4, opacity: 0 }}
            transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 640, damping: 30 }}
            // o foco fica no campo: sem isso o teclado fecha a cada item no celular
            onPointerDown={(event) => event.preventDefault()}
          >
            <Icon name="up" size={17} weight={2.6} />
          </motion.button>
        )}
      </AnimatePresence>
    </form>
  )
}

/* ─── Estados: vazio, carregando, concluído ───────────────────────────────── */

export function Empty({ icon, title, hint }: { icon: ReactNode; title: string; hint?: string }) {
  return (
    <motion.div className="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <span className="empty-icon">{icon}</span>
      <p className="empty-title">{title}</p>
      {hint && <p className="empty-hint">{hint}</p>}
    </motion.div>
  )
}

export function Skeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="section">
      <ul className="section-body skeleton" aria-hidden>
        {Array.from({ length: rows }, (_, i) => (
          <li key={i}>
            <span className="skeleton-dot" />
            <span className="skeleton-lines">
              <span style={{ width: `${[62, 48, 70, 54][i % 4]}%` }} />
              <span className="is-short" />
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Confirmação no centro da tela, como o aviso de "Copiado" do iOS. */
export function Done({ show, label }: { show: boolean; label: string }) {
  const reduced = useReducedMotion()
  return (
    <AnimatePresence>
      {show && (
        <motion.div className="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduced ? 0 : 0.2 }} aria-live="polite">
          <motion.div className="done-card" initial={{ scale: reduced ? 1 : 0.86, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: reduced ? 1 : 0.94, opacity: 0 }} transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 30 }}>
            <svg viewBox="0 0 48 48" width="52" height="52" aria-hidden>
              <motion.path d="M12 25.5 20.5 34 36.5 15" fill="none" stroke="currentColor" strokeWidth="4.2" strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: reduced ? 1 : 0 }} animate={{ pathLength: 1 }} transition={{ duration: reduced ? 0 : 0.36, delay: 0.08 }} />
            </svg>
            <p>{label}</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
