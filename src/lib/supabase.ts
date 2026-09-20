import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined

export const supabaseUrl = url
export const supabasePublishableKey = key

export const isConfigured = Boolean(url && key)

export const supabase = createClient(url ?? 'http://localhost', key ?? 'missing', {
  // O app é client-only. No iPhone, links de e-mail abrem no Safari, cujo armazenamento
  // é separado do PWA; o fluxo implícito não depende de um verificador salvo no outro app.
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'implicit' },
})
