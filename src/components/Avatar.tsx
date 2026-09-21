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

// O pote é o guardião da despensa: uma marca própria que continua legível em 20px.
export function Mark({ size = 20 }: { size?: number }) {
  return (
    <svg className="brand-mark" width={size} height={size} viewBox="0 0 64 64" aria-hidden fill="none" stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 19C11.5 15 10 7.5 11 4c7.5.7 12.2 5.5 13.3 12.5M45 19c7.5-4 9-11.5 8-15-7.5.7-12.2 5.5-13.3 12.5" />
      <path d="M15 22c2.8-5.8 8.7-8.5 17-8.5S46.2 16.2 49 22" />
      <path d="M14.5 25h35L48 48.5c-.4 6.4-5.7 11.5-12.2 11.5h-7.6C21.7 60 16.4 54.9 16 48.5Z" />
      <path d="M18 31.5c8.6 2 19.4 2 28 0" opacity=".45" />
      <circle cx="26" cy="43" r="1.9" fill="currentColor" stroke="none" />
      <circle cx="38" cy="43" r="1.9" fill="currentColor" stroke="none" />
      <path d="M29 49c2 1.7 4 1.7 6 0" />
    </svg>
  )
}

export function Mascot({ size = 120, className = '' }: { size?: number; className?: string }) {
  return <img className={`brand-mascot ${className}`.trim()} src="/brand/pote.png" width={size} height={size} alt="Pote, o guardião da despensa" draggable={false} />
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
