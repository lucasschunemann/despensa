export type AuthRedirectKind = 'confirmation' | 'conversion' | 'oauth' | 'recovery'

export const PRODUCTION_APP_URL = 'https://despensa-xi.vercel.app/'

/**
 * E-mails nunca devem voltar para a URL única de um deploy da Vercel: ela pede login
 * da equipe em aparelhos externos. Em desenvolvimento mantemos o host local.
 */
export function buildAuthRedirect(
  currentHref: string,
  kind: AuthRedirectKind,
  configuredUrl?: string,
): string {
  const current = new URL(currentHref)
  const local = current.hostname === 'localhost' || current.hostname === '127.0.0.1'
  const base = configuredUrl?.trim() || (local ? current.origin : PRODUCTION_APP_URL)
  const redirect = new URL('/', base)
  const room = current.searchParams.get('sala')
  if (room) redirect.searchParams.set('sala', room)
  if (kind === 'recovery') redirect.searchParams.set('recovery', '1')
  if (kind === 'confirmation') redirect.searchParams.set('auth', 'confirmed')
  if (kind === 'conversion') redirect.searchParams.set('auth', 'converted')
  return redirect.toString()
}

export function authRedirect(kind: AuthRedirectKind): string {
  return buildAuthRedirect(location.href, kind, import.meta.env.VITE_PUBLIC_APP_URL as string | undefined)
}
