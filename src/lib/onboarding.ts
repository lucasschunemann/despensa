import type { User } from '@supabase/supabase-js'
import { save, load } from './storage'
import { supabase } from './supabase'

export const ONBOARDING_VERSION = 1

function storageKey(userId: string) {
  return `despensa:onboarding:${userId}`
}

export function hasCompletedOnboarding(user: Pick<User, 'id' | 'user_metadata'>) {
  const remoteVersion = Number(user.user_metadata?.onboarding_version ?? 0)
  return remoteVersion >= ONBOARDING_VERSION || load(storageKey(user.id)) === String(ONBOARDING_VERSION)
}

/**
 * A cópia local fecha a apresentação imediatamente e evita repetição offline.
 * O metadado da conta leva a preferência para os outros aparelhos.
 */
export async function completeOnboarding(userId: string) {
  save(storageKey(userId), String(ONBOARDING_VERSION))
  const { error } = await supabase.auth.updateUser({ data: { onboarding_version: ONBOARDING_VERSION } })
  if (error) throw error
}
