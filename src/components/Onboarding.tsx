import { AnimatePresence, motion, useAnimationControls } from 'motion/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { haptic } from '../lib/haptics'
import { sound } from '../lib/sound'
import { Avatar, Mascot } from './Avatar'
import { CloseIcon } from './ControlIcons'

type Props = {
  open: boolean
  name: string
  replay?: boolean
  onDismiss: () => void
}

const EASE = [0.16, 1, 0.3, 1] as const
const MOLA = { type: 'spring' as const, stiffness: 420, damping: 26 }
const MOLA_MACIA = { type: 'spring' as const, stiffness: 180, damping: 20 }

/**
 * A apresentação não é um carrossel de cartões: cada cena é o gesto de verdade do
 * módulo, feito pela pessoa. Por isso não há "continuar" antes da hora — o botão
 * nasce depois que o gesto acontece.
 *
 * Aqui `prefers-reduced-motion` é ignorado de propósito, a pedido do Lucas: a
 * apresentação É a animação. O resto do app continua respeitando.
 */
const CENAS = ['abertura', 'escrever', 'pegar', 'pagar', 'desejar', 'fim'] as const
type Cena = (typeof CENAS)[number]

export function Onboarding({ open, name, replay = false, onDismiss }: Props) {
  const dialog = useRef<HTMLDivElement>(null)
  const [passo, setPasso] = useState(0)
  const [faisca, setFaisca] = useState<{ id: number; x: number; y: number } | null>(null)
  const cena = CENAS[passo]

  useEffect(() => {
    if (!open) return
    setPasso(0)
    const anterior = document.activeElement as HTMLElement | null
    const palco = document.querySelector<HTMLElement>('.stage')
    if (palco) palco.inert = true
    requestAnimationFrame(() => dialog.current?.focus())
    return () => {
      if (palco) palco.inert = false
      anterior?.focus()
    }
  }, [open])

  const avancar = useCallback(() => {
    setPasso((atual) => {
      if (atual >= CENAS.length - 1) return atual
      haptic('medium')
      sound.open()
      return atual + 1
    })
  }, [])

  const voltar = useCallback(() => {
    setPasso((atual) => {
      if (atual <= 0) return atual
      haptic('light')
      sound.close()
      return atual - 1
    })
  }, [])

  function teclas(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'ArrowRight') { event.preventDefault(); avancar() }
    if (event.key === 'ArrowLeft') { event.preventDefault(); voltar() }
    if (event.key === 'Escape') onDismiss()
    if (event.key !== 'Tab') return
    const focaveis = Array.from(dialog.current?.querySelectorAll<HTMLElement>('button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])') ?? [])
    if (!focaveis.length) return
    const primeiro = focaveis[0]
    const ultimo = focaveis[focaveis.length - 1]
    if (event.shiftKey && document.activeElement === primeiro) { event.preventDefault(); ultimo.focus() }
    if (!event.shiftKey && document.activeElement === ultimo) { event.preventDefault(); primeiro.focus() }
  }

  // Tocar em qualquer lugar espalha notas: o app inteiro responde ao dedo.
  function soltarNotas(event: React.PointerEvent<HTMLDivElement>) {
    sound.unlock()
    setFaisca({ id: Date.now(), x: event.clientX, y: event.clientY })
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="ob-layer"
          data-cena={cena}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.04, filter: 'blur(12px)' }}
          transition={{ duration: .45, ease: EASE }}
          onPointerDown={soltarNotas}
        >
          <Fundo cena={cena} />

          <motion.div
            ref={dialog}
            className="ob"
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby="ob-titulo"
            onKeyDown={teclas}
          >
            <header className="ob-topo">
              <Pauta passo={passo} total={CENAS.length} onIr={(i) => { if (i < passo) { setPasso(i); haptic('light'); sound.close() } }} />
              <button type="button" className="ob-pular" onClick={onDismiss} aria-label="Pular apresentação">
                <span>pular</span><CloseIcon size={15} />
              </button>
            </header>

            <div className="ob-palco">
              <AnimatePresence mode="wait">
                {cena === 'abertura' && <Abertura key="abertura" nome={name} replay={replay} onPronto={avancar} />}
                {cena === 'escrever' && <Escrever key="escrever" onPronto={avancar} />}
                {cena === 'pegar' && <Pegar key="pegar" onPronto={avancar} />}
                {cena === 'pagar' && <Pagar key="pagar" onPronto={avancar} />}
                {cena === 'desejar' && <Desejar key="desejar" onPronto={avancar} />}
                {cena === 'fim' && <Fim key="fim" replay={replay} onPronto={onDismiss} />}
              </AnimatePresence>
            </div>

            {passo > 0 && passo < CENAS.length - 1 && (
              <motion.button
                type="button"
                className="ob-voltar"
                aria-label="Voltar uma etapa"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                whileTap={{ scale: .9 }}
                onClick={voltar}
              >
                <svg viewBox="0 0 24 24" aria-hidden><path d="m14.5 6-6 6 6 6" /></svg>
              </motion.button>
            )}
          </motion.div>

          <AnimatePresence>{faisca && <Notas key={faisca.id} x={faisca.x} y={faisca.y} onFim={() => setFaisca(null)} />}</AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/* ── moldura ─────────────────────────────────────────────────────────── */

