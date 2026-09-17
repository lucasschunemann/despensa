/** Esqueleto de carregamento com o formato do que vai aparecer, para a troca não "pular". */
export function Skeleton({ variant = 'market' }: { variant?: 'market' | 'tickets' | 'wishes' }) {
  if (variant === 'tickets') {
    return (
      <ul className="skeleton skeleton-tickets" aria-hidden>
        {[0, 1, 2].map((i) => (
          <li key={i}>
            <span className="skeleton-block" />
          </li>
        ))}
      </ul>
    )
  }
  if (variant === 'wishes') {
    return (
      <ul className="skeleton skeleton-wishes" aria-hidden>
        {[0, 1, 2].map((i) => (
          <li key={i}>
            <span className="skeleton-block skeleton-photo" />
            <span className="skeleton-lines">
              <span className="skeleton-line" style={{ width: `${[62, 48, 70][i]}%` }} />
              <span className="skeleton-line is-short" />
            </span>
          </li>
        ))}
      </ul>
    )
  }
  return (
    <ul className="skeleton skeleton-market" aria-hidden>
      {[68, 52, 74, 44].map((width, i) => (
        <li key={i}>
          <span className="skeleton-block skeleton-mark" />
          <span className="skeleton-lines">
            <span className="skeleton-line" style={{ width: `${width}%` }} />
            <span className="skeleton-line is-short" />
          </span>
          <span className="skeleton-block skeleton-dot" />
        </li>
      ))}
    </ul>
  )
}
