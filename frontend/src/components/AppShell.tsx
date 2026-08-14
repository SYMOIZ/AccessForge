import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { signOut } from '../auth'

const links = [
  ['/', 'Home'],
  ['/playground', 'Playground'],
  ['/scenarios', 'Scenarios'],
  ['/policy', 'Policy'],
  ['/advisor', 'AI Advisor'],
  ['/about', 'About'],
] as const

export function AppShell({
  email,
  onSignedOut,
  children,
}: {
  email: string
  onSignedOut: () => void
  children: ReactNode
}) {
  return (
    <div className="app-shell">
      <aside className="side">
        <div className="brand">
          <strong>ACCESSFORGE</strong>
          <span>Design. Simulate. Understand AWS Access.</span>
        </div>
        <nav className="nav">
          {links.map(([to, label]) => (
            <NavLink key={to} to={to} end={to === '/'}>
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="main">
        <header className="topbar">
          <p className="banner">
            This playground simulates access decisions and does not modify your AWS account permissions.
          </p>
          <div className="user-chip">
            <span>{email}</span>
            <button
              className="btn secondary"
              type="button"
              onClick={() => {
                signOut()
                onSignedOut()
              }}
            >
              Sign out
            </button>
          </div>
        </header>
        {children}
      </div>
    </div>
  )
}
