import { useEffect, useState } from 'react'
import { disablePush, enablePush, pushState, testPush, type PushState } from '../lib/push'
import { Icon, Row, Section, Switch, Tile } from './ui'

const HELP: Record<PushState, string> = {
  ligado: 'Novidades do mercado, das contas e dos desejos chegam mesmo com o app fechado.',
  desligado: 'Saiba quando a outra pessoa adicionar algo ou pagar uma conta.',
  reconectar: 'A permissão existe. Falta conectar este aparelho à sua casa.',
  bloqueado: 'Os avisos estão bloqueados. Abra Ajustes, Notificações, despensa, e permita. Depois volte aqui.',
  'instale-primeiro': 'No Safari, toque em Compartilhar e em Adicionar à Tela de Início. Abra o app pelo novo ícone para ligar os avisos (iOS 16.4 ou posterior).',
  indisponível: 'No iPhone, use o app da Tela de Início com iOS 16.4 ou posterior. O endereço precisa usar HTTPS.',
  configurar: 'O serviço de avisos ainda não foi configurado. O resto do app funciona normalmente.',
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
    void action().catch((e: Error) => setError(e.message || 'Não deu certo. Tente de novo.')).finally(() => setBusy(false))
  }

  const canToggle = Boolean(roomId) && (state === 'ligado' || state === 'desligado' || state === 'reconectar')
  const footer = error || (sent ? 'Teste enviado. Se não chegar, confira se o modo Foco está ligado.' : roomId ? HELP[state] : 'Na sua casa, você liga os avisos deste aparelho aqui.')

  return (
    <Section header="Avisos" footer={footer}>
      <Row icon={<Tile color="red"><Icon name="bell" size={18} /></Tile>} title="Avisos no celular" detail={loading ? 'Conferindo…' : undefined}>
        {canToggle && (
          <Switch
            checked={state === 'ligado'}
            label="Avisos no celular"
            onChange={(on) => run(async () => setState(on ? await enablePush(roomId!, me) : await disablePush()))}
          />
        )}
      </Row>
      {roomId && state === 'ligado' && <Row title={<span className="link">{busy ? 'Enviando…' : 'Enviar um aviso de teste'}</span>} onClick={() => run(async () => { await testPush(roomId); setSent(true) })} disabled={busy} />}
      {roomId && (error || state === 'bloqueado') && <Row title={<span className="link">Conferir de novo</span>} onClick={() => run(async () => setState(await pushState(roomId, me)))} disabled={busy} />}
    </Section>
  )
}
