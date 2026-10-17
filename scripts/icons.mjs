// Gera os ícones do app a partir de public/brand/mark.svg.
// Rodar só quando a marca mudar:  node scripts/icons.mjs
import sharp from 'sharp'
import { readFile, writeFile } from 'node:fs/promises'

const MARK = 'public/brand/mark.svg'
const PAPER = '#ffffff'

const svg = await readFile(MARK)

const targets = [
  ['public/icons/apple-touch-icon.png', 180, 0.62],
  ['public/icons/icon-192.png', 192, 0.62],
  ['public/icons/icon-512.png', 512, 0.62],
  // maskable: o sistema recorta as bordas, então a marca vem menor
  ['public/icons/maskable-512.png', 512, 0.46],
  ['public/icons/favicon-48.png', 48, 0.7],
]

for (const [file, size, scale] of targets) {
  const inner = Math.round(size * scale)
  const mark = await sharp(svg, { density: 600 }).resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).toBuffer()
  const png = await sharp({ create: { width: size, height: size, channels: 4, background: PAPER } })
    .composite([{ input: mark, gravity: 'center' }])
    .png()
    .toBuffer()
  await writeFile(file, png)
  console.log('gerado', file)
}
