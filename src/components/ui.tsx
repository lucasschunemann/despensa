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
import { Avatar } from './Avatar'
import { SyncBadge } from './SyncBadge'

/* ─── Contexto do app ─────────────────────────────────────────────────────── */

export interface ShellValue {
  me: string
  presence: Presence
  openSettings: () => void
}
export const Shell = createContext<ShellValue | null>(null)

/* ─── Ícones ──────────────────────────────────────────────────────────────── */

const ICONS = {
  home: <path d="M4 11 12 4l8 7v8.5a.5.5 0 0 1-.5.5H15v-5.5H9V20H4.5a.5.5 0 0 1-.5-.5Z" />,
  basket: (
    <>
      <path d="M3.5 9h17l-1.6 10.2a1.5 1.5 0 0 1-1.5 1.3H6.6a1.5 1.5 0 0 1-1.5-1.3Z" />
      <path d="M8 9a4 4 0 0 1 8 0" />
    </>
  ),
  receipt: (
    <>
      <path d="M6 3.5h12V21l-3-2-3 2-3-2-3 2Z" />
      <path d="M9 8.5h6M9 12.5h6" />
    </>
  ),
  heart: <path d="M12 20.2 4.8 13a4.6 4.6 0 0 1 6.5-6.5l.7.7.7-.7A4.6 4.6 0 0 1 19.2 13Z" />,
  plus: <path d="M12 5v14M5 12h14" />,
  close: <path d="m6.5 6.5 11 11m0-11-11 11" />,
  right: <path d="m9.5 5 7 7-7 7" />,
  left: <path d="m14.5 5-7 7 7 7" />,
  down: <path d="m6 9.5 6 6 6-6" />,
  check: <path d="m5.5 12.5 4.5 4.5 8.5-9.5" />,
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="6" />
      <path d="m15 15 5 5" />
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
  folder: <path d="M3.5 7.5a2 2 0 0 1 2-2h4l2 2.5h7a2 2 0 0 1 2 2v7.5a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2Z" />,
  trash: <path d="M5 7h14M10 7V4.5h4V7M7 7l.8 12.5h8.4L17 7" />,
  camera: (
    <>
      <path d="M4 8.5h3l1.3-2h7.4l1.3 2h3v10H4Z" />
      <circle cx="12" cy="13.5" r="3.2" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="10" width="14" height="10" rx="3" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </>
  ),
  sound: (
    <>
      <path d="M11 5 6.5 9H3v6h3.5L11 19Z" />
      <path d="M15.5 9.5a3.5 3.5 0 0 1 0 5M18.5 7a7 7 0 0 1 0 10" />
    </>
  ),
  moon: <path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5 8.6 8.6 0 1 0 20.5 14.2Z" />,
  play: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m10 8 6 4-6 4Z" />
    </>
  ),
  logout: <path d="M10 5H5v14h5M14 8l4 4-4 4M9 12h9" />,
  bell: (
    <>
      <path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 1.5h-15Z" />
      <path d="M10 20.5a2 2 0 0 0 4 0" />
    </>
  ),
  cart: <path d="M3 4h2.5l2.6 11h9.8L20 8H7M9.5 19.5h.01M16.5 19.5h.01" />,
  more: (
    <>
      <circle cx="5.5" cy="12" r="1.2" />
      <circle cx="12" cy="12" r="1.2" />
      <circle cx="18.5" cy="12" r="1.2" />
    </>
  ),
  edit: <path d="M5 19.5h3.5L19 9l-3.5-3.5L5 16Z" />,
} satisfies Record<string, ReactNode>

export type IconName = keyof typeof ICONS

export function Icon({ name, size = 22, className = '' }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg className={`icon ${className}`.trim()} width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      {ICONS[name]}
    </svg>
  )
}

/* ─── Tela: barra de navegação + título grande ────────────────────────────── */

interface ScreenProps {
  title: string
  subtitle?: ReactNode
  children: ReactNode
  /** composer e avisos presos embaixo */
  footer?: ReactNode
  scrollRef?: React.RefObject<HTMLDivElement | null>
  onScroll?: (element: HTMLDivElement) => void
  /** ação extra ao lado do avatar (ex.: buscar) */
  trailing?: ReactNode
  className?: string
}

export function Screen({ title, subtitle, children, footer, scrollRef, onScroll, trailing, className = '' }: ScreenProps) {
  const shell = useContext(Shell)
  const [scrolled, setScrolled] = useState(false)

  return (
    <section className={`screen ${className}`.trim()}>
      <header className={`navbar${scrolled ? ' is-scrolled' : ''}`}>
        <span className="navbar-title" aria-hidden>{title}</span>
        <div className="navbar-actions">
          <SyncBadge />
          {shell?.presence.online.map((person) => (
            <span className="presence" key={person} title={`${person} está com o app aberto`}>
              <Avatar person={person} size={26} />
            </span>
          ))}
          {trailing}
          {shell && (
            <button className="navbar-me" onClick={shell.openSettings} aria-label="Abrir configurações">
              <Avatar person={shell.me} size={30} />
            </button>
          )}
        </div>
      </header>
      <div
        className="scroll"
        ref={scrollRef}
        onScroll={(event) => {
          const el = event.currentTarget
          setScrolled(el.scrollTop > 36)
          onScroll?.(el)
        }}
      >
        <div className="screen-head">
          <h1>{title}</h1>
          {subtitle && <p className="screen-sub">{subtitle}</p>}
        </div>
        {children}
      </div>
      {footer}
    </section>
  )
}

