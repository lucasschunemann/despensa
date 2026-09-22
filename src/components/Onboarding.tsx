import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
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

type Scene = {
  eyebrow: string
  title: string
  body: string
  art: ReactNode
}

const EASE = [0.16, 1, 0.3, 1] as const

export function Onboarding({ open, name, replay = false, onDismiss }: Props) {
  const reduced = useReducedMotion()
  const dialog = useRef<HTMLDivElement>(null)
  const primary = useRef<HTMLButtonElement>(null)
  const [step, setStep] = useState(0)
  const [direction, setDirection] = useState(1)
  const scenes: Scene[] = [
    {
      eyebrow: replay ? 'apresentação' : `olá, ${name}`,
      title: replay ? 'a casa toda em um só ritmo' : 'bem-vindo à despensa',
      body: 'Em menos de um minuto, veja como mercado, contas e desejos funcionam juntos.',
      art: <WelcomeArt reduced={reduced} />,
    },
    {
      eyebrow: 'anote do seu jeito',
      title: 'uma entrada. três destinos.',
      body: 'Escreva naturalmente. A despensa entende o que você quer guardar e manda para o lugar certo.',
      art: <CaptureArt reduced={reduced} />,
    },
    {
      eyebrow: 'a casa em sintonia',
      title: 'mudou aqui, apareceu lá',
      body: 'Lucas e Bela veem a mesma lista, os mesmos pagamentos e cada atualização no momento em que acontece.',
      art: <TogetherArt reduced={reduced} />,
    },
    {
      eyebrow: 'organize sem esforço',
      title: 'cada coisa encontra seu lugar',
      body: 'Pastas mantêm as contas claras. Progresso e estados mostram o que falta sem exigir cálculos.',
      art: <OrganizeArt reduced={reduced} />,
    },
    {
      eyebrow: 'pronto para começar',
      title: 'a rotina fica mais leve',
      body: 'Ative avisos quando quiser e use a barra inferior para chegar a qualquer parte do app.',
      art: <ReadyArt reduced={reduced} />,
    },
  ]

  useEffect(() => {
    if (!open) return
    setStep(0)
    setDirection(1)
    const previous = document.activeElement as HTMLElement | null
    const stage = document.querySelector<HTMLElement>('.stage')
    if (stage) stage.inert = true
    requestAnimationFrame(() => primary.current?.focus())
    return () => {
      if (stage) stage.inert = false
      previous?.focus()
    }
  }, [open])

  function move(next: number) {
    if (next < 0 || next >= scenes.length) return
    setDirection(next > step ? 1 : -1)
    setStep(next)
    haptic('light')
    sound.tick()
  }

  function next() {
    if (step === scenes.length - 1) {
      haptic('success')
      sound.add()
      onDismiss()
      return
    }
    move(step + 1)
  }

  function handleKeys(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'ArrowRight') { event.preventDefault(); next() }
    if (event.key === 'ArrowLeft') { event.preventDefault(); move(step - 1) }
    if (event.key === 'Escape') onDismiss()
    if (event.key !== 'Tab') return
    const focusable = Array.from(dialog.current?.querySelectorAll<HTMLElement>('button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])') ?? [])
    if (!focusable.length) return
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
    if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
  }

  const scene = scenes[step]
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="onboarding-layer" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduced ? 0 : .24 }}>
          <motion.div
            ref={dialog}
            className="onboarding"
            role="dialog"
            aria-modal="true"
            aria-labelledby="onboarding-title"
            initial={reduced ? false : { opacity: 0, scale: .985, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={reduced ? undefined : { opacity: 0, scale: .99, y: 12 }}
            transition={{ duration: reduced ? 0 : .42, ease: EASE }}
            onKeyDown={handleKeys}
          >
            <header className="onboarding-header">
              <div className="onboarding-brand"><Mascot size={46} /><span>despensa</span></div>
              <button type="button" className="onboarding-skip" onClick={onDismiss} aria-label="Pular apresentação"><span>pular</span><CloseIcon size={16} /></button>
            </header>

            <div className="onboarding-progress" role="progressbar" aria-label="Progresso da apresentação" aria-valuemin={1} aria-valuemax={scenes.length} aria-valuenow={step + 1}>
              {scenes.map((_, index) => <span key={index} className={index <= step ? 'is-filled' : ''}><motion.i initial={false} animate={{ scaleX: index < step ? 1 : index === step ? 1 : 0 }} transition={{ duration: reduced ? 0 : .46, ease: EASE }} /></span>)}
            </div>

            <div
              className="onboarding-stage"
              onPointerUp={(event) => {
                const start = Number(event.currentTarget.dataset.dragStart ?? event.clientX)
                const delta = event.clientX - start
                delete event.currentTarget.dataset.dragStart
                if (Math.abs(delta) < 54) return
                move(step + (delta < 0 ? 1 : -1))
              }}
              onPointerDown={(event) => { event.currentTarget.dataset.dragStart = String(event.clientX) }}
            >
              <AnimatePresence mode="wait" custom={direction}>
                <motion.section
                  key={step}
                  className="onboarding-scene"
                  custom={direction}
                  variants={{ enter: (dir: number) => ({ opacity: 0, x: reduced ? 0 : dir * 34 }), center: { opacity: 1, x: 0 }, exit: (dir: number) => ({ opacity: 0, x: reduced ? 0 : dir * -24 }) }}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: reduced ? 0 : .34, ease: EASE }}
                >
                  <div className="onboarding-art" aria-hidden>{scene.art}</div>
                  <div className="onboarding-copy">
                    <span className="onboarding-eyebrow">{scene.eyebrow}</span>
                    <h1 id="onboarding-title">{scene.title}</h1>
                    <p>{scene.body}</p>
                  </div>
                </motion.section>
              </AnimatePresence>
            </div>

            <footer className="onboarding-footer">
              <div className="onboarding-count"><strong>{String(step + 1).padStart(2, '0')}</strong><span>/ {String(scenes.length).padStart(2, '0')}</span></div>
              <div className="onboarding-actions">
                <AnimatePresence initial={false}>{step > 0 && <motion.button type="button" className="onboarding-back" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} onClick={() => move(step - 1)}>voltar</motion.button>}</AnimatePresence>
                <motion.button ref={primary} type="button" className="onboarding-next" whileTap={{ scale: .97 }} onClick={next}>
                  <span>{step === scenes.length - 1 ? (replay ? 'voltar ao app' : 'abrir minha despensa') : step === 0 ? 'começar' : 'continuar'}</span>
                  <ArrowIcon done={step === scenes.length - 1} />
                </motion.button>
              </div>
            </footer>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function WelcomeArt({ reduced }: { reduced: boolean | null }) {
  return <div className="onboarding-welcome-art">
    <motion.span className="welcome-orbit orbit-one" animate={reduced ? undefined : { rotate: 360 }} transition={{ duration: 13, repeat: Infinity, ease: 'linear' }} />
    <motion.span className="welcome-orbit orbit-two" animate={reduced ? undefined : { rotate: -360 }} transition={{ duration: 18, repeat: Infinity, ease: 'linear' }} />
    <motion.div className="welcome-mascot" initial={{ scale: .72, rotate: -8 }} animate={{ scale: 1, rotate: 0 }} transition={{ duration: .7, ease: EASE }}><Mascot size={190} /></motion.div>
    {[0, 1, 2].map((i) => <motion.i key={i} className={`welcome-note note-${i}`} animate={reduced ? undefined : { y: [0, -14, 0], opacity: [.35, 1, .35], rotate: [0, i % 2 ? 9 : -9, 0] }} transition={{ duration: 2.2 + i * .35, delay: i * .18, repeat: Infinity, ease: 'easeInOut' }}>♪</motion.i>)}
  </div>
}

