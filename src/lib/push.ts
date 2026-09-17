import { supabase } from './supabase'
import { load, save } from './storage'

const OFF_KEY = 'despensa:push-off'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined
export type PushState = 'indisponível' | 'instale-primeiro' | 'bloqueado' | 'desligado' | 'ligado' | 'configurar' | 'reconectar'

export function pushConfigured(): boolean { return Boolean(VAPID_PUBLIC_KEY) }

export function pushSupport(): PushState | null {
  const standalone = window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  if (ios && !standalone) return 'instale-primeiro'
  if (!window.isSecureContext || !('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) return 'indisponível'
  if (!pushConfigured()) return 'configurar'
  if (Notification.permission === 'denied') return 'bloqueado'
  return null
}

export async function pushState(roomId?: string, person?: string): Promise<PushState> {
  const unsupported = pushSupport()
  if (unsupported) return unsupported
  const registration = await navigator.serviceWorker.getRegistration()
  const subscription = await registration?.pushManager.getSubscription()
  if (!subscription || Notification.permission !== 'granted' || load(OFF_KEY) === 'true') return 'desligado'
  if (!roomId) return 'reconectar'
  const { data, error } = await supabase.from('push_subscriptions').select('room_id, person')
    .eq('endpoint', subscription.endpoint).maybeSingle()
  if (error) throw new Error('Não deu para conferir a conexão. Tente novamente com internet.')
  return data?.room_id === roomId && data?.person === person ? 'ligado' : 'reconectar'
}

export function toBytes(base64url: string): ArrayBuffer {
  const raw = atob((base64url + '='.repeat((4 - base64url.length % 4) % 4)).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(raw, (c) => c.charCodeAt(0)).buffer
}

async function readyWorker(): Promise<ServiceWorkerRegistration> {
  let timeout: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      navigator.serviceWorker.ready,
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => reject(new Error('O app ainda está atualizando. Feche e abra pela tela inicial e tente novamente.')), 10000)
      }),
    ])
  } finally { clearTimeout(timeout) }
}

async function saveSubscription(subscription: PushSubscription, roomId: string, person: string) {
  const json = subscription.toJSON()
  if (!json.keys?.p256dh || !json.keys.auth) throw new Error('O aparelho não criou uma assinatura válida. Tente novamente.')
  const { error } = await supabase.from('push_subscriptions').upsert({
    endpoint: subscription.endpoint, room_id: roomId, person,
    p256dh: json.keys.p256dh, auth: json.keys.auth,
  }, { onConflict: 'endpoint' })
  if (error) throw new Error('Não deu para conectar este aparelho. Confira a internet e tente novamente.')
}

export async function enablePush(roomId: string, person: string): Promise<PushState> {
  const unsupported = pushSupport()
  if (unsupported) return unsupported
  // Antes de qualquer await: o Safari exige que a solicitação parta do toque.
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return permission === 'denied' ? 'bloqueado' : 'desligado'
  const registration = await readyWorker()
  let subscription = await registration.pushManager.getSubscription()
  const key = toBytes(VAPID_PUBLIC_KEY!)
  if (subscription?.options.applicationServerKey) {
    const current = new Uint8Array(subscription.options.applicationServerKey)
    const wanted = new Uint8Array(key)
    if (current.length !== wanted.length || current.some((v, i) => v !== wanted[i])) {
      if (!await subscription.unsubscribe()) throw new Error('Não deu para renovar os avisos. Tente novamente.')
      subscription = null
    }
  }
  const created = !subscription
  subscription ??= await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key })
  try {
    await saveSubscription(subscription, roomId, person)
  } catch (error) {
    // Não deixar uma assinatura órfã aparecer como "ligado".
    if (created) await subscription.unsubscribe().catch(() => false)
    throw error
  }
  save(OFF_KEY, null)
  return 'ligado'
}

/** Troca de pessoa/retorno ao app: reparar somente assinaturas já autorizadas, sem pedir permissão. */
export async function reconcilePush(roomId: string, person: string): Promise<void> {
  if (load(OFF_KEY) === 'true' || pushSupport() || Notification.permission !== 'granted') return
  const registration = await navigator.serviceWorker.getRegistration()
  const subscription = await registration?.pushManager.getSubscription()
  if (subscription && load(OFF_KEY) !== 'true') await saveSubscription(subscription, roomId, person)
}

export async function disablePush(): Promise<PushState> {
  const registration = await navigator.serviceWorker.getRegistration()
  const subscription = await registration?.pushManager.getSubscription()
  if (subscription) {
    // Primeiro o servidor. Se falhar, não fingir que desligou.
    const { error } = await supabase.from('push_subscriptions').delete().eq('endpoint', subscription.endpoint)
    if (error) throw new Error('Não deu para desligar os avisos. Tente novamente com internet.')
    save(OFF_KEY, 'true')
    // O servidor já desligou. Se o navegador falhar ao cancelar, não reativar ao voltar.
    await subscription.unsubscribe().catch(() => false)
  }
  return 'desligado'
}

export async function testPush(roomId: string): Promise<void> {
  const registration = await navigator.serviceWorker.getRegistration()
  const subscription = await registration?.pushManager.getSubscription()
  if (!subscription) throw new Error('Conecte este aparelho antes de testar.')
  const { data, error } = await supabase.functions.invoke('notificar', {
    body: { action: 'test', room_id: roomId, endpoint: subscription.endpoint },
  })
  if (error || data?.enviados !== 1) throw new Error('O teste não foi enviado. Confira a conexão e a configuração dos avisos no servidor.')
}