/** O fundo muda de língua junto com a cena, como os módulos do app fazem. */
function Fundo({ cena }: { cena: Cena }) {
  return (
    <div className="ob-fundo" aria-hidden>
      <AnimatePresence>
        {cena === 'desejar' && (
          <motion.div key="nevoa" className="ob-nevoa" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: .8 }}>
            <motion.i animate={{ x: [0, 40, -20, 0], y: [0, -30, 20, 0] }} transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }} />
            <motion.i animate={{ x: [0, -50, 30, 0], y: [0, 25, -35, 0] }} transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }} />
            <motion.i animate={{ x: [0, 25, -40, 0], y: [0, 35, 10, 0] }} transition={{ duration: 26, repeat: Infinity, ease: 'easeInOut' }} />
          </motion.div>
        )}
        {cena === 'pagar' && (
          <motion.div key="grade" className="ob-grade" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: .5 }} />
        )}
      </AnimatePresence>
    </div>
  )
}

/** Progresso em pauta musical: o camarão pula de nota em nota. */
function Pauta({ passo, total, onIr }: { passo: number; total: number; onIr: (i: number) => void }) {
  return (
    <div className="ob-pauta" role="progressbar" aria-label="Progresso da apresentação" aria-valuemin={1} aria-valuemax={total} aria-valuenow={passo + 1}>
      <span className="ob-pauta-linha" aria-hidden />
      {Array.from({ length: total }, (_, i) => (
        <button
          key={i}
          type="button"
          className={`ob-nota${i <= passo ? ' is-feita' : ''}`}
          tabIndex={-1}
          aria-hidden
          onClick={() => onIr(i)}
        >
          <motion.i animate={{ scale: i === passo ? 1 : i < passo ? .72 : .5, opacity: i <= passo ? 1 : .32 }} transition={MOLA} />
          {i === passo && (
            <motion.span className="ob-pauta-camarao" layoutId="ob-camarao" transition={MOLA}>
              <Mascot size={30} />
            </motion.span>
          )}
        </button>
      ))}
    </div>
  )
}

/** Notas que saem do dedo a cada toque, em qualquer lugar da tela. */
function Notas({ x, y, onFim }: { x: number; y: number; onFim: () => void }) {
  useEffect(() => { const t = setTimeout(onFim, 950); return () => clearTimeout(t) }, [onFim])
  return (
    <div className="ob-notas" style={{ left: x, top: y }} aria-hidden>
      {[0, 1, 2, 3].map((i) => (
        <motion.i
          key={i}
          initial={{ opacity: 0, scale: .4, x: 0, y: 0, rotate: 0 }}
          animate={{ opacity: [0, 1, 0], scale: [.4, 1, .8], x: (i - 1.5) * 34 + (i % 2 ? 10 : -10), y: -46 - i * 16, rotate: (i % 2 ? 1 : -1) * 28 }}
          transition={{ duration: .9, delay: i * .045, ease: 'easeOut' }}
        >
          {i % 2 ? '♪' : '♫'}
        </motion.i>
      ))}
    </div>
  )
}