/* ─── Listas agrupadas ────────────────────────────────────────────────────── */

export function Group({ title, footer, children, className = '' }: { title?: ReactNode; footer?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`group ${className}`.trim()}>
      {title && <h2 className="group-title">{title}</h2>}
      <div className="group-body">{children}</div>
      {footer && <p className="group-footer">{footer}</p>}
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
  onClick?: () => void
  disabled?: boolean
  ariaLabel?: string
  children?: ReactNode
}

/** Linha de lista agrupada: ícone, título, valor à direita e seta quando abre algo. */
export function Row({ icon, title, detail, value, chevron, danger, onClick, disabled, ariaLabel, children }: RowProps) {
  const body = (
    <>
      {icon && <span className="row-icon">{icon}</span>}
      <span className="row-text">
        <span className="row-title">{title}</span>
        {detail && <span className="row-detail">{detail}</span>}
      </span>
      {value !== undefined && <span className="row-value">{value}</span>}
      {children}
      {chevron && <Icon name="right" size={16} className="row-chevron" />}
    </>
  )
  const cls = `row${danger ? ' is-danger' : ''}`
  if (!onClick) return <div className={cls}>{body}</div>
  return <button type="button" className={cls} onClick={onClick} disabled={disabled} aria-label={ariaLabel}>{body}</button>
}

/* ─── Marcar: o círculo de Lembretes ──────────────────────────────────────── */

export function Check({ checked, onClick, label, size = 28 }: { checked: boolean; onClick: () => void; label: string; size?: number }) {
  const reduced = useReducedMotion()
  return (
    <button type="button" role="checkbox" aria-checked={checked} aria-label={label} className={`check${checked ? ' is-on' : ''}`} onClick={onClick}>
      <svg width={size} height={size} viewBox="0 0 28 28" aria-hidden>
        <circle className="check-ring" cx="14" cy="14" r="12.25" />
        <motion.circle
          className="check-fill"
          cx="14"
          cy="14"
          r="12.25"
          initial={false}
          animate={{ scale: checked ? 1 : 0.3, opacity: checked ? 1 : 0 }}
          transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 620, damping: 26 }}
        />
        <motion.path
          className="check-mark"
          d="M8.6 14.4 12.4 18.2 19.6 10.2"
          initial={false}
          animate={{ pathLength: checked ? 1 : 0, opacity: checked ? 1 : 0 }}
          transition={{ duration: reduced ? 0 : 0.2 }}
        />
      </svg>
    </button>
  )
}

/* ─── Linha com gesto: direita faz a ação principal, esquerda apaga ───────── */

const REVEAL = 88
const OPEN_AT = 44
const TRIGGER = 72

let openRow: (() => void) | null = null

interface SwipeRowProps {
  children: ReactNode
  /** nome do que a direita faz: pegar, pagar, realizar */
  lead?: { label: string; onTrigger: () => void }
  onRemove?: () => void
  onPress?: () => void
  disabled?: boolean
  className?: string
}