function CaptureArt({ reduced }: { reduced: boolean | null }) {
  const [sample, setSample] = useState(0)
  const entries = [
    { text: '2 leites', label: 'mercado', icon: '✓' },
    { text: 'internet 129,90 dia 15', label: 'contas', icon: '15' },
    { text: 'poltrona 1.490', label: 'desejos', icon: '♡' },
  ]
  return <div className="capture-demo">
    <div className="capture-prompt"><span>adicione qualquer coisa</span><AnimatePresence mode="wait"><motion.strong key={sample} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: reduced ? 0 : .22 }}>{entries[sample].text}</motion.strong></AnimatePresence><motion.button type="button" tabIndex={-1} aria-hidden onClick={() => setSample((sample + 1) % entries.length)} whileTap={{ scale: .9 }}>↑</motion.button></div>
    <div className="capture-understood"><span className="capture-result-icon">{entries[sample].icon}</span><span>entendi como <strong>{entries[sample].label}</strong></span><motion.i key={sample} initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: reduced ? 0 : .55, ease: EASE }} /></div>
    <div className="capture-samples">{entries.map((entry, index) => <button type="button" tabIndex={-1} key={entry.label} className={sample === index ? 'is-active' : ''} onClick={() => setSample(index)}>{entry.label}</button>)}</div>
  </div>
}