function Fala({ titulo, linha, dica }: { titulo: React.ReactNode; linha?: string; dica?: string }) {
  return (
    <motion.div className="ob-fala" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ ...MOLA_MACIA, delay: .12 }}>
      <h1 id="ob-titulo">{titulo}</h1>
      {linha && <p>{linha}</p>}
      {dica && <motion.span className="ob-dica" animate={{ opacity: [.45, 1, .45] }} transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}>{dica}</motion.span>}
    </motion.div>
  )
}

function Botao({ children, onClick, tom = 'cheio' }: { children: React.ReactNode; onClick: () => void; tom?: 'cheio' | 'vazio' }) {
  return (
    <motion.button
      type="button"
      className={`ob-botao${tom === 'vazio' ? ' is-vazio' : ''}`}
      initial={{ opacity: 0, y: 22, scale: .9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={MOLA}
      whileTap={{ scale: .95 }}
      onClick={onClick}
    >
      {children}
    </motion.button>
  )
}

/* ── cena 1: o camarão chega ─────────────────────────────────────────── */

function Abertura({ nome, replay, onPronto }: { nome: string; replay: boolean; onPronto: () => void }) {
  const palavra = 'despensa'.split('')
  return (
    <motion.section className="ob-cena ob-abertura" exit={{ opacity: 0, scale: .9, filter: 'blur(8px)' }} transition={{ duration: .4 }}>
      <motion.div
        className="ob-chegada"
        initial={{ y: -260, rotate: -25, scale: .6 }}
        animate={{ y: 0, rotate: [-25, 12, -6, 0], scale: 1 }}
        transition={{ type: 'spring', stiffness: 220, damping: 12, mass: .8 }}
      >
        <motion.div animate={{ rotate: [0, -5, 4, 0], y: [0, -10, 0] }} transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut' }}>
          <Mascot size={168} />
        </motion.div>
        {[0, 1, 2, 3, 4].map((i) => (
          <motion.i
            key={i}
            className="ob-nota-solta"
            initial={{ opacity: 0, x: 40, y: 0, scale: .5 }}
            animate={{ opacity: [0, 1, 0], x: 70 + i * 26, y: -30 - i * 22, scale: [.5, 1.1, .7], rotate: i % 2 ? 22 : -18 }}
            transition={{ duration: 2.6, delay: .7 + i * .26, repeat: Infinity, repeatDelay: .6, ease: 'easeOut' }}
          >
            {i % 2 ? '♪' : '♫'}
          </motion.i>
        ))}
      </motion.div>

      <motion.h1 id="ob-titulo" className="ob-palavra" aria-label="despensa">
        {palavra.map((letra, i) => (
          <motion.span
            key={i}
            aria-hidden
            initial={{ opacity: 0, y: 40, rotate: i % 2 ? 14 : -14, filter: 'blur(6px)' }}
            animate={{ opacity: 1, y: 0, rotate: 0, filter: 'blur(0px)' }}
            transition={{ ...MOLA, delay: .55 + i * .055 }}
          >
            {letra}
          </motion.span>
        ))}
      </motion.h1>

      <motion.p className="ob-sub" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.15 }}>
        {replay ? 'de novo, do começo' : `oi, ${nome}. a casa inteira em cinco gestos.`}
      </motion.p>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.35 }}>
        <Botao onClick={onPronto}>bora</Botao>
      </motion.div>
    </motion.section>
  )
}

/* ── cena 2: escrever ────────────────────────────────────────────────── */

const EXEMPLOS = [
  { texto: '2 leites', destino: 'mercado', emoji: '🥛', indice: 0 },
  { texto: 'luz 180 dia 10', destino: 'contas', emoji: '🧾', indice: 1 },
  { texto: 'poltrona 1.490', destino: 'desejos', emoji: '🛋️', indice: 2 },
]
const DESTINOS = ['mercado', 'contas', 'desejos']

