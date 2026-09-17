// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
const { from, invoke } = vi.hoisted(() => ({ from: vi.fn(), invoke: vi.fn() }))
vi.mock('./supabase', () => ({ supabase: { from, functions: { invoke } } }))
import { disablePush, enablePush, pushState, pushSupport, reconcilePush, testPush, toBytes } from './push'

const subscription = () => ({ endpoint: 'https://web.push.apple.com/test', options: {}, toJSON: () => ({ keys: { p256dh: 'key', auth: 'auth' } }), unsubscribe: vi.fn().mockResolvedValue(true) })
let sub: ReturnType<typeof subscription>
let requestPermission: ReturnType<typeof vi.fn>
let getSubscription: ReturnType<typeof vi.fn>

beforeEach(() => {
  const storage = new Map<string, string>()
  vi.stubGlobal('localStorage', { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value), removeItem: (key: string) => storage.delete(key) })
  vi.stubEnv('VITE_VAPID_PUBLIC_KEY', 'BAEC')
  vi.stubGlobal('isSecureContext', true)
  vi.stubGlobal('PushManager', class {})
  vi.stubGlobal('matchMedia', () => ({ matches: true }))
  requestPermission = vi.fn().mockResolvedValue('granted')
  vi.stubGlobal('Notification', { permission: 'granted', requestPermission })
  sub = subscription()
  getSubscription = vi.fn().mockResolvedValue(sub)
  const reg = { pushManager: { getSubscription, subscribe: vi.fn().mockResolvedValue(sub) } }
  Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: { getRegistration: vi.fn().mockResolvedValue(reg), ready: Promise.resolve(reg) } })
  from.mockReset(); invoke.mockReset()
})
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs() })

describe('push no aparelho', () => {
  it('explica instalação no iPad com user agent de desktop', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false }))
    vi.spyOn(navigator, 'platform', 'get').mockReturnValue('MacIntel')
    Object.defineProperty(navigator, 'maxTouchPoints', { configurable: true, value: 5 })
    expect(pushSupport()).toBe('instale-primeiro')
    vi.restoreAllMocks()
  })
  it('não confunde assinatura local com registro no servidor', async () => {
    from.mockReturnValue({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) })
    expect(await pushState('sala', 'Lucas')).toBe('reconectar')
  })
  it('confere sala e pessoa antes de mostrar conectado', async () => {
    from.mockReturnValue({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { room_id: 'sala', person: 'Bela' }, error: null }) }) }) })
    expect(await pushState('sala', 'Lucas')).toBe('reconectar')
    expect(await pushState('sala', 'Bela')).toBe('ligado')
  })
  it('solicita permissão no mesmo gesto e desfaz assinatura nova se salvar falhar', async () => {
    getSubscription.mockResolvedValue(null)
    from.mockReturnValue({ upsert: async () => ({ error: { message: 'offline' } }) })
    const promise = enablePush('sala', 'Lucas')
    expect(requestPermission).toHaveBeenCalledOnce()
    await expect(promise).rejects.toThrow('conectar')
    expect(sub.unsubscribe).toHaveBeenCalledOnce()
  })
  it('não finge desligar quando o servidor recusa', async () => {
    from.mockReturnValue({ delete: () => ({ eq: async () => ({ error: { message: 'offline' } }) }) })
    await expect(disablePush()).rejects.toThrow('desligar')
    expect(sub.unsubscribe).not.toHaveBeenCalled()
  })
  it('não considera resposta HTTP sem entregas como teste bem sucedido', async () => {
    invoke.mockResolvedValue({ data: { enviados: 0 }, error: null })
    await expect(testPush('sala')).rejects.toThrow('não foi enviado')
  })
  it('não religa sozinho se o navegador falhar ao cancelar a assinatura', async () => {
    from.mockReturnValue({ delete: () => ({ eq: async () => ({ error: null }) }) })
    sub.unsubscribe.mockResolvedValue(false)
    expect(await disablePush()).toBe('desligado')
    from.mockClear()
    await reconcilePush('sala', 'Lucas')
    expect(from).not.toHaveBeenCalled()
    expect(await pushState('sala', 'Lucas')).toBe('desligado')
  })
  it('decodifica VAPID base64url', () => {
    expect(Array.from(new Uint8Array(toBytes('BAEC')))).toEqual([4, 1, 2])
  })
})
