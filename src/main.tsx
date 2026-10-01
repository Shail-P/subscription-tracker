import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Import the bundled font and Tailwind/global styles once for the whole app.
import '@fontsource-variable/roboto'
import './styles.css'
import { LoginPage } from './components/LoginPage'
import { TitleBar } from './components/TitleBar'

// The shell always shows the custom title bar. LoginPage decides whether
// to show the sign-in screen or DashboardPage based on the Supabase session.
function App() {
  return (
    // pt-10 reserves space for the fixed 40px title bar so content stays below it.
    <div className="min-h-svh bg-[#0f1115] pt-10">
      <TitleBar />
      <LoginPage />
    </div>
  )
}

// Mount React into the root div in index.html. ! tells TypeScript that the
// element exists; it does not create or check the element at runtime.
// StrictMode runs additional development checks, including effect cleanup,
// so correctly removing subscriptions/listeners matters when effects rerun.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
