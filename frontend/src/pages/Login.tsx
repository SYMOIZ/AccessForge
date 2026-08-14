import { useState, type FormEvent } from 'react'
import { signIn, signUp } from '../auth'

export function LoginPage({ onSignedIn }: { onSignedIn: () => void }) {
  const [mode, setMode] = useState<'in' | 'up'>('in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      if (mode === 'up') {
        await signUp(email, password)
      }
      await signIn(email, password)
      onSignedIn()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="home-split">
      <section className="home-copy">
        <p className="eyebrow">AWS ACCESS CONTROL PLAYGROUND</p>
        <h1>ACCESSFORGE</h1>
        <p className="home-tag">Design. Simulate. Understand AWS Access.</p>
        <p>
          AccessForge is an educational playground for AWS-style access control. You pick a simulated
          identity, choose actions and resources, see the path as a graph, generate an IAM-style policy,
          and test whether a request would be allowed or denied.
        </p>
        <p className="banner">
          This playground simulates access decisions and does not modify your AWS account permissions.
        </p>
        <div className="home-steps">
          <article>
            <strong>1. Design</strong>
            <span>Choose an identity, permission, and resource. The access graph updates as you go.</span>
          </article>
          <article>
            <strong>2. Simulate</strong>
            <span>Run a hypothetical request and get ALLOWED, DENIED, or NEEDS REVIEW, with a reason.</span>
          </article>
          <article>
            <strong>3. Understand</strong>
            <span>Read the generated policy, risk notes, and optional Amazon Bedrock recommendation.</span>
          </article>
        </div>
      </section>
      <form className="auth-card stack" onSubmit={submit}>
        <div>
          <h2>Sign in to try it</h2>
          <p className="lede">Create a Cognito account. No AWS access keys are used in the browser.</p>
        </div>
        <label className="stack">
          <span className="label">EMAIL</span>
          <input className="field" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label className="stack">
          <span className="label">PASSWORD</span>
          <input className="field" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
          <small>At least 8 characters, with uppercase, lowercase, and a number.</small>
        </label>
        {error ? <p className="error">{error}</p> : null}
        <button className="btn" type="submit" disabled={busy}>
          {busy ? 'Working…' : mode === 'in' ? 'Sign in' : 'Create account and sign in'}
        </button>
        <button className="btn secondary" type="button" onClick={() => setMode(mode === 'in' ? 'up' : 'in')}>
          {mode === 'in' ? 'Need an account?' : 'Already have an account?'}
        </button>
      </form>
    </div>
  )
}
