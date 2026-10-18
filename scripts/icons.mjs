// Ícone da despensa: um pote visto de frente (contorno arredondado) com um ponto verde.
// Desenho do Lucas (17/10/2026), refeito em vetor com as medidas do original (tela de 560).
// Este script gera, a partir da mesma geometria, todos os arquivos de ícone:
//   node scripts/icons.mjs
//
// Como a Apple entrega ícones:
// - iPhone/iPad (apple-touch-icon): quadrado cheio, opaco, sem cantos; o sistema recorta.
// - Mac e computador (PWA "any"): grade do macOS, corpo de 824/1024 no formato contínuo
//   da Apple (superelipse), com sombra suave e o resto transparente.
// - Android (maskable): quadrado cheio; o desenho já cabe na zona segura de 80%.
// - Aba do navegador: o mesmo ícone recortado, com o desenho um pouco maior para ler em 16px.
// - Safari (mask-icon): só o desenho, em uma cor.
import sharp from 'sharp'
import { writeFile } from 'node:fs/promises'

export const ART = {
  paper: '#FAFAF7',
  ink: '#161616',
  green: '#3E9E68',
  // contorno: retângulo na linha de centro do traço
  jar: { x: 199, y: 171, w: 162, h: 229, r: 46, stroke: 28 },
  dot: { cx: 280, cy: 336, r: 31 },
}

const glyph = (scale = 1, color = null) => {
  const { jar, dot } = ART
  // aumenta a partir do centro da tela (280, 280)
  const t = (v) => 280 + (v - 280) * scale
  return `<rect x="${t(jar.x)}" y="${t(jar.y)}" width="${jar.w * scale}" height="${jar.h * scale}" rx="${jar.r * scale}" fill="none" stroke="${color ?? ART.ink}" stroke-width="${jar.stroke * scale}"/>`
    + `<circle cx="${t(dot.cx)}" cy="${t(dot.cy)}" r="${dot.r * scale}" fill="${color ?? ART.green}"/>`
}

/** Formato contínuo dos ícones da Apple: superelipse (n = 5) no lugar do canto redondo comum. */
function squircle(size, inset = 0, n = 5, steps = 360) {
  const r = size / 2 - inset
  const c = size / 2
  const pts = []
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2
    const cos = Math.cos(a)
    const sin = Math.sin(a)
    pts.push([c + r * Math.sign(cos) * Math.abs(cos) ** (2 / n), c + r * Math.sign(sin) * Math.abs(sin) ** (2 / n)])
  }
  return `M${pts.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join('L')}Z`
}

export const SQUIRCLE_560 = squircle(560)

// ícone cheio (fonte da verdade)
const full = (scale = 1) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 560 560"><rect width="560" height="560" fill="${ART.paper}"/>${glyph(scale)}</svg>`

// recortado no formato da Apple, fundo transparente fora dele
const rounded = (scale = 1) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 560 560"><path d="${SQUIRCLE_560}" fill="${ART.paper}"/>${glyph(scale)}</svg>`

// grade do macOS: 1024 de tela, corpo de 824 com sombra
const macos = () => {
  const body = 824
  const off = (1024 - body) / 2
  const k = body / 560
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
  <defs><filter id="s" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="10" stdDeviation="12" flood-color="#000" flood-opacity="0.22"/></filter></defs>
  <g transform="translate(${off} ${off}) scale(${k})">
    <path d="${SQUIRCLE_560}" fill="${ART.paper}" filter="url(#s)"/>
    <path d="${SQUIRCLE_560}" fill="none" stroke="#000" stroke-opacity="0.06" stroke-width="1"/>
    ${glyph()}
  </g>
</svg>`
}

// o desenho sozinho, em tela quadrada justa, para a marca dentro do app
const mark = (color = null) => {
  const { jar } = ART
  const top = jar.y - jar.stroke / 2
  const side = jar.h + jar.stroke
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${280 - side / 2} ${top} ${side} ${side}">${glyph(1, color)}</svg>`
}

async function png(svg, size, file) {
  const buf = await sharp(Buffer.from(svg), { density: Math.ceil((size / 560) * 72 * 4) }).resize(size, size).png().toBuffer()
  await writeFile(file, buf)
  console.log('gerado', file)
}

await writeFile('public/brand/icon.svg', full())
await writeFile('public/brand/mark.svg', mark())
await writeFile('public/icons/favicon.svg', rounded(1.22))
// Safari: só o desenho, em uma cor, para o navegador pintar
await writeFile('public/icons/mask-icon.svg', mark('#000'))
console.log('gerado public/brand/icon.svg, public/brand/mark.svg, public/icons/favicon.svg, public/icons/mask-icon.svg')

await png(full(), 180, 'public/icons/apple-touch-icon.png')
await png(full(), 1024, 'public/icons/icon-1024.png')
await png(full(), 512, 'public/icons/maskable-512.png')
await png(macos(), 192, 'public/icons/icon-192.png')
await png(macos(), 512, 'public/icons/icon-512.png')
await png(rounded(1.22), 48, 'public/icons/favicon-48.png')
await png(rounded(1.22), 32, 'public/icons/favicon-32.png')
