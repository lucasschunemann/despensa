import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { sound } from './lib/sound'
import { startSync } from './lib/sync'
import './fonts.css'
import './index.css'

sound.installUnlockListeners()

const demo = import.meta.env.DEV && new URLSearchParams(location.search).has('demo')
const Root = demo ? (await import('./dev/DemoApp')).default : App
// a fila de alterações só existe no app de verdade (o modo demonstração não fala com o servidor)
if (!demo) startSync()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
