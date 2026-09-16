// Gera os ícones do app. Rodar só quando o desenho mudar:  node scripts/icons.mjs
import sharp from 'sharp'
import { writeFile } from 'node:fs/promises'

// "d" geométrico: anel + haste alinhados na mesma grade (bowl centrado em 200,320,
// raio 116, miolo 62; haste encostando na borda direita do bowl).
const mark = (fg) => `
  <g fill="${fg}">
    <path d="M200 204a116 116 0 1 0 0 232 116 116 0 0 0 0-232Zm0 54a62 62 0 1 1 0 124 62 62 0 0 1 0-124Z" fill-rule="evenodd"/>
    <rect x="262" y="80" width="54" height="356"/>
  </g>`

const canvas = (size, { bg, fg, scale }) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">
    <rect width="512" height="512" fill="${bg}"/>
    <g transform="translate(256 256) scale(${scale}) translate(-256 -256) translate(56 -2)">${mark(fg)}</g>
  </svg>`

const INK = '#0a0a0a'
const PAPER = '#ffffff'

const targets = [
  ['public/icons/apple-touch-icon.png', 180, { bg: INK, fg: PAPER, scale: 0.72 }],
  ['public/icons/icon-192.png', 192, { bg: INK, fg: PAPER, scale: 0.72 }],
  ['public/icons/icon-512.png', 512, { bg: INK, fg: PAPER, scale: 0.72 }],
  // maskable: o sistema recorta as bordas, então a marca vem menor
  ['public/icons/maskable-512.png', 512, { bg: INK, fg: PAPER, scale: 0.52 }],
  ['public/icons/favicon-48.png', 48, { bg: INK, fg: PAPER, scale: 0.76 }],
]

for (const [file, size, opts] of targets) {
  const png = await sharp(Buffer.from(canvas(size, opts))).png().toBuffer()
  await writeFile(file, png)
  console.log('gerado', file)
}
