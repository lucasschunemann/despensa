import {
  AnimatePresence,
  animate,
  motion,
  useDragControls,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from 'motion/react'
import { createContext, useContext, useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import type { Presence } from '../hooks/usePresence'
import { haptic } from '../lib/haptics'
import { Avatar, Mark } from './Avatar'
import { SyncBadge } from './SyncBadge'

/* ─── Contexto do app ─────────────────────────────────────────────────────── */

export interface ShellValue {
  me: string
  presence: Presence
  openSettings: () => void
  goHome: () => void
}
export const Shell = createContext<ShellValue | null>(null)

/** Tocar de novo na aba atual leva a página ao topo. */
export const SCROLL_TOP_EVENT = 'despensa:topo'

/* ─── Ícones de linha, no traço fino do Notion ────────────────────────────── */

const ICONS = {
  home: <path d="M4 11 12 4l8 7v8.5a.5.5 0 0 1-.5.5H15v-5.5H9V20H4.5a.5.5 0 0 1-.5-.5Z" />,
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
  heart: <path d="M12 20.2s-8-4.7-8-10.4A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 8 2.8c0 5.7-8 10.4-8 10.4Z" />,
  plus: <path d="M12 5v14M5 12h14" />,
  close: <path d="m6.5 6.5 11 11m0-11-11 11" />,
  right: <path d="m9.5 5.5 6.5 6.5-6.5 6.5" />,
  left: <path d="m14.5 5.5-6.5 6.5 6.5 6.5" />,
  down: <path d="m6 9.5 6 6 6-6" />,
  caret: <path d="M9 6.5v11l7-5.5Z" fill="currentColor" stroke="none" />,
  check: <path d="m5 12.6 4.6 4.6L19 7.6" />,
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m15.4 15.4 5.1 5.1" />
    </>
  ),
  up: <path d="M12 19V5M12 5l-6 6M12 5l6 6" />,
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
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" />
    </>
  ),
  play: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="m10.2 8.6 5 3.4-5 3.4Z" />
    </>
  ),
  bell: (
    <>
      <path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 1.5h-15Z" />
      <path d="M10 20.5a2 2 0 0 0 4 0" />
    </>
  ),
  logout: <path d="M10 4.5H6.5a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2H10M14.5 8l4 4-4 4M9 12h9.5" />,
  text: <path d="M5 7V5.5h14V7M12 5.5v13M9 18.5h6" />,
  hash: <path d="M9 4 7 20M17 4l-2 16M4.5 9h16M3.5 15h16" />,
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </>
  ),
  person: (
    <>
      <circle cx="12" cy="8.5" r="3.8" />
      <path d="M4.8 20c.9-3.6 3.8-5.5 7.2-5.5s6.3 1.9 7.2 5.5" />
    </>
  ),
  list: <path d="M9 6.5h11M9 12h11M9 17.5h11M4.5 6.5h.01M4.5 12h.01M4.5 17.5h.01" />,
  status: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 3.5a8.5 8.5 0 0 1 0 17Z" fill="currentColor" stroke="none" />
    </>
  ),
  folder: <path d="M3.5 7.5a2 2 0 0 1 2-2h4l2 2.5h7a2 2 0 0 1 2 2v7.5a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2Z" />,
  money: (
    <>
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <circle cx="12" cy="12" r="2.6" />
    </>
  ),
  split: <path d="M12 4v16M5 8l-2.5 4L5 16M19 8l2.5 4L19 16" />,
  image: (
    <>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
      <circle cx="9" cy="9.5" r="1.6" />
      <path d="m4 17 5-4.5 4 3.5 3-2.5 4 3.5" />
    </>
  ),
  select: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="m8.3 12.3 2.6 2.6 4.8-5.3" />
    </>
  ),
  more: (
    <>
      <circle cx="6" cy="12" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="18" cy="12" r="1.2" fill="currentColor" stroke="none" />
    </>
  ),
} satisfies Record<string, ReactNode>

