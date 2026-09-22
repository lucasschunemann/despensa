import { MotionConfig } from 'motion/react'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { Atmosphere } from './components/Atmosphere'
import { sound } from './lib/sound'
import { startSync } from './lib/sync'
import { installTheme } from './lib/prefs'
import './fonts.css'
import './index.css'
import './art.css'

sound.installUnlockListeners()
installTheme()

const demo = import.meta.env.DEV && new URLSearchParams(location.search).has('demo')
const Root = demo ? (await import('./dev/DemoApp')).default : App
// a fila de alterações só existe no app de verdade (o modo demonstração não fala com o servidor)
if (!demo) startSync()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MotionConfig reducedMotion="user"><Root /><Atmosphere /></MotionConfig>
  </StrictMode>,
)
