import { useEffect, useState } from 'react'

/** Acompanha uma media query do CSS, para quando o layout muda de estrutura e não só de estilo. */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => typeof window !== 'undefined' && window.matchMedia?.(query).matches)

  useEffect(() => {
    const list = window.matchMedia?.(query)
    if (!list) return
    const update = () => setMatches(list.matches)
    update()
    list.addEventListener('change', update)
    return () => list.removeEventListener('change', update)
  }, [query])

  return Boolean(matches)
}