function Escrever({ onPronto }: { onPronto: () => void }) {
  const [enviados, setEnviados] = useState<number[]>([])
  const [voando, setVoando] = useState<(typeof EXEMPLOS)[number] | null>(null)
  const [aceso, setAceso] = useState<number | null>(null)

  function enviar(ex: (typeof EXEMPLOS)[number]) {
    if (enviados.includes(ex.indice) || voando) return
    sound.unlock(); sound.add(); haptic('medium')
    setVoando(ex)
    setTimeout(() => {
      setAceso(ex.indice)
      sound.drop(); haptic('light')
      setVoando(null)
      setEnviados((antes) => [...antes, ex.indice])
      setTimeout(() => setAceso(null), 700)
    }, 620)
  }

  const restantes = EXEMPLOS.filter((e) => !enviados.includes(e.indice))

  return (
    <motion.section className="ob-cena" exit={{ opacity: 0, x: -60, filter: 'blur(6px)' }} transition={{ duration: .34 }}>
      <Fala
        titulo={<>um campo só.<br />três destinos.</>}
        dica={restantes.length ? 'toque num exemplo e veja onde ele cai' : undefined}
      />

      <div className="ob-destinos">
        {DESTINOS.map((nome, i) => (
          <motion.div
            key={nome}
            className={`ob-destino${enviados.includes(i) ? ' is-cheio' : ''}`}
            animate={aceso === i ? { scale: [1, 1.22, 1], rotate: [0, -6, 4, 0] } : { scale: 1 }}
            transition={MOLA}
          >
            <span className="ob-destino-caixa">
              <AnimatePresence>
                {enviados.includes(i) && (
                  <motion.b initial={{ scale: 0, rotate: -40 }} animate={{ scale: 1, rotate: 0 }} transition={MOLA}>
                    {EXEMPLOS[i].emoji}
                  </motion.b>
                )}
              </AnimatePresence>
            </span>
            <small>{nome}</small>
          </motion.div>
        ))}
      </div>

      <div className="ob-campo">
        <AnimatePresence>
          {voando && (
            <motion.span
              className="ob-voando"
              initial={{ opacity: 1, x: 0, y: 0, scale: 1 }}
              animate={{ opacity: [1, 1, 0], x: (voando.indice - 1) * 108, y: -150, scale: [1, 1.05, .35], rotate: (voando.indice - 1) * 14 }}
              exit={{ opacity: 0 }}
              transition={{ duration: .62, ease: EASE }}
            >
              {voando.texto}
            </motion.span>
          )}
        </AnimatePresence>
        <span className="ob-campo-cursor" />
        <span className="ob-campo-vazio">o que você quer guardar?</span>
      </div>

      <div className="ob-exemplos">
        {EXEMPLOS.map((ex) => (
          <motion.button
            key={ex.texto}
            type="button"
            className={`ob-exemplo${enviados.includes(ex.indice) ? ' is-usado' : ''}`}
            disabled={enviados.includes(ex.indice)}
            whileTap={{ scale: .92 }}
            animate={enviados.includes(ex.indice) ? { opacity: .3, scale: .94 } : { opacity: 1, scale: 1 }}
            onClick={() => enviar(ex)}
          >
            {ex.texto}
          </motion.button>
        ))}
      </div>

      <AnimatePresence>
        {enviados.length > 0 && <Botao key="ok" onClick={onPronto}>{enviados.length === 3 ? 'entendeu tudo' : 'continuar'}</Botao>}
      </AnimatePresence>
    </motion.section>
  )
}

/* ── cena 3: pegar (arrastar para a direita) ─────────────────────────── */

const COMPRAS = [
  { nome: 'Leite integral', emoji: '🥛' },
  { nome: 'Pão de forma', emoji: '🍞' },
  { nome: 'Café em grão', emoji: '☕' },
]