export type IconName = keyof typeof ICONS

export function Icon({ name, size = 20, className = '' }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg className={`icon ${className}`.trim()} width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      {ICONS[name]}
    </svg>
  )
}

/* ─── Página: barra com o caminho, ícone, título e propriedades ───────────── */

interface PageProps {
  /** emoji da página; o início usa a marca */
  icon?: string
  title: string
  /** linha pequena acima do título (a data, no início) */
  eyebrow?: ReactNode
  /** propriedades da página, logo abaixo do título */
  properties?: ReactNode
  /** botões no canto direito da barra */
  toolbar?: ReactNode
  /** campo de adicionar e avisos presos embaixo */
  footer?: ReactNode
  children: ReactNode
  scrollRef?: React.RefObject<HTMLDivElement | null>
  onScroll?: (element: HTMLDivElement) => void
}

export function Page({ icon, title, eyebrow, properties, toolbar, footer, children, scrollRef, onScroll }: PageProps) {
  const shell = useContext(Shell)
  const [scrolled, setScrolled] = useState(false)
  const own = useRef<HTMLDivElement>(null)
  const scroller = scrollRef ?? own

  useEffect(() => {
    const top = () => scroller.current?.scrollTo({ top: 0, behavior: 'smooth' })
    window.addEventListener(SCROLL_TOP_EVENT, top)
    return () => window.removeEventListener(SCROLL_TOP_EVENT, top)
  }, [scroller])

  return (
    <section className="page">
      <header className={`topbar${scrolled ? ' is-scrolled' : ''}`}>
        <nav className="crumbs" aria-label="Caminho">
          {icon ? (
            <>
              <button type="button" className="crumb" onClick={shell?.goHome}><Mark size={15} /><span>Casa</span></button>
              <span className="crumb-sep" aria-hidden>/</span>
              <span className="crumb is-current"><span aria-hidden>{icon}</span><span>{title}</span></span>
            </>
          ) : (
            <span className="crumb is-current"><Mark size={15} /><span>Casa</span></span>
          )}
        </nav>
        <div className="topbar-actions">
          <SyncBadge />
          {toolbar}
          {shell?.presence.online.map((person) => (
            <span className="presence" key={person} title={`${person} está com o app aberto`}>
              <Avatar person={person} size={24} />
            </span>
          ))}
          {shell && (
            <button className="me" onClick={shell.openSettings} aria-label="Abrir configurações">
              <Avatar person={shell.me} size={26} />
            </button>
          )}
        </div>
      </header>
      <div
        className="scroll"
        ref={scroller}
        onScroll={(event) => {
          const el = event.currentTarget
          setScrolled(el.scrollTop > 4)
          onScroll?.(el)
        }}
      >
        <div className="page-head">
          {icon ? <span className="page-icon" aria-hidden>{icon}</span> : <span className="page-icon is-mark" aria-hidden><Mark size={44} /></span>}
          {eyebrow && <p className="eyebrow">{eyebrow}</p>}
          <h1>{title}</h1>
        </div>
        {properties && <dl className="props">{properties}</dl>}
        {children}
      </div>
      {footer}
    </section>
  )
}

/** Propriedade de página: rótulo cinza com ícone à esquerda, valor à direita. */
export function Prop({ icon, label, children }: { icon: IconName; label: string; children: ReactNode }) {
  return (
    <div className="prop">
      <dt><Icon name={icon} size={16} />{label}</dt>
      <dd>{children}</dd>
    </div>
  )
}

/** Bloco de destaque com ícone, como o callout do Notion. */
export function Callout({ icon, tone = 'gray', children, action }: { icon: ReactNode; tone?: 'gray' | 'red' | 'green' | 'blue'; children: ReactNode; action?: ReactNode }) {
  return (
    <div className={`callout is-${tone}`}>
      <span className="callout-icon" aria-hidden>{icon}</span>
      <div className="callout-body">{children}</div>
      {action}
    </div>
  )
}

