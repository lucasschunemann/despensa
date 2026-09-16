// Gera os ícones do app a partir de um SVG. Rodar só quando o desenho mudar:
//   node scripts/icons.mjs
import sharp from 'sharp'
import { writeFile } from 'node:fs/promises'

const mark = (size, pad) => {
  const s = size
  const r = s * 0.5
  const scale = 1 - pad * 2
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">
    <rect width="${s}" height="${s}" fill="#111113"/>
    <g transform="translate(${r}, ${r}) scale(${scale}) translate(${-r}, ${-r})">
      <circle cx="${r}" cy="${r}" r="${s * 0.3}" fill="none" stroke="#ffffff" stroke-width="${s * 0.045}"/>
      <path d="M ${s * 0.35} ${s * 0.51} L ${s * 0.455} ${s * 0.615} L ${s * 0.65} ${s * 0.39}"
        fill="none" stroke="#ffffff" stroke-width="${s * 0.058}" stroke-linecap="round" stroke-linejoin="round"/>
    </g>
  </svg>`
}

const targets = [
  ['public/icons/apple-touch-icon.png', 180, 0],
  ['public/icons/icon-192.png', 192, 0],
  ['public/icons/icon-512.png', 512, 0],
  ['public/icons/maskable-512.png', 512, 0.1],
]

for (const [file, size, pad] of targets) {
  const png = await sharp(Buffer.from(mark(size, pad))).png().toBuffer()
  await writeFile(file, png)
  console.log('gerado', file)
}