function Pegar({ onPronto }: { onPronto: () => void }) {
  const [pegos, setPegos] = useState<string[]>([])
  const carrinho = useAnimationControls()

  function pegar(nome: string) {
    if (pegos.includes(nome)) return
    sound.unlock(); sound.pick(); haptic('medium')
    setPegos((antes) => [...antes, nome])
    carrinho.start({ scale: [1, 1.3, 1], rotate: [0, -8, 6, 0], transition: { duration: .5 } })
  }

  const tudo = pegos.length === COMPRAS.length

  useEffect(() => {
    if (!tudo) return
    sound.complete(); haptic('success')
  }, [tudo])

  return (
    <motion.section className="ob-cena" exit={{ opacity: 0, y: -50, filter: 'blur(6px)' }} transition={{ duration: .34 }}>
      <Fala titulo={<>no mercado,<br />arraste para pegar.</>} dica={tudo ? undefined : 'puxe a linha para a direita →'} />

      <motion.div className="ob-carrinho" animate={carrinho}>
        <CarrinhoIcone />
        <motion.b key={pegos.length} initial={{ scale: 0, y: -8 }} animate={{ scale: 1, y: 0 }} transition={MOLA}>
          {pegos.length}
        </motion.b>
        <div className="ob-carrinho-emojis">
          <AnimatePresence>
            {pegos.map((nome, i) => {
              const item = COMPRAS.find((c) => c.nome === nome)!
              return (
                <motion.i
                  key={nome}
                  initial={{ opacity: 0, scale: 0, y: 26 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ ...MOLA, delay: i * .04 }}
                >
                  {item.emoji}
                </motion.i>
              )
            })}
          </AnimatePresence>
        </div>
      </motion.div>

      <div className="ob-lista">
        {COMPRAS.map((item, i) => (
          <LinhaPegar key={item.nome} item={item} pego={pegos.includes(item.nome)} atraso={i * .08} onPegar={() => pegar(item.nome)} primeira={i === 0 && pegos.length === 0} />
        ))}
      </div>

      <AnimatePresence>
        {pegos.length > 0 && <Botao key="ok" onClick={onPronto}>{tudo ? 'lista zerada' : 'continuar'}</Botao>}
      </AnimatePresence>
    </motion.section>
  )
}

function LinhaPegar({ item, pego, atraso, onPegar, primeira }: { item: { nome: string; emoji: string }; pego: boolean; atraso: number; onPegar: () => void; primeira: boolean }) {
  const [x, setX] = useState(0)
  const inicio = useRef<number | null>(null)
  // Regra do app: arrastar nunca vira toque. Sem isso, soltar o arrasto também
  // dispararia o clique.
  const arrastou = useRef(false)

  return (
    <motion.div
      className={`ob-linha${pego ? ' is-pego' : ''}`}
      initial={{ opacity: 0, x: -30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ ...MOLA_MACIA, delay: atraso }}
    >
      <motion.div
        className="ob-linha-frente"
        animate={{ x: pego ? 0 : x }}
        transition={x === 0 ? MOLA : { duration: 0 }}
        onPointerDown={(e) => {
          if (pego) return
          inicio.current = e.clientX
          arrastou.current = false
          e.currentTarget.setPointerCapture?.(e.pointerId)
        }}
        onPointerMove={(e) => {
          if (pego || inicio.current === null) return
          const desloca = e.clientX - inicio.current
          if (Math.abs(desloca) > 6) arrastou.current = true
          setX(Math.max(0, Math.min(150, desloca)))
        }}
        onPointerUp={() => {
          if (pego) return
          if (x > 72) onPegar()
          inicio.current = null
          setX(0)
        }}
        onPointerCancel={() => { inicio.current = null; arrastou.current = false; setX(0) }}
        onClick={() => {
          if (pego) return
          if (arrastou.current) { arrastou.current = false; return }
          onPegar()
        }}
      >
        <span className="ob-linha-emoji">{item.emoji}</span>
        <span className="ob-linha-nome">
          {item.nome}
          <motion.i className="ob-risco" initial={false} animate={{ scaleX: pego ? 1 : 0 }} transition={{ duration: .3, ease: EASE }} />
        </span>
        <span className="ob-linha-circulo">
          <motion.svg viewBox="0 0 24 24" initial={false} animate={{ scale: pego ? 1 : .9 }}>
            <motion.circle cx="12" cy="12" r="10" initial={false} animate={{ fill: pego ? 'var(--ink)' : 'transparent' }} />
            <motion.path d="m7.5 12.4 3 3 6-6.4" initial={false} animate={{ pathLength: pego ? 1 : 0 }} transition={{ duration: .28, ease: EASE }} />
          </motion.svg>
        </span>
        {primeira && (
          <motion.span
            className="ob-dedo"
            aria-hidden
            animate={{ x: [0, 96, 0], opacity: [0, 1, 1, 0] }}
            transition={{ duration: 2.2, repeat: Infinity, repeatDelay: .5, times: [0, .45, .75, 1], ease: 'easeInOut' }}
          />
        )}
      </motion.div>
      <span className="ob-linha-atras">pegar</span>
    </motion.div>
  )
}

