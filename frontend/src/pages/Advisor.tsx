import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { AccessGraph } from '../components/AccessGraph'
import { JsonViewer } from '../components/JsonViewer'
import { usePlayground } from '../store'

export function AdvisorPage() {
  const store = usePlayground()
  const nav = useNavigate()
  const [prompt, setPrompt] = useState('Allow my data analyst to read reports but not delete them.')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function run() {
    setBusy(true)
    setError('')
    try {
      const result = await api.advise(prompt)
      store.applyAdvisor(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The AI recommendation could not be validated.')
    } finally {
      setBusy(false)
    }
  }

  const rec = store.advisor

  return (
    <section className="page">
      <h1>AI Advisor</h1>
      <p className="lede">Natural language becomes a reviewable recommendation via Amazon Bedrock Nova Lite. It is not attached to AWS IAM.</p>
      <div className="card stack">
        <div className="label">ACCESS REQUIREMENT</div>
        <textarea className="field" rows={4} value={prompt} onChange={(e) => setPrompt(e.target.value)} />
        <button className="btn" type="button" onClick={run} disabled={busy}>
          {busy ? 'Asking Bedrock…' : 'Generate recommendation'}
        </button>
        {error ? <p className="error">{error}</p> : null}
      </div>
      {rec ? (
        <div className="stack" style={{ marginTop: 16 }}>
          <p className="banner">{rec.disclaimer ?? 'AI-generated recommendation — review before use.'}</p>
          <AccessGraph
            identity={rec.identity}
            actions={rec.actions}
            denyActions={rec.denied_actions}
            resource={rec.resources[0] ?? ''}
            decision={store.simulation?.decision}
            reason={store.simulation?.reason}
          />
          <div className="card">
            <h3>Explanation</h3>
            <p>{rec.explanation}</p>
          </div>
          {rec.policy ? <JsonViewer value={rec.policy} /> : null}
          <div className="row">
            <button className="btn" type="button" onClick={() => nav('/playground')}>
              Open in playground
            </button>
            <button
              className="btn ghost"
              type="button"
              onClick={async () => {
                if (!store.policy) return
                store.setSimulation(
                  await api.simulate({
                    policy: store.policy,
                    action: store.simulateAction,
                    resource: store.simulateResource,
                  })
                )
              }}
            >
              Simulate
            </button>
          </div>
        </div>
      ) : null}
    </section>
  )
}
