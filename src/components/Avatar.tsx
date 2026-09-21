// Os avatares são os dois gatos: Bela joga o tomate, Lucas desvia.
// Trocar as imagens: substitua os arquivos e rode `node scripts/avatars.mjs <bela> <lucas>`.
const FILES: Record<string, { full: string; face: string }> = {
  Bela: { full: '/avatars/bela.webp', face: '/avatars/bela-face.webp' },
  Lucas: { full: '/avatars/lucas.webp', face: '/avatars/lucas-face.webp' },
}

interface Props {
  person: string
  size?: number
  variant?: 'face' | 'full'
}

export function Avatar({ person, size = 24, variant = 'face' }: Props) {
  const src = FILES[person]?.[variant]

  if (!src) {
    return (
      <span className="avatar avatar-letter" style={{ width: size, height: size }} aria-label={person}>
        {person.charAt(0)}
      </span>
    )
  }

  // a versão inteira não é recortada em círculo: o meme precisa do quadro todo
  return (
    <img
      className={variant === 'full' ? 'avatar avatar-full' : 'avatar'}
      src={src}
      width={size}
      height={size}
      alt={person}
      draggable={false}
    />
  )
}

// Uma baleia reduzida ao contorno: a marca continua reconhecível até em 18px.
export function Mark({ size = 20 }: { size?: number }) {
  return (
    <svg className="brand-mark" width={size} height={size} viewBox="0 0 64 64" aria-hidden fill="none" stroke="currentColor" strokeWidth="4.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 34.5C8 20 18.6 11 33 11c12.2 0 21.2 7.1 22.8 19.4.5 3.6-.6 7.3-3.4 9.8-3.8 3.5-9.8 5.2-18.8 5.2H16.2C10.8 45.4 8 41.5 8 34.5Z" />
      <path d="M52.5 39.8c2.8 1.2 6.5.2 8-2.7.7 6.8-3 11.9-9.8 12.7" />
      <circle cx="24" cy="29" r="2.2" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function Mascot({ size = 120, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      className={`brand-mascot ${className}`.trim()}
      width={size}
      height={Math.round(size * .68)}
      viewBox="0 0 150 102"
      role="img"
      aria-label="Baleia da Despensa"
      fill="none"
      stroke="currentColor"
      strokeWidth="5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 60C18 31.4 37.6 15 67.5 15c25.2 0 44.2 13.2 48.7 36.8 1.2 6.5-.2 13.1-4.8 18.2-6.3 7.1-18.2 10.8-36.1 10.8H36.6C24.4 80.8 18 73.6 18 60Z" />
      <path d="M111 70.2c6.7 2.8 15.3.4 18.9-6.3 1.7 14.8-6.9 25.1-22.3 26.2" />
      <circle cx="49" cy="53" r="3.4" fill="currentColor" stroke="none" />
      <path className="brand-spout" d="M65 8.5C62.5 3.5 58 1.8 54.8 2M69 8.5c2.5-5 7-6.7 10.2-6.5" />
    </svg>
  )
}

// Tomate do easter egg (quem diria que ia ter um tomate no design system).
export function Tomato({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden>
      <circle cx="20" cy="23" r="14.5" fill="#E33B2E" />
      <g fill="#3F8F4A">
        <path d="M20 12.5 8.8 7.2c-.7-.3-1.4.5-1 1.2l4.6 6.6c.5.7 1.5.4 1.7-.4l.6-2.1Z" />
        <path d="M20 12.5 31.2 7.2c.7-.3 1.4.5 1 1.2l-4.6 6.6c-.5.7-1.5.4-1.7-.4l-.6-2.1Z" />
        <path d="M20 13.5c-1.9 0-3.4-1-4.2-2.6-.3-.7.4-1.4 1.1-1.1 1 .4 2 .6 3.1.6s2.1-.2 3.1-.6c.7-.3 1.4.4 1.1 1.1-.8 1.6-2.3 2.6-4.2 2.6Z" />
        <rect x="18.8" y="5.6" width="2.4" height="6" rx="1.2" />
      </g>
      <ellipse cx="14.6" cy="18.5" rx="3.1" ry="2.1" fill="#fff" opacity=".28" transform="rotate(-24 14.6 18.5)" />
    </svg>
  )
}
