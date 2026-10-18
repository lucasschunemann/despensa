import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { useSyncState } from '../lib/sync'

function useOnline() {
  const [online, setOnline] = useState(() => navigator.onLine)
  useEffect(() => {
    const up = () => setOnline(true)
    const down = () => setOnline(false)
    window.addEventListener('online', up)
    window.addEventListener('offline', down)
    return () => {
      window.removeEventListener('online', up)
      window.removeEventListener('offline', down)
    }
  }, [])
  return online
}

/**
 * Diz, sem alarde, o que está acontecendo com as alterações: guardadas esperando sinal,
 * sendo enviadas, ou "tudo enviado" por um instante quando a fila esvazia.
 */
export function SyncBadge() {
  const { pending, offline } = useSyncState()
  const online = useOnline()
  const reduced = useReducedMotion()
  const [justSent, setJustSent] = useState(false)
  const previous = useRef(pending)

  useEffect(() => {
    if (previous.current > 0 && pending === 0) {
      setJustSent(true)
      const timer = setTimeout(() => setJustSent(false), 1800)
      previous.current = pending
      return () => clearTimeout(timer)
    }
    previous.current = pending
  }, [pending])

  const state = !online || offline ? 'offline' : pending > 0 ? 'sending' : justSent ? 'sent' : null

  return (
    <AnimatePresence mode="popLayout">
      {state && (
        <motion.span
          key={state}
          className={`sync sync-${state}`}
          initial={{ opacity: 0, scale: 0.8, y: -4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ type: 'spring', stiffness: 520, damping: 32 }}
          role="status"
        >
          {state === 'offline' && (
            <>
              <svg viewBox="0 0 24 24" aria-hidden>
                <path d="M7.5 18.5h9.8a4.2 4.2 0 0 0 .8-8.3 6 6 0 0 0-10.9-1.6" />
                <path d="M5.2 9.5A4.5 4.5 0 0 0 7.5 18.5M3 3l18 18" />
              </svg>
              {pending > 0 ? `sem sinal · ${pending} ${pending === 1 ? 'guardada' : 'guardadas'}` : 'sem sinal'}
            </>
          )}
          {state === 'sending' && (
            <>
              <motion.svg
                viewBox="0 0 24 24"
                animate={reduced ? undefined : { rotate: 360 }}
                transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }}
                aria-hidden
              >
                <path d="M12 3a9 9 0 1 1-9 9" />
              </motion.svg>
              enviando
            </>
          )}
          {state === 'sent' && (
            <>
              <svg viewBox="0 0 24 24" aria-hidden>
                <motion.path
                  d="M5 12.5 10 17.5 19 7.5"
                  initial={{ pathLength: reduced ? 1 : 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.3 }}
                />
              </svg>
              tudo enviado
            </>
          )}
        </motion.span>
      )}
    </AnimatePresence>
  )
}
