import { supabase } from './supabase'

const MAX_SIDE = 1200
const BUCKET = 'desejos'

// Foto de celular tem 4 MB; a gente sobe uns 150 KB. Reduzir antes de enviar é o que
// faz a foto aparecer rápido na tela do outro, mesmo no 4G do mercado.
async function shrink(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return file
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/webp', 0.82),
  )
  return blob ?? file
}

export async function uploadWishImage(roomId: string, wishId: string, file: File): Promise<string> {
  const blob = await shrink(file)
  const path = `${roomId}/${wishId}.webp`

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, { upsert: true, contentType: 'image/webp', cacheControl: '3600' })
  if (error) throw error

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  // a versão na URL força o navegador a buscar de novo quando a foto é trocada
  return `${data.publicUrl}?v=${Date.now()}`
}
