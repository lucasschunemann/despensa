// Todo push exibe um aviso: requisito do Safari, inclusive com o app aberto.
function notificationTarget(raw) {
  try {
    const url = new URL(raw || '/', self.location.origin)
    if (url.origin !== self.location.origin) return new URL('/', self.location.origin)
    const view = url.searchParams.get('abrir')
    return new URL(['lista', 'contas', 'desejos'].includes(view) ? `/?abrir=${view}` : '/', self.location.origin)
  } catch { return new URL('/', self.location.origin) }
}

self.addEventListener('push', (event) => {
  let data = {}
  try { data = event.data?.json() || {} } catch { data = { body: event.data?.text() || '' } }
  const target = notificationTarget(data.url)
  event.waitUntil((async () => {
    await self.registration.showNotification(data.title || 'despensa', {
      body: data.body || 'Tem novidade na nossa casa.',
      icon: '/icons/icon-192.png', badge: '/icons/icon-192.png',
      tag: data.tag || `despensa-${target.searchParams.get('abrir') || 'aviso'}`,
      data: { url: target.href },
    })
    if ('setAppBadge' in self.navigator) await self.navigator.setAppBadge().catch(() => {})
  })())
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target = notificationTarget(event.notification.data?.url)
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    const open = windows.find((w) => new URL(w.url).origin === self.location.origin)
    if (open) {
      // Um app já pronto confirma a navegação; no cold start o listener pode não existir.
      const acknowledged = await new Promise((resolve) => {
        const channel = new MessageChannel()
        const timer = setTimeout(() => { channel.port1.close(); resolve(false) }, 800)
        channel.port1.onmessage = () => { clearTimeout(timer); channel.port1.close(); resolve(true) }
        open.postMessage({ type: 'OPEN_MODULE', view: target.searchParams.get('abrir') || 'inicio' }, [channel.port2])
      })
      if (!acknowledged) {
        const room = new URL(open.url).searchParams.get('sala')
        if (room) target.searchParams.set('sala', room)
        await open.navigate(target.href).catch(() => self.clients.openWindow(target.href))
      }
      await open.focus()
    } else { await self.clients.openWindow(target.href) }
    if ('clearAppBadge' in self.navigator) await self.navigator.clearAppBadge().catch(() => {})
  })())
})
