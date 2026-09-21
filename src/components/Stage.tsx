import { animate, motion, useMotionValue, useMotionValueEvent, useReducedMotion, useTransform } from 'motion/react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { haptic } from '../lib/haptics'
import { sound } from '../lib/sound'

// restDelta/restSpeed: a mola dá a tela por assentada a menos de 1px, em vez de ficar ~1s ajustando
const SPRING = { type: 'spring' as const, stiffness: 380, damping: 40, mass: 0.9, restDelta: 0.5, restSpeed: 8 }

/**
 * Navegação do iPhone. O início fica sempre montado por baixo; o módulo desliza por cima.
 * Os dois dividem o mesmo deslocamento: enquanto o módulo sai para a direita (tocando em voltar
 * ou arrastando da borda esquerda), o início volta do recuo junto, no mesmo ritmo do dedo.
 */
export function Stage({
  view,
  home,
  renderHome,
  renderModule,
  onBack,
  dock,
}: {
  view: string
  home: string
  renderHome: () => ReactNode
  renderModule: (view: string) => ReactNode
  onBack: () => void
  dock?: ReactNode
}) {
  const reduced = useReducedMotion()
  const width = () => window.innerWidth
  const [visible, setVisible] = useState<string | null>(view !== home ? view : null)
  const x = useMotionValue(view !== home ? 0 : width())
  const homeX = useTransform(x, (v) => -width() * 0.28 * (1 - v / width()))
  const homeOpacity = useTransform(x, (v) => 0.72 + 0.28 * (v / width()))
  const [covered, setCovered] = useState(view !== home)
  const crossed = useRef(false)
  const transition = reduced ? { duration: 0 } : SPRING

  // com o módulo parado por cima, o início não precisa ficar animando escondido
  useMotionValueEvent(x, 'change', (v) => {
    const next = v < 1
    if (next !== covered) setCovered(next)
  })

  useEffect(() => {
    if (view !== home) {
      if (visible === null) {
        sound.open()
        x.set(width())
        setVisible(view)
        animate(x, 0, transition)
      } else {
        // de um módulo direto para outro (pelo menu): troca sem deslizar
        setVisible(view)
      }
      return
    }
    if (visible !== null) {
      sound.close()
      void animate(x, width(), transition).then(() => setVisible(null))
    }
    // só reage à troca de tela
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view])

  return (
    <div className="stage">
      <motion.div
        className="view is-home"
        style={{ x: homeX, opacity: homeOpacity, visibility: covered ? 'hidden' : 'visible' }}
        aria-hidden={visible !== null}
        inert={visible !== null}
      >
        {renderHome()}
      </motion.div>

      {visible !== null && (
        <motion.div key="top" className="view is-top" style={{ x }}>
          <motion.div key={visible} className="module-surface" initial={reduced ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }}>
            {renderModule(visible)}
          </motion.div>
          {!reduced && (
            <motion.div
              className="edge-back"
              onPan={(_, info) => {
                const next = Math.max(0, info.offset.x)
                x.set(next)
                const past = next > width() * 0.3
                if (past !== crossed.current) {
                  crossed.current = past
                  if (past) haptic('light')
                }
              }}
              onPanEnd={(_, info) => {
                crossed.current = false
                if (info.offset.x > width() * 0.3 || info.velocity.x > 500) onBack()
                else animate(x, 0, SPRING)
              }}
            />
          )}
        </motion.div>
      )}
      {dock}
    </div>
  )
}
