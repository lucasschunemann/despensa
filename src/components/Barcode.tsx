// Código de barras de mentirinha, mas estável: as barras saem do id da conta, então a
// mesma conta tem sempre o mesmo código.
function hash(text: string): number {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export function Barcode({ seed, width = 150, height = 30 }: { seed: string; width?: number; height?: number }) {
  let state = hash(seed) || 1
  const next = () => {
    state ^= state << 13
    state ^= state >>> 17
    state ^= state << 5
    return (state >>> 0) / 4294967296
  }

  const bars: Array<{ x: number; w: number }> = []
  let x = 0
  while (x < width) {
    const w = 1 + Math.floor(next() * 3)
    if (next() > 0.38) bars.push({ x, w })
    x += w + 1 + Math.floor(next() * 2)
  }

  return (
    <svg className="barcode" width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden>
      {bars.map((bar, i) => (
        <rect key={i} x={bar.x} y={0} width={bar.w} height={height} fill="currentColor" />
      ))}
    </svg>
  )
}