function TogetherArt({ reduced }: { reduced: boolean | null }) {
  return <div className="together-demo">
    <div className="person-node"><Avatar person="Lucas" size={50} /><strong>Lucas</strong><span>adicionou café</span></div>
    <div className="sync-track"><motion.i animate={reduced ? undefined : { x: ['-50%', '50%', '-50%'] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}><BagIcon /></motion.i><span /></div>
    <div className="person-node"><Avatar person="Bela" size={50} /><strong>Bela</strong><span>já viu na lista</span></div>
    <motion.div className="live-pill" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: reduced ? 0 : .35 }}><i /> sincronizado agora</motion.div>
  </div>
}

function OrganizeArt({ reduced }: { reduced: boolean | null }) {
  const [folder, setFolder] = useState(0)
  const folders = [{ name: 'casa', total: 'R$ 2.167', progress: 72 }, { name: 'pessoal', total: 'R$ 179', progress: 35 }]
  return <div className="organize-demo">
    <div className="folder-tabs">{folders.map((item, index) => <button type="button" tabIndex={-1} key={item.name} className={folder === index ? 'is-active' : ''} onClick={() => setFolder(index)}>{folder === index && <motion.i layoutId="onboarding-folder" transition={{ duration: reduced ? 0 : .3, ease: EASE }} />}<span>{item.name}</span></button>)}</div>
    <AnimatePresence mode="wait"><motion.div className="folder-summary" key={folder} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}><span>falta pagar</span><strong>{folders[folder].total}</strong><div className="folder-meter"><motion.i initial={{ scaleX: 0 }} animate={{ scaleX: folders[folder].progress / 100 }} transition={{ duration: reduced ? 0 : .7, ease: EASE }} /></div><small>{folders[folder].progress}% organizado este mês</small></motion.div></AnimatePresence>
    <div className="receipt-stack">{(folder === 0 ? ['aluguel', 'luz', 'internet'] : ['academia', 'telefone']).map((name, index) => <motion.span layout key={name} initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: reduced ? 0 : index * .07 }}><i>{index + 1}</i>{name}<b>{index === 2 || folder === 1 ? 'pago' : 'pendente'}</b></motion.span>)}</div>
  </div>
}

function ReadyArt({ reduced }: { reduced: boolean | null }) {
  return <div className="ready-demo">
    <motion.div className="ready-ring" initial={{ scale: .7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: reduced ? 0 : .6, ease: EASE }}><Mascot size={118} /><motion.svg viewBox="0 0 100 100" animate={reduced ? undefined : { rotate: 360 }} transition={{ duration: 16, repeat: Infinity, ease: 'linear' }}><circle cx="50" cy="50" r="47" /></motion.svg></motion.div>
    <motion.div className="push-bubble" initial={{ opacity: 0, y: 18, scale: .96 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: reduced ? 0 : .28, duration: .44, ease: EASE }}><span className="push-logo"><Mascot size={36} /></span><span><strong>conta paga</strong><small>Bela pagou a internet</small></span><time>agora</time></motion.div>
    <div className="ready-dock">{['⌂', '▣', '▤', '♡'].map((icon, index) => <motion.i key={icon} className={index === 0 ? 'is-active' : ''} animate={index === 0 && !reduced ? { scale: [1, 1.12, 1] } : undefined} transition={{ duration: 2, repeat: Infinity }}>{icon}</motion.i>)}</div>
  </div>
}

function ArrowIcon({ done }: { done: boolean }) { return <motion.svg viewBox="0 0 24 24" aria-hidden animate={{ rotate: done ? -45 : 0 }}><path d="M5 12h13M14 7l5 5-5 5" /></motion.svg> }
function BagIcon() { return <svg viewBox="0 0 24 24" aria-hidden><path d="M5 8h14l-1 12H6Z"/><path d="M9 8a3 3 0 0 1 6 0"/></svg> }
