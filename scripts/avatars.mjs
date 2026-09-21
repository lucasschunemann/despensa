// Recorta os memes em avatar. Rodar só se trocar as imagens de origem:
//   node scripts/avatars.mjs <bela.jpg> <lucas.jpg>
// Sem argumento, refaz o recorte de fundo dos avatares que já estão no projeto:
//   node scripts/avatars.mjs
import sharp from 'sharp'

const ALVOS = [
  'public/avatars/bela.webp',
  'public/avatars/lucas.webp',
  'public/avatars/bela-face.webp',
  'public/avatars/lucas-face.webp',
]

/**
 * Tira o fundo branco do meme deixando alfa no lugar.
 *
 * O preenchimento parte das bordas e só anda por pixel branco vizinho, em vez de
 * apagar todo branco da imagem: os dois gatos têm pelo claro, e um corte por cor
 * furaria o bicho. No fim o alfa passa por um desfoque de meio pixel, senão a
 * silhueta fica serrilhada.
 */
async function recortarFundo(entrada) {
  const { data, info } = await sharp(entrada).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const { width, height, channels } = info
  const fundo = new Uint8Array(width * height)

  const ehFundo = (i) => {
    const r = data[i * channels], g = data[i * channels + 1], b = data[i * channels + 2]
    const menor = Math.min(r, g, b)
    return menor >= 234 && Math.max(r, g, b) - menor <= 14
  }

  const fila = []
  for (let x = 0; x < width; x++) {
    for (const y of [0, height - 1]) { const i = y * width + x; if (ehFundo(i)) { fundo[i] = 1; fila.push(i) } }
  }
  for (let y = 0; y < height; y++) {
    for (const x of [0, width - 1]) { const i = y * width + x; if (ehFundo(i)) { fundo[i] = 1; fila.push(i) } }
  }

  for (let cabeca = 0; cabeca < fila.length; cabeca++) {
    const i = fila[cabeca]
    const x = i % width, y = (i / width) | 0
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue
      const j = ny * width + nx
      if (!fundo[j] && ehFundo(j)) { fundo[j] = 1; fila.push(j) }
    }
  }

  // Encolhe a silhueta em um pixel. Sem isso sobra uma franja clara em volta do
  // gato, dos pixels meio-brancos que a compressão do original deixou na borda —
  // invisível no tema claro, um contorno aceso no escuro.
  const cheio = new Uint8Array(fundo)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x
      if (cheio[i]) continue
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue
        if (cheio[ny * width + nx]) { fundo[i] = 1; break }
      }
    }
  }

  // Esfumado feito à mão: passar a máscara pelo blur do sharp devolvia um buffer
  // com outro número de canais e desalinhava tudo em faixas.
  const alfa = new Float32Array(width * height)
  for (let i = 0; i < width * height; i++) alfa[i] = fundo[i] ? 0 : 255
  const suave = new Uint8Array(width * height)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let soma = 0, peso = 0
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx, ny = y + dy
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue
          const p = dx === 0 && dy === 0 ? 4 : (dx === 0 || dy === 0 ? 2 : 1)
          soma += alfa[ny * width + nx] * p
          peso += p
        }
      }
      suave[y * width + x] = Math.round(soma / peso)
    }
  }

  const saida = Buffer.alloc(width * height * 4)
  for (let i = 0; i < width * height; i++) {
    saida[i * 4] = data[i * channels]
    saida[i * 4 + 1] = data[i * channels + 1]
    saida[i * 4 + 2] = data[i * channels + 2]
    saida[i * 4 + 3] = suave[i]
  }
  return sharp(saida, { raw: { width, height, channels: 4 } })
}

const [bela, lucas] = process.argv.slice(2)

if (!bela) {
  for (const alvo of ALVOS) {
    const png = await (await recortarFundo(alvo)).png().toBuffer()
    await sharp(png).webp({ quality: 88, alphaQuality: 100 }).toFile(alvo)
    console.log('recortado', alvo)
  }
} else {
  const jobs = [
    // versão inteira (tela de escolher quem é você): a piada precisa do tomate no quadro.
    // No original do Lucas tem uma listra cinza na borda de baixo, por isso o recorte.
    [bela, 'public/avatars/bela.webp', { left: 0, top: 0, width: 736, height: 730 }],
    [lucas, 'public/avatars/lucas.webp', { left: 2, top: 2, width: 731, height: 710 }],
    // versão fechada no gato (avatares pequenos da lista e do topo)
    [bela, 'public/avatars/bela-face.webp', { left: 450, top: 75, width: 280, height: 280 }],
    [lucas, 'public/avatars/lucas-face.webp', { left: 330, top: 40, width: 400, height: 400 }],
  ]

  for (const [src, out, crop] of jobs) {
    let img = sharp(src).flatten({ background: '#ffffff' })
    if (crop) img = img.extract(crop)
    const plano = await img.resize(320, 320, { fit: 'cover' }).png().toBuffer()
    const recortado = await recortarFundo(plano)
    await recortado.webp({ quality: 88, alphaQuality: 100 }).toFile(out)
    console.log('gerado', out)
  }
}
