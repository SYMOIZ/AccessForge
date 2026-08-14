import { useEffect, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { getSession, sessionEmail } from './auth'
import { AppShell } from './components/AppShell'
import { AboutPage } from './pages/About'
import { AdvisorPage } from './pages/Advisor'
import { DashboardPage } from './pages/Dashboard'
import { LoginPage } from './pages/Login'
import { PlaygroundPage } from './pages/Playground'
import { PolicyPage } from './pages/Policy'
import { ScenariosPage } from './pages/Scenarios'
import { PlaygroundProvider } from './store'

export default function App() {
  const [email, setEmail] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  async function refresh() {
    try {
      const session = await getSession()
      setEmail(sessionEmail(session) || (session ? 'signed-in user' : null))
    } catch {
      setEmail(null)
    } finally {
      setReady(true)
    }
  }

  useEffect(() => {
    void refresh()
  }, [])

  if (!ready) {
    return <div className="auth">Loading AccessForge…</div>
  }

  if (!email) {
    return <LoginPage onSignedIn={() => void refresh()} />
  }

  return (
    <PlaygroundProvider>
      <AppShell email={email} onSignedOut={() => setEmail(null)}>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/playground" element={<PlaygroundPage />} />
          <Route path="/scenarios" element={<ScenariosPage />} />
          <Route path="/policy" element={<PolicyPage />} />
          <Route path="/advisor" element={<AdvisorPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppShell>
    </PlaygroundProvider>
  )
}