export function SwipeRow({ children, lead, onRemove, onPress, disabled = false, className = '' }: SwipeRowProps) {
  const reduced = useReducedMotion()
  const x = useMotionValue(0)
  const dragged = useRef(false)
  const crossed = useRef(false)
  const opened = useRef(false)
  const spring = reduced ? { duration: 0.1 } : { type: 'spring' as const, stiffness: 420, damping: 36, mass: 0.8 }
  const leadOpacity = useTransform(x, [0, TRIGGER * 0.5, TRIGGER], [0, 0.4, 1])
  const trailOpacity = useTransform(x, [-REVEAL, -12, 0], [1, 0, 0])

  const close = () => {
    if (!opened.current) return
    opened.current = false
    animate(x, 0, spring)
    if (openRow === close) openRow = null
  }

  useEffect(() => () => { if (openRow === close) openRow = null })
  // tocar fora de uma linha aberta fecha
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

  return (
    <motion.li
      layout={reduced ? false : 'position'}
      className={`swipe ${className}`.trim()}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0, transition: { duration: 0.22, ease: [0.4, 0, 0.2, 1] } }}
      transition={spring}
    >
      {lead && <motion.span className="swipe-lead" style={{ opacity: leadOpacity }} aria-hidden>{lead.label}</motion.span>}
      {onRemove && (
        <motion.button
          type="button"
          className="swipe-trail"
          style={{ opacity: trailOpacity }}
          onClick={() => { close(); onRemove() }}
          tabIndex={-1}
          aria-label="apagar"
        >
          <Icon name="trash" size={20} />
          apagar
        </motion.button>
      )}
      <motion.div
        className="swipe-face"
        style={{ x }}
        drag={disabled ? false : 'x'}
        dragDirectionLock
        dragConstraints={{ left: onRemove ? -REVEAL : 0, right: lead ? 104 : 0 }}
        dragElastic={{ left: 0.04, right: 0.12 }}
        dragMomentum={false}
        onPointerDown={() => { dragged.current = false }}
        onDragStart={() => { dragged.current = true }}
        onDrag={(_, info) => {
          const past = info.offset.x > TRIGGER
          if (past !== crossed.current) {
            crossed.current = past
            if (past) haptic('light')
          }
        }}
        onDragEnd={(_, info) => {
          crossed.current = false
          if (lead && info.offset.x > TRIGGER) {
            animate(x, 0, spring)
            lead.onTrigger()
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

/* ─── Folha (sheet) ───────────────────────────────────────────────────────── */

export function Sheet({ open, onClose, title, children, onClosed }: { open: boolean; onClose: () => void; title: string; children: ReactNode; onClosed?: () => void }) {
  const reduced = useReducedMotion()
  const panel = useRef<HTMLDivElement>(null)
  const controls = useDragControls()
  const titleId = useId()

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
  }, [open])

  return createPortal(
    <AnimatePresence onExitComplete={onClosed}>
      {open && (
        <motion.div
          className="sheet-layer"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduced ? 0 : 0.22 }}
          onClick={onClose}
        >
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
            transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 400, damping: 40 }}
            drag={reduced ? false : 'y'}
            dragControls={controls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.5 }}
            onDragEnd={(_, info) => { if (info.offset.y > 100 || info.velocity.y > 600) onClose() }}
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => {
              if (event.key === 'Escape') onClose()
              if (event.key !== 'Tab') return
              const nodes = Array.from(panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select, textarea, [href], [tabindex="0"]') ?? [])
              const first = nodes[0]
              const last = nodes[nodes.length - 1]
              if (event.shiftKey && (document.activeElement === first || document.activeElement === panel.current)) { event.preventDefault(); last?.focus() }
              else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
            }}
          >
            <div className="sheet-head" onPointerDown={(event) => controls.start(event)}>
              <span className="sheet-grab" aria-hidden />
              <h2 id={titleId}>{title}</h2>
              <button type="button" className="icon-button" onClick={onClose} aria-label="Fechar" onPointerDown={(event) => event.stopPropagation()}>
                <Icon name="close" size={18} />
              </button>
            </div>
            <div className="sheet-body">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
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
            {active && <motion.span layoutId={`seg-${id}`} className="segmented-thumb" transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 520, damping: 42 }} />}
            <span>{option.label}</span>
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

/* ─── Aviso temporário com "desfazer" ─────────────────────────────────────── */

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
      initial={{ opacity: 0, y: 14, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 14, scale: 0.97 }}
      transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 520, damping: 38 }}
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

/** Fica entre o conteúdo e o composer: os avisos sobem a partir daqui. */
export function Dock({ children, toasts }: { children?: ReactNode; toasts?: ReactNode }) {
  return (
    <div className="dock">
      <div className="toast-stack"><AnimatePresence>{toasts}</AnimatePresence></div>
      {children}
    </div>
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
      <div className="composer-field">
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
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 640, damping: 32 }}
              // o foco fica no campo: sem isso o teclado fecha a cada item no celular
              onPointerDown={(event) => event.preventDefault()}
            >
              <Icon name="up" size={18} />
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </form>
  )
}

/* ─── Estados vazios e carregando ─────────────────────────────────────────── */

export function Empty({ title, hint }: { title: string; hint?: string }) {
  return (
    <motion.div className="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <p className="empty-title">{title}</p>
      {hint && <p className="empty-hint">{hint}</p>}
    </motion.div>
  )
}

export function Skeleton({ rows = 4 }: { rows?: number }) {
  return (
    <ul className="skeleton" aria-hidden>
      {Array.from({ length: rows }, (_, i) => (
        <li key={i}>
          <span className="skeleton-tile" />
          <span className="skeleton-lines">
            <span style={{ width: `${[62, 48, 70, 54][i % 4]}%` }} />
            <span className="is-short" />
          </span>
        </li>
      ))}
    </ul>
  )
}

/** Confirmação rápida no centro da tela: lista toda pega, mês todo pago. */
export function Done({ show, label }: { show: boolean; label: string }) {
  const reduced = useReducedMotion()
  return (
    <AnimatePresence>
      {show && (
        <motion.div className="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduced ? 0 : 0.2 }} aria-live="polite">
          <motion.div className="done-card" initial={{ scale: reduced ? 1 : 0.92 }} animate={{ scale: 1 }} exit={{ scale: reduced ? 1 : 0.96, opacity: 0 }} transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 32 }}>
            <svg viewBox="0 0 48 48" width="44" height="44" aria-hidden>
              <motion.path d="M13 25.5 21 33.5 36 15" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: reduced ? 1 : 0 }} animate={{ pathLength: 1 }} transition={{ duration: reduced ? 0 : 0.35, delay: 0.1 }} />
            </svg>
            <p>{label}</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
