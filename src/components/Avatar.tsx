// Avatares: o único lugar do app onde cabe algo lúdico. Traço chapado, poucas cores,
// no espírito de um selo japonês — para não brigar com o resto, que é tipografia e branco.
interface Props {
  person: string
  size?: number
}

export function Avatar({ person, size = 24 }: Props) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 64 64',
    role: 'img' as const,
    'aria-label': person,
  }

  if (person === 'Bela') {
    return (
      <svg {...common}>
        {/* ovo cozido de cabelo rosa */}
        <ellipse cx="32" cy="35" rx="19" ry="23" fill="#F6F2EA" />
        <path
          d="M13 32c0-12 8.5-21 19-21s19 9 19 21c0-6-3-9-6-9-2.5 0-3.5 2-6.5 2s-4-2.5-7-2.5-4 3-7.5 3c-3 0-5.5-2.5-6.5-2.5-2.5 0-4.5 3-4.5 9Z"
          fill="#F49AC1"
        />
        <circle cx="25" cy="37" r="2.1" fill="#2B2B2E" />
        <circle cx="39" cy="37" r="2.1" fill="#2B2B2E" />
        <path d="M29.5 43.5c1.6 1.6 3.4 1.6 5 0" stroke="#2B2B2E" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      </svg>
    )
  }

  return (
    <svg {...common}>
      {/* caneca de chope de óculos escuros */}
      <path d="M45 27h5a8 8 0 0 1 0 16h-5" stroke="#E8A33D" strokeWidth="4.5" fill="none" strokeLinecap="round" />
      <rect x="15" y="20" width="30" height="36" rx="6" fill="#F2B44C" />
      <path
        d="M15 24c0-5.5 4-9.5 9-9.5 1.8 0 3.2.5 4.4 1.3A7.7 7.7 0 0 1 34 13c3.4 0 6.2 2 7.4 4.8 2.2.7 3.6 2.8 3.6 5.4V26H15v-2Z"
        fill="#FFF9F0"
      />
      <rect x="19.5" y="33" width="10" height="7.5" rx="2.6" fill="#2B2B2E" />
      <rect x="31.5" y="33" width="10" height="7.5" rx="2.6" fill="#2B2B2E" />
      <path d="M29.5 36.2h2" stroke="#2B2B2E" strokeWidth="2" strokeLinecap="round" />
      <path d="M27 46.5c2.4 2.4 5.2 2.4 7.6 0" stroke="#2B2B2E" strokeWidth="1.8" fill="none" strokeLinecap="round" />
    </svg>
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
