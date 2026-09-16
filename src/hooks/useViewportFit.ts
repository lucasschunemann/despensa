import { useEffect } from 'react'

// O teclado do celular não "empurra" mais a tela: o app passa a ter exatamente a altura
// da área visível, então o campo de digitar encosta no topo do teclado e a lista continua
// inteira acima dele. Também desfaz a rolagem que o Safari faz sozinho ao abrir o teclado.
export function useViewportFit(onResize?: () => void) {
  useEffect(() => {
    const vv = window.visualViewport
    const root = document.documentElement

    const apply = () => {
      const height = Math.round(vv?.height ?? window.innerHeight)
      root.style.setProperty('--app-height', `${height}px`)
      if (window.scrollY !== 0) window.scrollTo(0, 0)
      onResize?.()
    }

    apply()
    vv?.addEventListener('resize', apply)
    vv?.addEventListener('scroll', apply)
    window.addEventListener('orientationchange', apply)
    window.addEventListener('resize', apply)

    return () => {
      vv?.removeEventListener('resize', apply)
      vv?.removeEventListener('scroll', apply)
      window.removeEventListener('orientationchange', apply)
      window.removeEventListener('resize', apply)
    }
  }, [onResize])
}
