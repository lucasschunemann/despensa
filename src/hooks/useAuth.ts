import { useCallback, useEffect, useState } from 'react'
import type { AuthSnapshot, Profile } from '../lib/auth'
import { fetchProfile } from '../lib/auth'
import { supabase } from '../lib/supabase'

export function useAuth() {
  const [auth, setAuth] = useState<AuthSnapshot>({ session: null, user: null })
  const [profile, setProfile] = useState<Profile | null>(null)
  const [ready, setReady] = useState(false)
  const [recovery, setRecovery] = useState(() => new URLSearchParams(location.search).has('recovery'))

  const refreshProfile = useCallback(async (userId?: string) => {
    const id = userId ?? auth.user?.id
    if (!id) { setProfile(null); return null }
    const next = await fetchProfile(id)
    setProfile(next)
    return next
  }, [auth.user?.id])

  useEffect(() => {
    let alive = true
    void supabase.auth.getSession().then(async ({ data }) => {
      if (!alive) return
      const next = { session: data.session, user: data.session?.user ?? null }
      setAuth(next)
      if (next.user) await fetchProfile(next.user.id).then((p) => alive && setProfile(p)).catch(() => {})
      if (alive) setReady(true)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!alive) return
      setAuth({ session, user: session?.user ?? null, event })
      if (event === 'PASSWORD_RECOVERY') setRecovery(true)
      if (session?.user) setTimeout(() => void fetchProfile(session.user.id).then(setProfile).catch(() => {}), 0)
      else setProfile(null)
      setReady(true)
    })
    return () => { alive = false; listener.subscription.unsubscribe() }
  }, [])

  return { ...auth, profile, ready, recovery, setRecovery, refreshProfile, setProfile }
}
