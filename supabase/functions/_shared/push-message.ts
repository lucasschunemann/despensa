export function pushMessage(kind: string, sender: string, subjects: string[], room: string) {
  const list = subjects.slice(0, 2).join(' e ') + (subjects.length > 2 ? ` e mais ${subjects.length - 2}` : '')
  const view = kind === 'item' ? 'lista' : kind === 'conta' ? 'contas' : 'desejos'
  const title = kind === 'item' ? 'lembrou de algo para a casa' : kind === 'conta' ? 'uma coisa a menos para pensar' : 'olha o que entrou nos planos'
  const body = kind === 'item' ? `${sender} colocou ${list} na lista.` : kind === 'conta' ? `${sender} pagou ${list}. Tudo anotado.` : `${sender} quer ${list}. Que tal?`
  return { title, body, url: `/?abrir=${view}`, tag: `despensa-${room}-${view}` }
}

// Não aceitar URLs arbitrárias como destinos de requisições privilegiadas (SSRF).
export function allowedPushEndpoint(endpoint: string): boolean {
  try {
    const url = new URL(endpoint)
    if (url.protocol !== 'https:' || url.username || url.password || url.port) return false
    const host = url.hostname
    return host === 'web.push.apple.com' || host.endsWith('.push.apple.com') ||
      host === 'fcm.googleapis.com' || host === 'updates.push.services.mozilla.com' ||
      host.endsWith('.notify.windows.com')
  } catch { return false }
}
