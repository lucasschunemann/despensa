import { createClient } from 'jsr:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'
import { allowedPushEndpoint, pushMessage } from '../_shared/push-message.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const respond = (data: unknown, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { ...CORS, 'Content-Type': 'application/json' },
})
const url = Deno.env.get('SUPABASE_URL')!
const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return respond({ error: 'método não permitido' }, 405)
  try {
    // Autenticação explícita: cron usa segredo próprio, app usa JWT verificado pelo Auth.
    const secret = Deno.env.get('PUSH_DISPATCH_SECRET')
    const dispatch = Boolean(secret && req.headers.get('x-push-secret') === secret)
    let userId: string | undefined
    if (!dispatch) {
      const authorization = req.headers.get('Authorization')
      if (!authorization?.startsWith('Bearer ')) return respond({ error: 'sem autenticação' }, 401)
      const { data, error } = await admin.auth.getUser(authorization.slice(7))
      if (error || !data.user) return respond({ error: 'sessão inválida' }, 401)
      userId = data.user.id
    }
    let payload: Record<string, unknown>
    try { payload = await req.json() } catch { return respond({ error: 'JSON inválido' }, 400) }
    if (!payload || typeof payload !== 'object') return respond({ error: 'pedido inválido' }, 400)
    const publicKey = Deno.env.get('VAPID_PUBLIC_KEY')
    const privateKey = Deno.env.get('VAPID_PRIVATE_KEY')
    const subject = Deno.env.get('VAPID_SUBJECT')
    if (!publicKey || !privateKey || !subject) return respond({ error: 'push não configurado' }, 503)
    webpush.setVapidDetails(subject, publicKey, privateKey)

    const send = async (subscription: { endpoint: string; p256dh: string; auth: string }, message: object) => {
      if (!allowedPushEndpoint(subscription.endpoint)) throw Object.assign(new Error('destino inválido'), { statusCode: 410 })
      return await webpush.sendNotification({ endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth } }, JSON.stringify(message),
        { TTL: 3600, urgency: 'normal', timeout: 8000 })
    }

    if (dispatch) {
      const { data: jobs, error } = await admin.rpc('claim_push_deliveries')
      if (error) return respond({ error: 'fila indisponível' }, 500)
      let sent = 0, failed = 0
      await Promise.all((jobs ?? []).map(async (job: { id: string; endpoint: string; room_id: string; sender: string; kind: string; subjects: string[]; attempts: number }) => {
        const { data: sub, error: lookupError } = await admin.from('push_subscriptions')
          .select('endpoint, p256dh, auth, room_id, person').eq('endpoint', job.endpoint).maybeSingle()
        if (lookupError) { failed++; return } // lease expira; tenta novamente
        if (!sub || sub.room_id !== job.room_id || sub.person === job.sender) {
          await admin.from('push_deliveries').delete().eq('id', job.id)
          return
        }
        try {
          await send(sub, pushMessage(job.kind, job.sender, job.subjects, job.room_id))
          const { error: markError } = await admin.from('push_deliveries').update({ delivered_at: new Date().toISOString(), last_error: null }).eq('id', job.id)
          if (markError) failed++; else sent++
        } catch (error) {
          failed++
          const status = (error as { statusCode?: number }).statusCode ?? 0
          if (status === 404 || status === 410) {
            await admin.from('push_subscriptions').delete().eq('endpoint', job.endpoint)
          } else {
            await admin.from('push_deliveries').update({ last_error: `push_${status || 'network'}`,
              available_at: new Date(Date.now() + Math.min(3600, 30 * 2 ** job.attempts) * 1000).toISOString(),
            }).eq('id', job.id)
          }
        }
      }))
      return respond({ enviados: sent, falhas: failed })
    }

    if (typeof payload.room_id !== 'string') return respond({ error: 'sala inválida' }, 400)
    const { data: membership } = await admin.from('room_members').select('room_id')
      .eq('room_id', payload.room_id).eq('user_id', userId!).maybeSingle()
    if (!membership) return respond({ error: 'não é dessa sala' }, 403)
    // Clientes anteriores mandavam conteúdo livre. Os triggers já cuidam do aviso.
    if (payload.action !== 'test') return respond({ queued: true })
    if (typeof payload.endpoint !== 'string') return respond({ error: 'aparelho inválido' }, 400)
    const { data: sub } = await admin.from('push_subscriptions').select('endpoint, p256dh, auth')
      .eq('room_id', payload.room_id).eq('user_id', userId!).eq('endpoint', payload.endpoint).maybeSingle()
    if (!sub) return respond({ error: 'aparelho não conectado' }, 404)
    try {
      await send(sub, { title: 'chegou. estamos por aqui.', body: 'O despensa já pode avisar quando tiver novidade na nossa casa.', url: '/', tag: 'despensa-teste' })
      return respond({ enviados: 1 })
    } catch (error) {
      const status = (error as { statusCode?: number }).statusCode
      if (status === 404 || status === 410) await admin.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
      return respond({ error: 'serviço de push recusou o teste' }, 502)
    }
  } catch {
    return respond({ error: 'não foi possível processar o aviso' }, 500)
  }
})
