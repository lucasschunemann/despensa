// Gera os ícones do app a partir da marca. Rodar só quando o desenho mudar:  node scripts/icons.mjs
import sharp from 'sharp'
import { writeFile } from 'node:fs/promises'

const LOGO = 'public/brand/logo.png'
// Mesmo papel do manifesto (vite.config.ts), para o ícone não brigar com a tela de abertura.
const PAPER = '#f7f7f5'

// A arte vem com muita margem transparente e fora do centro: recorta e recentraliza,
// senão o camarão nasce torto dentro do recorte redondo do sistema.
const art = await sharp(LOGO).trim().toBuffer()

const targets = [
  ['public/icons/apple-touch-icon.png', 180, 0.72],
  ['public/icons/icon-192.png', 192, 0.72],
  ['public/icons/icon-512.png', 512, 0.72],
  // maskable: o sistema recorta as bordas, então a marca vem menor
  ['public/icons/maskable-512.png', 512, 0.52],
  ['public/icons/favicon-48.png', 48, 0.76],
]

for (const [file, size, scale] of targets) {
  const inner = Math.round(size * scale)
  const mark = await sharp(art).resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).toBuffer()
  const png = await sharp({ create: { width: size, height: size, channels: 4, background: PAPER } })
    .composite([{ input: mark, gravity: 'center' }])
    .png()
    .toBuffer()
  await writeFile(file, png)
  console.log('gerado', file)
}