/** Etiqueta colorida, no formato das opções de seleção do Notion. */
export function Tag({ color = 'default', children }: { color?: string; children: ReactNode }) {
  return <span className={`tag tag-${color}`}>{children}</span>
}

/** Escolha de uma opção entre etiquetas (divisão da conta, vontade do desejo). */
export function Select<T extends string | number>({ value, options, onChange, label }: { value: T; options: Array<{ value: T; label: string; color?: string }>; onChange: (value: T) => void; label: string }) {
  return (
    <div className="select" role="radiogroup" aria-label={label}>
      {options.map((option) => (
        <button
          key={String(option.value)}
          type="button"
          role="radio"
          aria-checked={option.value === value}
          className={`tag tag-${option.color ?? 'default'}`}
          onClick={() => { if (option.value !== value) { haptic('light'); onChange(option.value) } }}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

/** Bloco que abre e fecha, com a setinha que gira. */
export function Toggle({ title, count, open, onToggle, children, action }: { title: string; count?: ReactNode; open: boolean; onToggle: () => void; children: ReactNode; action?: ReactNode }) {
  const reduced = useReducedMotion()
  return (
    <section className="toggle">
      <div className="toggle-head">
        <button type="button" className="toggle-button" aria-expanded={open} onClick={onToggle}>
          <Icon name="caret" size={14} className={`toggle-caret${open ? ' is-open' : ''}`} />
          <span>{title}</span>
          {count !== undefined && <span className="toggle-count">{count}</span>}
        </button>
        {action}
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div className="toggle-body" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={reduced ? { duration: 0 } : { duration: 0.2, ease: [0.2, 0, 0, 1] }}>
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}

/** Linha "+ Novo", no fim da lista ou da tabela: leva ao campo de escrever. */
export function NewRow({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" className="new-row" onClick={onClick}>
      <Icon name="plus" size={16} />
      {label}
    </button>
  )
}

/** Título de grupo, como "A pagar 3" num banco de dados agrupado. */
export function GroupHead({ children, count, action }: { children: ReactNode; count?: ReactNode; action?: ReactNode }) {
  return (
    <div className="group-head">
      <h2>{children}{count !== undefined && <span className="group-count">{count}</span>}</h2>
      {action}
    </div>
  )
}

/* ─── Caixa de tarefa ─────────────────────────────────────────────────────── */

export function Check({ checked, onClick, label }: { checked: boolean; onClick: () => void; label: string }) {
  const reduced = useReducedMotion()
  return (
    <button type="button" role="checkbox" aria-checked={checked} aria-label={label} className={`check${checked ? ' is-on' : ''}`} onClick={onClick}>
      <span className="check-box">
        <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden>
          <motion.path d="M3.6 8.3 6.6 11.2 12.4 4.9" initial={false} animate={{ pathLength: checked ? 1 : 0, opacity: checked ? 1 : 0 }} transition={{ duration: reduced ? 0 : 0.18 }} />
        </svg>
      </span>
    </button>
  )
}

/* ─── Linha com gesto: direita conclui, esquerda apaga ────────────────────── */

const REVEAL = 84
const OPEN_AT = 40
const TRIGGER = 72

let openRow: (() => void) | null = null

interface SwipeRowProps {
  children: ReactNode
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
  const trailOpacity = useTransform(x, [-REVEAL, -12, 0], [1, 0.4, 0])

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
      exit={{ opacity: 0, height: 0, transition: { duration: 0.2, ease: [0.4, 0, 0.2, 1] } }}
      transition={spring}
    >
      {lead && <motion.span className="swipe-lead" style={{ opacity: leadOpacity }} aria-hidden><Icon name="check" size={18} />{lead.label}</motion.span>}
      {onRemove && (
        <motion.button type="button" className="swipe-trail" style={{ opacity: trailOpacity }} onClick={() => { close(); onRemove() }} tabIndex={-1} aria-label="Apagar">
          <Icon name="trash" size={18} />Apagar
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
          // arrastar até o fim apaga direto
          if (reached === 'full' && onRemove) {
            animate(x, -width(), { duration: 0.16 })
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

/* ─── Folha: a página aberta por cima ─────────────────────────────────────── */

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

interface SheetProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  /** ação principal, em texto azul no canto direito */
  action?: { label: string; onClick: () => void; disabled?: boolean }
  onClosed?: () => void
}

export function Sheet({ open, onClose, title, children, action, onClosed }: SheetProps) {
  const reduced = useReducedMotion()
  const panel = useRef<HTMLDivElement>(null)
  const controls = useDragControls()
  const titleId = useId()
  useModal(open, panel)

  return createPortal(
    <AnimatePresence onExitComplete={onClosed}>
      {open && (
        <motion.div className="sheet-layer" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduced ? 0 : 0.2 }} onClick={onClose}>
          <motion.div
            className="sheet"
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 42 }}
            drag={reduced ? false : 'y'}
            dragControls={controls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.05, bottom: 0.6 }}
            onDragEnd={(_, info) => { if (info.offset.y > 100 || info.velocity.y > 600) onClose() }}
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => {
              if (event.key === 'Escape') onClose()
              if (event.key !== 'Tab') return
              const nodes = Array.from(panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), textarea, [href], [tabindex="0"]') ?? [])
              const first = nodes[0]
              const last = nodes[nodes.length - 1]
              if (event.shiftKey && (document.activeElement === first || document.activeElement === panel.current)) { event.preventDefault(); last?.focus() }
              else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
            }}
          >
            <div className="sheet-head" onPointerDown={(event) => controls.start(event)}>
              <span className="sheet-grab" aria-hidden />
              <button type="button" className="text-button is-quiet" onClick={onClose} onPointerDown={(event) => event.stopPropagation()}>Fechar</button>
              <h2 id={titleId}>{title}</h2>
              {action
                ? <button type="button" className="text-button" onClick={action.onClick} disabled={action.disabled} onPointerDown={(event) => event.stopPropagation()}>{action.label}</button>
                : <span className="text-button is-ghost" aria-hidden>Fechar</span>}
            </div>
            <div className="sheet-body">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

/** Escolha com consequência: duas ou três opções e Cancelar. */
export function Confirm({ open, onClose, title, message, actions }: {
  open: boolean
  onClose: () => void
  title: string
  message?: string
  actions: Array<{ label: string; danger?: boolean; onSelect: () => void }>
}) {
  const reduced = useReducedMotion()
  const panel = useRef<HTMLDivElement>(null)
  const titleId = useId()
  useModal(open, panel)
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div className="sheet-layer is-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduced ? 0 : 0.15 }} onClick={onClose}>
          <motion.div
            className="confirm"
            ref={panel}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            initial={{ scale: reduced ? 1 : 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: reduced ? 1 : 0.96, opacity: 0 }}
            transition={{ duration: reduced ? 0 : 0.15 }}
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => { if (event.key === 'Escape') onClose() }}
          >
            <p id={titleId} className="confirm-title">{title}</p>
            {message && <p className="confirm-message">{message}</p>}
            <div className="confirm-actions">
              {actions.map((action) => (
                <button key={action.label} type="button" className={`button ${action.danger ? 'is-danger' : 'is-secondary'}`} onClick={action.onSelect}>{action.label}</button>
              ))}
              <button type="button" className="button is-secondary" onClick={onClose}>Cancelar</button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

/** Menu de opções que abre a partir de um botão. */
export function Menu<T extends string>({ value, options, onChange, label, children, placement = 'up' }: {
  value: T
  options: Array<{ value: T; label: string; icon: ReactNode }>
  onChange: (value: T) => void
  label: string
  children: ReactNode
  placement?: 'up' | 'down'
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
    <div className="menu-root" ref={root}>
      <button type="button" className="menu-trigger" aria-haspopup="menu" aria-expanded={open} aria-label={label} onPointerDown={(e) => e.preventDefault()} onClick={() => { haptic('light'); setOpen((v) => !v) }}>
        {children}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            className={`menu is-${placement}`}
            role="menu"
            aria-label={label}
            initial={{ opacity: 0, y: reduced ? 0 : placement === 'up' ? 4 : -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduced ? 0 : 0.12 }}
          >
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                role="menuitemradio"
                aria-checked={option.value === value}
                onPointerDown={(e) => e.preventDefault()}
                onClick={() => { onChange(option.value); setOpen(false) }}
              >
                <span className="menu-icon" aria-hidden>{option.icon}</span>
                <span className="menu-label">{option.label}</span>
                {option.value === value && <Icon name="check" size={16} className="menu-check" />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
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
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: reduced ? 0 : 0.18 }}
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

/** Rodapé fixo: avisos e "fulano está escrevendo" sobem a partir do campo. */
export function Dock({ children, toasts, above }: { children?: ReactNode; toasts?: ReactNode; above?: ReactNode }) {
  return (
    <div className="dock">
      <div className="toast-stack">
        <AnimatePresence>{toasts}</AnimatePresence>
        <AnimatePresence>{above}</AnimatePresence>
      </div>
      {children}
    </div>
  )
}

export function Typing({ person }: { person: string }) {
  return (
    <motion.p className="typing" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }} role="status">
      <Avatar person={person} size={18} />
      {person} está escrevendo<span className="typing-dots" aria-hidden><i /><i /><i /></span>
    </motion.p>
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
  chip?: ReactNode
  onFocus?: () => void
  inputRef?: React.RefObject<HTMLInputElement | null>
}

export function Composer({ value, onChange, onSubmit, canSubmit, placeholder, label, sendLabel = 'Adicionar', leading, chip, onFocus, inputRef }: ComposerProps) {
  const reduced = useReducedMotion()
  return (
    <form className="composer" onSubmit={(event) => { event.preventDefault(); if (canSubmit) onSubmit() }}>
      {leading}
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
          <motion.span key="chip" className="composer-chip" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduced ? 0 : 0.12 }}>
            {chip}
          </motion.span>
        )}
      </AnimatePresence>
      <button
        type="submit"
        className="composer-send"
        aria-label={sendLabel}
        disabled={!canSubmit}
        // o foco fica no campo: sem isso o teclado fecha a cada item no celular
        onPointerDown={(event) => event.preventDefault()}
      >
        <Icon name="up" size={16} />
      </button>
    </form>
  )
}

/* ─── Estados ─────────────────────────────────────────────────────────────── */

export function Empty({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="empty">
      <p className="empty-title">{title}</p>
      {hint && <p className="empty-hint">{hint}</p>}
    </div>
  )
}

export function Skeleton({ rows = 4 }: { rows?: number }) {
  return (
    <ul className="skeleton" aria-hidden>
      {Array.from({ length: rows }, (_, i) => (
        <li key={i}><span className="skeleton-box" /><span className="skeleton-line" style={{ width: `${[62, 48, 70, 54][i % 4]}%` }} /></li>
      ))}
    </ul>
  )
}

/** Confirmação discreta no meio da tela: lista toda pega, mês todo pago. */
export function Done({ show, label }: { show: boolean; label: string }) {
  const reduced = useReducedMotion()
  return (
    <AnimatePresence>
      {show && (
        <motion.div className="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduced ? 0 : 0.2 }} aria-live="polite">
          <motion.div className="done-card" initial={{ y: reduced ? 0 : 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduced ? 0 : 0.25 }}>
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
              <motion.path d="m5 12.6 4.6 4.6L19 7.6" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: reduced ? 1 : 0 }} animate={{ pathLength: 1 }} transition={{ duration: reduced ? 0 : 0.3, delay: 0.05 }} />
            </svg>
            <p>{label}</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
