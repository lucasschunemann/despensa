import { motion, useReducedMotion } from 'motion/react'

// Névoa clara que se move devagar atrás dos desejos. São gradientes, não blur: leve no celular.
const BLOBS = [
  { className: 'blob blob-a', x: [0, 40, -10, 0], y: [0, 30, 60, 0], duration: 26 },
  { className: 'blob blob-b', x: [0, -50, 10, 0], y: [0, 40, -20, 0], duration: 31 },
  { className: 'blob blob-c', x: [0, 30, -40, 0], y: [0, -30, 20, 0], duration: 36 },
]

export function Ether() {
  const reduced = useReducedMotion()
  return (
    <div className="ether" aria-hidden>
      {BLOBS.map((blob) => (
        <motion.span
          key={blob.className}
          className={blob.className}
          animate={reduced ? undefined : { x: blob.x, y: blob.y }}
          transition={{ duration: blob.duration, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
    </div>
  )
}

const SPARKS = [
  { x: -30, delay: 0, size: 5 },
  { x: -8, delay: 0.08, size: 7 },
  { x: 16, delay: 0.03, size: 4 },
  { x: 34, delay: 0.12, size: 6 },
  { x: 2, delay: 0.18, size: 3 },
  { x: -20, delay: 0.22, size: 4 },
]

/** Pontinhos de luz subindo: o desejo realizado vira brilho. */
export function Sparks() {
  return (
    <span className="sparks" aria-hidden>
      {SPARKS.map((s, i) => (
        <motion.i
          key={i}
          style={{ width: s.size, height: s.size }}
          initial={{ x: s.x, y: 0, opacity: 0, scale: 0.4 }}
          animate={{ y: -110 - i * 8, opacity: [0, 1, 0], scale: 1 }}
          transition={{ duration: 0.9, delay: s.delay, ease: 'easeOut' }}
        />
      ))}
    </span>
  )
}

/** Corações pequenos subindo do botão quando alguém passa a querer. */
export function Hearts() {
  return (
    <span className="hearts-burst" aria-hidden>
      {[-14, 0, 13].map((x, i) => (
        <motion.svg
          key={i}
          viewBox="0 0 24 24"
          initial={{ x, y: 0, opacity: 0, scale: 0.5 }}
          animate={{ y: -38 - i * 6, x: x * 1.6, opacity: [0, 1, 0], scale: 1, rotate: x }}
          transition={{ duration: 0.8, delay: i * 0.07, ease: 'easeOut' }}
        >
          <path d="M12 20.4 4.6 13a4.7 4.7 0 0 1 6.6-6.7l.8.8.8-.8A4.7 4.7 0 0 1 19.4 13Z" />
        </motion.svg>
      ))}
    </span>
  )
}
