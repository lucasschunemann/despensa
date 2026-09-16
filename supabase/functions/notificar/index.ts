// Edge Function `notificar`: recebe um aviso do app e entrega nos aparelhos da outra
// pessoa da sala. Quem chama precisa estar logado (o app faz isso sozinho) e ser
// membro da sala; quem chamou não recebe o próprio aviso.
//
// Segredos necessários (supabase secrets set):
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT
import { createClient } from 'jsr:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface Payload {
  room_id: string
  from: string
  title: string
  body: string
  url?: string
}

webpush.setVapidDetails(
  Deno.env.get('VAPID_SUBJECT') ?? 'mailto:despensa@example.com',
  Deno.env.get('VAPID_PUBLIC_KEY') ?? '',
  Deno.env.get('VAPID_PRIVATE_KEY') ?? '',
)

const url = Deno.env.get('SUPABASE_URL')!
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const authorization = req.headers.get('Authorization')
  if (!authorization) {
    return new Response(JSON.stringify({ error: 'sem autenticação' }), {
      status: 401,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  const payload = (await req.json()) as Payload
  if (!payload?.room_id || !payload.title) {
    return new Response(JSON.stringify({ error: 'faltou room_id ou title' }), {
      status: 400,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  // cliente com o token de quem chamou: o RLS confirma que essa pessoa é da sala
  const caller = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authorization } },
  })
  const { data: membership } = await caller
    .from('room_members')
    .select('room_id')
    .eq('room_id', payload.room_id)
    .maybeSingle()

  if (!membership) {
    return new Response(JSON.stringify({ error: 'não é dessa sala' }), {
      status: 403,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  const { data: { user } } = await caller.auth.getUser()

  // cliente de serviço: só ele enxerga as assinaturas dos outros aparelhos
  const admin = createClient(url, serviceKey)
  const { data: subscriptions, error } = await admin
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth, person, user_id')
    .eq('room_id', payload.room_id)

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  const targets = (subscriptions ?? []).filter(
    (s) => s.user_id !== user?.id && s.person !== payload.from,
  )

  const message = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url ?? '/',
  })

  const results = await Promise.allSettled(
    targets.map((s) =>
      webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        message,
      ),
    ),
  )

  // assinatura morta (aparelho desinstalou o app) é limpa aqui
  const gone = targets.filter((_, i) => {
    const result = results[i]
    return (
      result.status === 'rejected' &&
      [404, 410].includes((result.reason as { statusCode?: number })?.statusCode ?? 0)
    )
  })
  if (gone.length > 0) {
    await admin.from('push_subscriptions').delete().in('endpoint', gone.map((s) => s.endpoint))
  }

  return new Response(
    JSON.stringify({
      enviados: results.filter((r) => r.status === 'fulfilled').length,
      limpos: gone.length,
    }),
    { headers: { ...CORS, 'Content-Type': 'application/json' } },
  )
})
