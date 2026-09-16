import { useEffect, useState } from 'react'

// Quanto do rodapé o teclado está cobrindo. É o que faz o campo subir junto com o teclado
// no iPhone, em vez de ficar escondido atrás dele.
export function useKeyboardInset(): number {
  const [inset, setInset] = useState(0)

  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return

    const update = () => {
      const covered = window.innerHeight - (vv.height + vv.offsetTop)
      setInset(Math.max(0, Math.round(covered)))
    }

    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    update()
    return () => {
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', update)
    }
  }, [])

  return inset
}
