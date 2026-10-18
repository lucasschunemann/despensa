import { useEffect, useState } from 'react'
import { disablePush, enablePush, pushState, testPush, type PushState } from '../lib/push'
import { Group } from './ui'

const COPY: Record<PushState, { title: string; detail: string; action?: string }> = {
  ligado: { title: 'avisos ligados', detail: 'Novidades da lista, das contas e dos desejos chegam mesmo com o app fechado.' },
  desligado: { title: 'avisos desligados', detail: 'Saiba quando a outra pessoa adicionar algo ou pagar uma conta.', action: 'ativar avisos' },
  reconectar: { title: 'reconectar este aparelho', detail: 'A permissão existe. Falta conectar este aparelho à sua casa.', action: 'reconectar aparelho' },
  bloqueado: { title: 'avisos bloqueados', detail: 'Abra Ajustes, Notificações, despensa, e permita os avisos. Depois volte aqui.' },
  'instale-primeiro': { title: 'adicione à tela de início', detail: 'No Safari, toque em Compartilhar e depois em Adicionar à Tela de Início. Abra o app pelo novo ícone para ativar. Requer iOS 16.4 ou posterior.' },
  indisponível: { title: 'avisos indisponíveis aqui', detail: 'No iPhone, use o app da tela inicial com iOS 16.4 ou posterior. O endereço precisa usar HTTPS.' },
  configurar: { title: 'avisos ainda não configurados', detail: 'Falta concluir a configuração do serviço. A lista e as contas continuam funcionando.' },
}

export function PushSettings({ roomId, me }: { roomId?: string; me: string }) {
  const [state, setState] = useState<PushState>('desligado')
  const [loading, setLoading] = useState(Boolean(roomId))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

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

  return (
    <Group title="avisos no celular">
      <div className="group-pad push">
        <strong>{loading ? 'conferindo…' : copy.title}</strong>
        <p className="push-detail">{roomId ? copy.detail : 'Esta é uma prévia. Na sua casa, você conecta o aparelho e envia um aviso de teste.'}</p>
        <div className="push-actions">
          {roomId && copy.action && <button className="btn btn-primary" disabled={busy || loading} onClick={() => run(async () => setState(await enablePush(roomId, me)))}>{busy ? 'conectando…' : copy.action}</button>}
          {roomId && state === 'ligado' && (
            <>
              <button className="btn btn-tinted" disabled={busy} onClick={() => run(async () => { await testPush(roomId); setSent(true) })}>{busy ? 'enviando…' : 'enviar um teste'}</button>
              <button className="btn btn-plain" disabled={busy} onClick={() => run(async () => setState(await disablePush()))}>desligar</button>
            </>
          )}
          {roomId && (error || state === 'bloqueado') && <button className="btn btn-plain" disabled={busy} onClick={() => run(async () => setState(await pushState(roomId, me)))}>conferir de novo</button>}
        </div>
        {(error || sent) && <p className={error ? 'form-error' : 'push-detail'} role={error ? 'alert' : 'status'}>{error || 'Teste enviado. Confira os avisos do aparelho; o modo Foco pode silenciá-lo.'}</p>}
      </div>
    </Group>
  )
}
