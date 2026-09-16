export function Skeleton() {
  return (
    <ul className="skeleton" aria-hidden>
      {[68, 52, 74, 44].map((width, i) => (
        <li key={i} className="row">
          <span className="skeleton-check" />
          <span className="skeleton-line" style={{ width: `${width}%` }} />
        </li>
      ))}
    </ul>
  )
}
