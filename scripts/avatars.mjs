// Recorta os memes em avatar. Rodar só se trocar as imagens de origem:
//   node scripts/avatars.mjs <bela.jpg> <lucas.jpg>
import sharp from 'sharp'

const [bela, lucas] = process.argv.slice(2)

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
  await img.resize(320, 320, { fit: 'cover' }).webp({ quality: 86 }).toFile(out)
  console.log('gerado', out)
}
