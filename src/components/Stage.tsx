import { AnimatePresence, animate, motion, useMotionValue, useMotionValueEvent, useReducedMotion, useTransform, type MotionValue } from 'motion/react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { haptic } from '../lib/haptics'
import { sound } from '../lib/sound'

// restDelta/restSpeed: a mola dá a tela por assentada a menos de 1px, em vez de ficar ~1s ajustando
const SPRING = { type: 'spring' as const, stiffness: 380, damping: 40, mass: 0.9, restDelta: 0.5, restSpeed: 8 }
// o zoom trabalha de 0 a 1, então a mola precisa de outra régua de repouso
const ZOOM = { type: 'spring' as const, stiffness: 190, damping: 27, mass: 1, restDelta: 0.001, restSpeed: 0.01 }
// ordem das abas: é ela que diz de que lado o módulo novo entra
const ORDER = ['inicio', 'lista', 'contas', 'desejos']

/**
 * De onde o próximo módulo nasce. Quem abre a partir de um elemento da tela (as linhas do
 * início) registra o retângulo dele antes de trocar de tela; o Stage consome uma vez só.
 */
let pendingOrigin: DOMRect | null = null
export function zoomFrom(element: Element | null) {
  pendingOrigin = element?.getBoundingClientRect() ?? null
}

type Mode = 'push' | 'zoom'

/** Altura da área do relógio, para o cartão recuado parar logo abaixo dela, como no iOS. */
let measuredTop: number | null = null
function safeTop(): number {
  if (measuredTop !== null) return measuredTop
  const probe = document.createElement('div')
  probe.style.cssText = 'position:fixed;top:0;height:env(safe-area-inset-top,0px);visibility:hidden'
  document.body.appendChild(probe)
  measuredTop = probe.offsetHeight
  probe.remove()
  return measuredTop
}

/**
 * Navegação do iPhone. O início fica sempre montado por baixo; o módulo vem por cima de
 * um de dois jeitos, como no iOS:
 *
 * - **zoom** (iOS 18), quando nasce de um elemento: a linha tocada cresce até virar a tela
 *   e, ao voltar, a tela encolhe de volta para a linha — inclusive seguindo o dedo;
 * - **empurrar**, quando vem da barra ou do menu: desliza da direita e o início recua junto,
 *   no mesmo ritmo do dedo quando se arrasta da borda.
 *
 * Entre dois módulos, o novo entra do lado da aba dele. Com uma folha aberta (`receded`), o app
 * inteiro recua como um cartão, que é o que as folhas do iOS fazem com a tela de baixo.
 */
