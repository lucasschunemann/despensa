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

// Marca "d": anel e haste na mesma grade do ícone do app.
export function Mark({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden fill="currentColor">
      <path
        fillRule="evenodd"
        d="M25 25.5a14.5 14.5 0 1 0 0 29 14.5 14.5 0 0 0 0-29Zm0 6.75a7.75 7.75 0 1 1 0 15.5 7.75 7.75 0 0 1 0-15.5Z"
      />
      <rect x="32.75" y="10" width="6.75" height="44.5" />
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