/* ── cena 4: pagar (o bilhete) ───────────────────────────────────────── */

function Pagar({ onPronto }: { onPronto: () => void }) {
  const [fase, setFase] = useState<'parado' | 'lendo' | 'pago'>('parado')

  const [rasgou, setRasgou] = useState(false)

  function pagar() {
    if (fase !== 'parado') return
    sound.unlock(); sound.scan(); haptic('light')
    setFase('lendo')
    setTimeout(() => {
      setFase('pago')
      sound.stamp(); haptic('success')
      setTimeout(() => sound.tear(), 320)
      setTimeout(() => sound.cash(), 460)
      // o botão só entra quando o canhoto já caiu, senão atropela a animação
      setTimeout(() => setRasgou(true), 1000)
    }, 620)
  }

  return (
    <motion.section className="ob-cena" exit={{ opacity: 0, scale: .92, filter: 'blur(6px)' }} transition={{ duration: .34 }}>
      <Fala titulo={<>a conta é<br />um bilhete.</>} dica={fase === 'parado' ? 'toque no canhoto para pagar' : undefined} />

      <motion.div
        className="ob-bilhete"
        initial={{ y: -230, rotate: -3, opacity: 0 }}
        animate={{ y: 0, rotate: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 130, damping: 18 }}
      >
        <div className="ob-bilhete-corpo">
          <small>conta da casa</small>
          <strong>internet</strong>
          <span className="ob-bilhete-valor">R$ 129,90</span>
          <div className="ob-codigo" aria-hidden>
            {Array.from({ length: 34 }, (_, i) => <i key={i} style={{ width: (i * 7) % 3 + 1 }} />)}
          </div>
          <AnimatePresence>
            {fase === 'lendo' && (
              <motion.span
                className="ob-laser"
                initial={{ x: '-10%', opacity: 0 }}
                animate={{ x: '110%', opacity: [0, 1, 1, 0] }}
                exit={{ opacity: 0 }}
                transition={{ duration: .6, ease: 'linear' }}
              />
            )}
          </AnimatePresence>
          <AnimatePresence>
            {fase === 'pago' && (
              <motion.span
                className="ob-carimbo"
                initial={{ scale: 2.4, opacity: 0, rotate: -22 }}
                animate={{ scale: 1, opacity: 1, rotate: -12 }}
                transition={{ type: 'spring', stiffness: 520, damping: 16 }}
              >
                PAGO
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        <motion.button
          type="button"
          className="ob-canhoto"
          aria-label="Pagar a conta"
          onClick={pagar}
          whileTap={{ scale: .96 }}
          animate={fase === 'pago' ? { y: 260, rotate: 26, opacity: 0 } : { y: 0, rotate: 0, opacity: 1 }}
          transition={fase === 'pago' ? { duration: .65, ease: [0.4, 0, 1, 1] } : MOLA}
        >
          <span>dia</span>
          <strong>15</strong>
        </motion.button>
      </motion.div>

      <AnimatePresence>
        {fase === 'pago' && (
          <>
            <div className="ob-dinheiro" aria-hidden key="grana">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <motion.i
                  key={i}
                  initial={{ opacity: 0, y: -20, x: (i - 2.5) * 44, rotate: 0 }}
                  animate={{ opacity: [0, 1, 0], y: 210, rotate: (i % 2 ? 1 : -1) * 90 }}
                  transition={{ duration: 1.3, delay: i * .07, ease: 'easeIn' }}
                >
                  💸
                </motion.i>
              ))}
            </div>
          </>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {rasgou && <Botao key="ok" onClick={onPronto}>continuar</Botao>}
      </AnimatePresence>
    </motion.section>
  )
}

/* ── cena 5: desejar ─────────────────────────────────────────────────── */

function Desejar({ onPronto }: { onPronto: () => void }) {
  const [quem, setQuem] = useState<string[]>([])
  const dois = quem.length === 2

  function querer() {
    const proximo = quem.length === 0 ? ['Lucas'] : ['Lucas', 'Bela']
    if (quem.length >= 2) return
    sound.unlock(); sound.shimmer(); haptic(quem.length === 1 ? 'success' : 'light')
    setQuem(proximo)
  }

  return (
    <motion.section className="ob-cena" exit={{ opacity: 0, y: -60, filter: 'blur(10px)' }} transition={{ duration: .4 }}>
      <Fala titulo={<>o que a casa<br />ainda quer.</>} dica={dois ? undefined : quem.length ? 'agora toque pela Bela' : 'toque no coração'} />

      <motion.div className={`ob-vidro${dois ? ' is-dois' : ''}`} initial={{ opacity: 0, y: 40, scale: .9 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={MOLA_MACIA}>
        <motion.div className="ob-vidro-halo" animate={dois ? { opacity: [.4, .9, .4], scale: [1, 1.06, 1] } : { opacity: 0 }} transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }} />
        <span className="ob-vidro-foto">🛋️</span>
        <div className="ob-vidro-texto">
          <strong>poltrona de leitura</strong>
          <span>R$ 1.490 · dá em outubro</span>
        </div>
        <motion.button type="button" className="ob-coracao" onClick={querer} whileTap={{ scale: .82 }} aria-label="Quero também">
          <motion.svg viewBox="0 0 24 24" animate={{ scale: quem.length ? [1, 1.35, 1] : 1 }} transition={{ duration: .45 }}>
            <motion.path
              d="M12 20.8 4.6 13.4a4.75 4.75 0 0 1 6.7-6.7l.7.7.7-.7a4.75 4.75 0 0 1 6.7 6.7Z"
              animate={{ fill: quem.length ? 'var(--ob-lilas)' : 'transparent' }}
              transition={{ duration: .3 }}
            />
          </motion.svg>
        </motion.button>

        <div className="ob-quem">
          <AnimatePresence>
            {quem.map((pessoa, i) => (
              <motion.span key={pessoa} initial={{ scale: 0, y: 12 }} animate={{ scale: 1, y: 0 }} transition={{ ...MOLA, delay: i * .05 }}>
                <Avatar person={pessoa} size={22} />
              </motion.span>
            ))}
          </AnimatePresence>
        </div>
      </motion.div>

      <div className="ob-coracoes" aria-hidden>
        <AnimatePresence>
          {quem.length > 0 && [0, 1, 2, 3, 4].map((i) => (
            <motion.i
              key={`${quem.length}-${i}`}
              initial={{ opacity: 0, y: 0, x: (i - 2) * 30, scale: .5 }}
              animate={{ opacity: [0, 1, 0], y: -150 - i * 20, scale: [.5, 1, .7], x: (i - 2) * 46 }}
              transition={{ duration: 1.7, delay: i * .1, ease: 'easeOut' }}
            >
              ♥
            </motion.i>
          ))}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {quem.length > 0 && <Botao key="ok" onClick={onPronto}>{dois ? 'os dois querem' : 'continuar'}</Botao>}
      </AnimatePresence>
    </motion.section>
  )
}

/* ── cena 6: o fim vira a barra do app ───────────────────────────────── */

function Fim({ replay, onPronto }: { replay: boolean; onPronto: () => void }) {
  useEffect(() => {
    const t = setTimeout(() => { sound.complete(); haptic('success') }, 500)
    return () => clearTimeout(t)
  }, [])

  return (
    <motion.section className="ob-cena ob-fim" exit={{ opacity: 0 }}>
      <motion.div
        className="ob-fim-camarao"
        initial={{ scale: .4, opacity: 0, rotate: -30 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 14 }}
      >
        <motion.div animate={{ y: [0, -14, 0], rotate: [0, -4, 3, 0] }} transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}>
          <Mascot size={132} />
        </motion.div>
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <motion.i
            key={i}
            className="ob-nota-solta"
            initial={{ opacity: 0, scale: .4 }}
            animate={{ opacity: [0, 1, 0], x: Math.cos((i / 7) * Math.PI * 2) * 150, y: Math.sin((i / 7) * Math.PI * 2) * 120, scale: [.4, 1.2, .6], rotate: i * 40 }}
            transition={{ duration: 2.2, delay: .3 + i * .1, repeat: Infinity, repeatDelay: .4, ease: 'easeOut' }}
          >
            {i % 2 ? '♪' : '♫'}
          </motion.i>
        ))}
      </motion.div>

      <Fala titulo={<>pronto.<br />a casa é sua.</>} linha={replay ? 'era isso.' : 'mercado, contas e desejos moram na barra de baixo.'} />

      <motion.div className="ob-barra" initial={{ opacity: 0, y: 40, scale: .86 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ ...MOLA, delay: .45 }}>
        {ABAS.map((aba, i) => (
          <motion.span
            key={aba.nome}
            className={`ob-barra-aba${i === 0 ? ' is-atual' : ''}`}
            initial={{ opacity: 0, scale: .4 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ ...MOLA, delay: .6 + i * .07 }}
          >
            {aba.icone}
            <small>{aba.nome}</small>
          </motion.span>
        ))}
      </motion.div>

      <Botao onClick={onPronto}>{replay ? 'voltar ao app' : 'começar a usar'}</Botao>
    </motion.section>
  )
}

