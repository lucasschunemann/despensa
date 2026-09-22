import { useEffect, useState } from 'react'
import { lightFor, type Light } from '../lib/atmosphere'

/**
 * A luz da casa, por cima de tudo e sem pegar toque.
 *
 * Só escurece, nunca clareia: a sombra dos caixilhos de uma janela cai sobre o papel e o
 * texto preto continua preto (clarear lavaria a tinta). Some com `prefers-reduced-transparency`.
 * Em desenvolvimento, `?hora=7` mostra a luz das 7h.
 */
export function Atmosphere() {
  const [light, setLight] = useState<Light>(() => lightFor(now()))

  useEffect(() => {
    const refresh = () => setLight(lightFor(now()))
    const timer = window.setInterval(refresh, 5 * 60_000)
    document.addEventListener('visibilitychange', refresh)
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', refresh) }
  }, [])

  return (
    <div className={`atmosphere is-${light.kind}`} aria-hidden>
      {light.kind === 'dia' && (
        <div
          className="atmosphere-window"
          style={{
            left: `${light.x}%`,
            opacity: light.strength,
            transform: `translate(-50%, -50%) rotate(${light.rotate}deg) skewX(${light.skew}deg)`,
          }}
        >
          <span className="atmosphere-leaves" />
        </div>
      )}
      <div className="atmosphere-grain" />
    </div>
  )
}

function now(): Date {
  const forced = import.meta.env.DEV ? new URLSearchParams(location.search).get('hora') : null
  if (forced === null) return new Date()
  const date = new Date()
  date.setHours(Number(forced), 0, 0, 0)
  return date
}
