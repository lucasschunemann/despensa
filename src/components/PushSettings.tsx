import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, useState } from 'react'
import { disablePush, enablePush, pushState, testPush, type PushState } from '../lib/push'

const COPY: Record<PushState, { title: string; detail: string; action?: string }> = {
  ligado: { title: 'vocês continuam conectados', detail: 'Novidades da lista, contas pagas e desejos, mesmo com o app fechado.' },
  desligado: { title: 'um toque de quem está junto', detail: 'Saiba quando a outra pessoa lembrar de algo para a casa.', action: 'ativar avisos' },
  reconectar: { title: 'vamos reconectar?', detail: 'A permissão existe. Falta conectar este aparelho à sua sala.', action: 'reconectar aparelho' },
  bloqueado: { title: 'o iPhone está no silencioso para nós', detail: 'Abra Ajustes → Notificações → despensa e permita os avisos. Depois, volte aqui.' },
  'instale-primeiro': { title: 'primeiro, um lugar na tela inicial', detail: 'No Safari, toque em Compartilhar → Adicionar à Tela de Início. Abra o despensa pelo novo ícone para ativar. Requer iOS 16.4 ou posterior.' },
  indisponível: { title: 'avisos não disponíveis aqui', detail: 'No iPhone, use o app da tela inicial com iOS 16.4 ou posterior. O endereço precisa usar HTTPS.' },
  configurar: { title: 'os avisos ainda estão em preparação', detail: 'Falta concluir a configuração do serviço. A lista e as contas continuam funcionando.' },
}
const PREVIEWS = [
  { label: 'mercado', icon: '🥑', title: 'um lembrete para a próxima ida', body: 'Bela colocou abacate e café na lista.' },
  { label: 'contas', icon: '✓', title: 'uma coisa a menos para pensar', body: 'Lucas pagou a internet. Tudo anotado.' },
  { label: 'desejos', icon: '✦', title: 'olha o que entrou nos planos', body: 'Bela quer um abajur para a sala.' },
]

export function PushSettings({ roomId, me }: { roomId?: string; me: string }) {
  const [state, setState] = useState<PushState>('desligado')
  const [loading, setLoading] = useState(Boolean(roomId))
  const [busy, setBusy] = useState(false)
  const [preview, setPreview] = useState(0)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const reduced = useReducedMotion()
  useEffect(() => {
    if (!roomId) return
    let alive = true
    const refresh = () => {
      if (document.visibilityState === 'hidden') return
      void pushState(roomId, me).then((next) => { if (alive) setState(next) })
        .catch((e: Error) => { if (alive) setError(e.message) })
        .finally(() => { if (alive) setLoading(false) })
    }
    refresh()
    document.addEventListener('visibilitychange', refresh)
    return () => { alive = false; document.removeEventListener('visibilitychange', refresh) }
  }, [roomId, me])

  const run = (action: () => Promise<unknown>) => {
    setBusy(true); setError(''); setSent(false)
    void action().catch((e: Error) => setError(e.message || 'Não deu certo. Tente novamente.')).finally(() => setBusy(false))
  }
  const copy = COPY[state]
  return <section className="push-settings" aria-labelledby="push-heading">
    <div className="section-eyebrow"><span>avisos no celular</span><span className={`connection-dot ${state === 'ligado' ? 'is-connected' : ''}`}>{loading ? 'conferindo' : state === 'ligado' ? 'conectado' : 'opcional'}</span></div>
    <div className="push-preview-area">
      <div className="push-preview-tabs" role="tablist" aria-label="Exemplos de avisos">
        {PREVIEWS.map((p, i) => <button key={p.label} id={`preview-tab-${i}`} role="tab" aria-selected={preview === i} aria-controls="push-preview" tabIndex={preview === i ? 0 : -1}
          onKeyDown={(e) => { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); const next = (i + (e.key === 'ArrowRight' ? 1 : 2)) % 3; setPreview(next); document.getElementById(`preview-tab-${next}`)?.focus() } }}
          onClick={() => setPreview(i)}>{preview === i && <motion.span className="preview-selection" layoutId="preview-selection" transition={{ duration: reduced ? 0 : 0.2 }} /> }<span>{p.label}</span></button>)}
      </div>
      <div id="push-preview" role="tabpanel" aria-labelledby={`preview-tab-${preview}`}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={preview} className="push-preview" initial={{ opacity: 0, y: reduced ? 0 : 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: reduced ? 0 : -4 }} transition={{ duration: reduced ? 0 : 0.16 }}>
            <span className="push-app-icon" aria-hidden>{PREVIEWS[preview].icon}</span>
            <div><div className="push-preview-meta"><b>despensa</b><span>agora · exemplo</span></div><strong>{PREVIEWS[preview].title}</strong><p>{PREVIEWS[preview].body}</p></div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
    <h3 id="push-heading">{copy.title}</h3>
    <p className="push-detail">{roomId ? copy.detail : 'Esta é uma prévia. No app da sua sala, você pode conectar o aparelho e enviar um aviso de teste.'}</p>
    <div className="push-actions">
      {roomId && copy.action && <button className="button-primary" disabled={busy || loading} onClick={() => run(async () => setState(await enablePush(roomId, me)))}>{busy ? 'conectando…' : copy.action}</button>}
      {roomId && state === 'ligado' && <><button className="button-primary" disabled={busy} onClick={() => run(async () => { await testPush(roomId); setSent(true) })}>{busy ? 'enviando…' : 'enviar um teste'}</button><button className="push-secondary" disabled={busy} onClick={() => run(async () => setState(await disablePush()))}>desligar</button></>}
      {roomId && (error || state === 'bloqueado') && <button className="push-secondary" disabled={busy} onClick={() => run(async () => setState(await pushState(roomId, me)))}>conferir novamente</button>}
    </div>
    <AnimatePresence>{(error || sent) && <motion.p className={`push-feedback${error ? ' is-error' : ''}`} role={error ? 'alert' : 'status'} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>{error || 'Teste enviado ao serviço de push. Confira os avisos do aparelho; o modo Foco pode silenciá-lo.'}</motion.p>}</AnimatePresence>
  </section>
}