/* Os mesmos ícones preenchidos da barra de verdade, para o fim já ser o app. */
const ABAS = [
  { nome: 'início', icone: <svg viewBox="0 0 24 24" aria-hidden><path d="M3.8 10.9 12 3.7l8.2 7.2V20.4h-5.9v-5.8H9.7v5.8H3.8Z" /></svg> },
  { nome: 'mercado', icone: <svg viewBox="0 0 24 24" aria-hidden><path data-stroke d="M8.6 8.1a3.4 3.4 0 0 1 6.8 0" /><path d="M3.9 9.2h16.2l-1.4 10.1a1.4 1.4 0 0 1-1.4 1.2H6.7a1.4 1.4 0 0 1-1.4-1.2Z" /></svg> },
  { nome: 'contas', icone: <svg viewBox="0 0 24 24" aria-hidden><path fillRule="evenodd" clipRule="evenodd" d="M5.9 3.3h12.2v17a.7.7 0 0 1-1.1.6l-2.2-1.5-2.4 1.6a.8.8 0 0 1-.9 0l-2.3-1.6L7 20.9a.7.7 0 0 1-1.1-.6Zm2.9 4.4h6.4v1.7H8.8Zm0 4h6.4v1.7H8.8Z" /></svg> },
  { nome: 'desejos', icone: <svg viewBox="0 0 24 24" aria-hidden><path d="M12 20.8 4.6 13.4a4.75 4.75 0 0 1 6.7-6.7l.7.7.7-.7a4.75 4.75 0 0 1 6.7 6.7Z" /></svg> },
]

function CarrinhoIcone() {
  return <svg viewBox="0 0 24 24" aria-hidden><path d="M3 4h2.2l2.3 11h9.8l2-8H6.4" /><circle cx="10" cy="19" r="1.5" /><circle cx="17" cy="19" r="1.5" /></svg>
}