export function Stage({
  view,
  home,
  renderHome,
  renderModule,
  onBack,
  dock,
  receded = false,
}: {
  view: string
  home: string
  renderHome: () => ReactNode
  renderModule: (view: string) => ReactNode
  onBack: () => void
  dock?: ReactNode
  receded?: boolean
}) {
  const reduced = useReducedMotion()
  const width = () => window.innerWidth
  const [visible, setVisible] = useState<string | null>(view !== home ? view : null)
  const [mode, setMode] = useState<Mode>('push')
  const [origin, setOrigin] = useState<DOMRect | null>(null)
  const [direction, setDirection] = useState(1)
  const previous = useRef(view)
  const release = useRef(0)
  const crossed = useRef(false)

  // empurrar: x vai da largura da tela (fora) a 0 (no lugar)
  const x = useMotionValue(view !== home ? 0 : width())
  // zoom: z vai de 0 (do tamanho da linha) a 1 (tela inteira); drag é o dedo arrastando
  const z = useMotionValue(view !== home ? 1 : 0)
  const drag = useMotionValue(0)
  const [covered, setCovered] = useState(view !== home)

  const pushHomeX = useTransform(x, (v) => -width() * 0.28 * (1 - v / width()))
  const pushHomeOpacity = useTransform(x, (v) => 0.72 + 0.28 * (v / width()))
  const zoomHomeOpacity = useTransform(z, (v) => 1 - 0.3 * v)
  const zoomHomeScale = useTransform(z, (v) => 1 - 0.04 * v)

  const settle = (next: boolean) => { if (next !== covered) setCovered(next) }
  // com o módulo parado por cima, o início não precisa ficar animando escondido
  useMotionValueEvent(x, 'change', (v) => { if (mode === 'push') settle(v < 1) })
  useMotionValueEvent(z, 'change', (v) => { if (mode === 'zoom') settle(v > 0.999) })

  useEffect(() => {
    const from = previous.current
    previous.current = view
    const velocity = release.current
    release.current = 0

    if (view !== home) {
      if (visible === null) {
        sound.open()
        const rect = pendingOrigin
        pendingOrigin = null
        setVisible(view)
        if (rect && !reduced) {
          setMode('zoom'); setOrigin(rect)
          x.set(0); drag.set(0); z.set(0)
          // a camada do zoom só existe no próximo quadro; começar antes queimava o começo da mola
          requestAnimationFrame(() => requestAnimationFrame(() => animate(z, 1, ZOOM)))
        } else {
          setMode('push'); setOrigin(null)
          x.set(width())
          animate(x, 0, reduced ? { duration: 0 } : SPRING)
        }
      } else {
        // de um módulo para outro (barra ou menu): entra do lado da aba
        setDirection(ORDER.indexOf(view) >= ORDER.indexOf(from) ? 1 : -1)
        setVisible(view)
      }
      return
    }
    if (visible !== null) {
      sound.close()
      pendingOrigin = null
      const done = () => setVisible(null)
      if (reduced) { x.set(width()); z.set(0); done(); return }
      if (mode === 'zoom') {
        animate(drag, 0, ZOOM)
        void animate(z, 0, { ...ZOOM, velocity }).then(done)
      } else {
        void animate(x, width(), { ...SPRING, velocity }).then(done)
      }
    }
    // só reage à troca de tela
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view])

  const recede = reduced ? { duration: 0 } : { type: 'spring' as const, stiffness: 340, damping: 36 }

  return (
    <div className={`stage${receded ? ' is-receded' : ''}`}>
      <motion.div
        className="stage-card"
        animate={receded ? { scale: 0.92, y: safeTop() + 10, borderRadius: 18 } : { scale: 1, y: 0, borderRadius: 0 }}
        transition={recede}
      >
        <motion.div
          className="view is-home"
          style={mode === 'zoom'
            ? { opacity: zoomHomeOpacity, scale: zoomHomeScale, visibility: covered ? 'hidden' : 'visible' }
            : { x: pushHomeX, opacity: pushHomeOpacity, visibility: covered ? 'hidden' : 'visible' }}
          aria-hidden={visible !== null}
          inert={visible !== null}
        >
          {renderHome()}
        </motion.div>

        {visible !== null && (
          mode === 'zoom' && origin
            ? <ZoomLayer z={z} drag={drag} origin={origin}>{modules()}{edge()}</ZoomLayer>
            : <motion.div key="top" className="view is-top" style={{ x }}>{modules()}{edge()}</motion.div>
        )}
        {dock}
      </motion.div>
    </div>
  )

  function modules() {
    return (
      <AnimatePresence initial={false} custom={direction}>
        <motion.div
          key={visible}
          className="module-surface"
          custom={direction}
          variants={{
            enter: (dir: number) => ({ x: reduced ? 0 : dir * 56, opacity: 0 }),
            center: { x: 0, opacity: 1 },
            exit: (dir: number) => ({ x: reduced ? 0 : dir * -36, opacity: 0 }),
          }}
          initial="enter"
          animate="center"
          exit="exit"
          transition={reduced ? { duration: 0 } : { x: { type: 'spring', stiffness: 420, damping: 40 }, opacity: { duration: 0.2 } }}
        >
          {renderModule(visible!)}
        </motion.div>
      </AnimatePresence>
    )
  }

  function edge() {
    if (reduced) return null
    return (
      <motion.div
        className="edge-back"
        onPan={(_, info) => {
          const offset = Math.max(0, info.offset.x)
          if (mode === 'zoom') {
            // o zoom encolhe seguindo o dedo, e a tela vai junto um pouco
            z.set(Math.max(0.35, 1 - offset / (width() * 1.1)))
            drag.set(offset * 0.45)
          } else x.set(offset)
          const past = offset > width() * 0.3
          if (past !== crossed.current) {
            crossed.current = past
            if (past) haptic('light')
          }
        }}
        onPanEnd={(_, info) => {
          crossed.current = false
          if (info.offset.x > width() * 0.3 || info.velocity.x > 500) {
            // a mola de saída herda a velocidade do dedo, em vez de recomeçar do zero
            release.current = mode === 'zoom' ? -info.velocity.x / width() : info.velocity.x
            onBack()
          } else if (mode === 'zoom') {
            animate(z, 1, ZOOM); animate(drag, 0, ZOOM)
          } else animate(x, 0, SPRING)
        }}
      />
    )
  }
}

/**
 * A camada do zoom. O recorte vai do retângulo da linha tocada à tela inteira, com o canto
 * arredondando no caminho; o conteúdo cresce junto, a partir do centro da linha, e só aparece
 * quando já há tela para ele — antes disso, o que se vê é a própria linha virando cartão.
 */
function ZoomLayer({ z, drag, origin, children }: { z: MotionValue<number>; drag: MotionValue<number>; origin: DOMRect; children: ReactNode }) {
  const W = window.innerWidth
  const H = window.innerHeight
  const clipPath = useTransform([z, drag], ([v, d]: number[]) => {
    const k = 1 - v
    const radius = 18 * k + (d > 0 ? Math.min(34, d / 3) : 0)
    return `inset(${origin.top * k}px ${(W - origin.right) * k}px ${(H - origin.bottom) * k}px ${origin.left * k}px round ${radius}px)`
  })
  const contentScale = useTransform(z, [0, 1], [0.86, 1])
  const contentOpacity = useTransform(z, [0.12, 0.55], [0, 1])
  // nos últimos instantes da volta o cartão se dissolve na própria linha, em vez de tampá-la
  const layerOpacity = useTransform(z, [0, 0.07], [0, 1])
  const originX = `${origin.left + origin.width / 2}px`
  const originY = `${origin.top + origin.height / 2}px`

  return (
    <motion.div className="view is-top is-zoom" style={{ clipPath, WebkitClipPath: clipPath, x: drag, opacity: layerOpacity }}>
      <motion.div className="zoom-content" style={{ scale: contentScale, opacity: contentOpacity, transformOrigin: `${originX} ${originY}` }}>
        {children}
      </motion.div>
    </motion.div>
  )
}
