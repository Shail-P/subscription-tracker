import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/roboto'
import './styles.css'
import { LoginPage } from './components/LoginPage'
import { TitleBar } from './components/TitleBar'

function App() {
  return (
    <div className="min-h-svh bg-[#0f1115] pt-10">
      <TitleBar />
      <LoginPage />
    </div>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
