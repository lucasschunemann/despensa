/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { describe, expect, it, vi } from 'vitest'

function worker(open?: object) {
  const handlers: Record<string, (event: unknown) => void> = {}
  const showNotification = vi.fn().mockResolvedValue(undefined)
  const openWindow = vi.fn().mockResolvedValue(undefined)
  const scope = {
    location: { origin: 'https://despensa.test' },
    registration: { showNotification },
    navigator: { setAppBadge: vi.fn().mockResolvedValue(undefined), clearAppBadge: vi.fn().mockResolvedValue(undefined) },
    clients: { matchAll: async () => open ? [open] : [], openWindow },
    addEventListener: (type: string, cb: (event: unknown) => void) => { handlers[type] = cb },
  }
  runInNewContext(readFileSync('public/push-sw.js', 'utf8'), { self: scope, URL, MessageChannel, setTimeout, clearTimeout })
  const dispatch = async (name: string, event: object) => {
    let task: Promise<unknown> | undefined
    handlers[name]({ ...event, waitUntil: (p: Promise<unknown>) => { task = p } })
    await task
  }
  return { scope, showNotification, openWindow, dispatch }
}

describe('service worker push', () => {
  it('mostra fallback mesmo com payload inválido e atualiza badge', async () => {
    const w = worker()
    await w.dispatch('push', { data: { json: () => { throw new Error() }, text: () => 'novidade' } })
    expect(w.showNotification).toHaveBeenCalledWith('despensa', expect.objectContaining({ body: 'novidade' }))
    expect(w.scope.navigator.setAppBadge).toHaveBeenCalledOnce()
  })
  it('nunca abre uma URL externa recebida por push', async () => {
    const w = worker()
    await w.dispatch('notificationclick', { notification: { close: vi.fn(), data: { url: 'https://evil.test/' } } })
    expect(w.openWindow).toHaveBeenCalledWith('https://despensa.test/')
  })
  it('abre no módulo certo com o app fechado', async () => {
    const w = worker()
    await w.dispatch('notificationclick', { notification: { close: vi.fn(), data: { url: '/?abrir=contas' } } })
    expect(w.openWindow).toHaveBeenCalledWith('https://despensa.test/?abrir=contas')
  })
  it('mantém a sessão aberta quando o app confirma a navegação', async () => {
    const focus = vi.fn().mockResolvedValue(undefined), navigate = vi.fn()
    const postMessage = vi.fn((_data, ports: MessagePort[]) => ports[0].postMessage('opened'))
    const w = worker({ url: 'https://despensa.test/?sala=privada', focus, navigate, postMessage })
    await w.dispatch('notificationclick', { notification: { close: vi.fn(), data: { url: '/?abrir=lista' } } })
    expect(postMessage.mock.calls[0][0]).toEqual({ type: 'OPEN_MODULE', view: 'lista' })
    expect(navigate).not.toHaveBeenCalled()
    expect(focus).toHaveBeenCalledOnce()
  })
  it('cold start sem listener navega preservando a sala', async () => {
    const navigate = vi.fn().mockResolvedValue(undefined)
    const w = worker({ url: 'https://despensa.test/?sala=privada', focus: vi.fn(), navigate, postMessage: vi.fn() })
    await w.dispatch('notificationclick', { notification: { close: vi.fn(), data: { url: '/?abrir=desejos' } } })
    expect(navigate).toHaveBeenCalledWith('https://despensa.test/?abrir=desejos&sala=privada')
  })
})
