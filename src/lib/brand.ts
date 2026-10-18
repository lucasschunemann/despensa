// Geometria do ícone, a mesma de scripts/icons.mjs (tela de 560). Mudou lá, muda aqui.
export const ART = {
  paper: '#FAFAF7',
  ink: '#161616',
  green: '#3E9E68',
  jar: { x: 199, y: 171, w: 162, h: 229, r: 46, stroke: 28 },
  dot: { cx: 280, cy: 336, r: 31 },
}

/** Formato contínuo dos ícones da Apple: superelipse (n = 5). */
export function squircle(size: number, n = 5, steps = 180): string {
  const r = size / 2
  const pts: string[] = []
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2
    const cos = Math.cos(a)
    const sin = Math.sin(a)
    const x = r + r * Math.sign(cos) * Math.abs(cos) ** (2 / n)
    const y = r + r * Math.sign(sin) * Math.abs(sin) ** (2 / n)
    pts.push(`${x.toFixed(1)},${y.toFixed(1)}`)
  }
  return `M${pts.join('L')}Z`
}
