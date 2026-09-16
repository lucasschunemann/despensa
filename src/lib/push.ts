import { supabase } from './supabase'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined

export type PushState = 'indisponível' | 'instale-primeiro' | 'bloqueado' | 'desligado' | 'ligado'

function isStandalone(): boolean {
  const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone
  return window.matchMedia('(display-mode: standalone)').matches || iosStandalone === true
}

function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
}

export function pushConfigured(): boolean {
  return Boolean(VAPID_PUBLIC_KEY)
}

export async function pushState(): Promise<PushState> {
  if (!pushConfigured() || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    // no iPhone o push só existe com o app instalado na tela inicial
    return isIOS() && !isStandalone() ? 'instale-primeiro' : 'indisponível'
  }
  if (Notification.permission === 'denied') return 'bloqueado'

  const registration = await navigator.serviceWorker.getRegistration()
  const subscription = await registration?.pushManager.getSubscription()
  return subscription ? 'ligado' : 'desligado'
}

// a chave pública vem em base64url e o navegador quer bytes
function toBytes(base64url: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64url.length % 4)) % 4)
  const base64 = (base64url + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const bytes = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i)
  return bytes.buffer
}

export async function enablePush(roomId: string, person: string): Promise<PushState> {
  if (!pushConfigured()) return 'indisponível'

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return permission === 'denied' ? 'bloqueado' : 'desligado'

  const registration = await navigator.serviceWorker.ready
  const existing = await registration.pushManager.getSubscription()
  const subscription =
    existing ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: toBytes(VAPID_PUBLIC_KEY as string),
    }))

  const json = subscription.toJSON()
  const { error } = await supabase.from('push_subscriptions').upsert({
    endpoint: subscription.endpoint,
    room_id: roomId,
    person,
    p256dh: json.keys?.p256dh ?? '',
    auth: json.keys?.auth ?? '',
  })
  if (error) throw error

  return 'ligado'
}

export async function disablePush(): Promise<PushState> {
  const registration = await navigator.serviceWorker.getRegistration()
  const subscription = await registration?.pushManager.getSubscription()
  if (subscription) {
    await supabase.from('push_subscriptions').delete().eq('endpoint', subscription.endpoint)
    await subscription.unsubscribe()
  }
  return 'desligado'
}
