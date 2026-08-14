import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { catalog, DEMO_NAME } from '../data/catalog'
import { usePlayground } from '../store'
import type { Scenario } from '../types'

export function ScenariosPage() {
  const store = usePlayground()
  const nav = useNavigate()
  const [items, setItems] = useState<Scenario[]>([])
  const [name, setName] = useState(DEMO_NAME)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function refresh() {
    const result = await api.listScenarios()
    setItems(result.items)
  }

  useEffect(() => {
    refresh().catch((err: Error) => setError(err.message))
  }, [])

  async function save() {
    setBusy(true)
    setError('')
    try {
      await api.saveScenario({
        name,
        identity: store.identity,
        resources: [store.resourceArn],
        actions: store.allowActions,
        deniedActions: store.denyActions,
        policy: store.policy ?? {},
        simulationResults: store.simulation
          ? [{ ...store.simulation, action: store.simulateAction, resource: store.simulateResource }]
          : [],
        riskAnalysis: store.risk ?? {},
      })
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save scenario.')
    } finally {
      setBusy(false)
    }
  }

  function load(item: Scenario) {
    const identityName = typeof item.identity === 'string' ? item.identity : item.identity.name
    const match = catalog.identities.find((entry) => entry.name === identityName)
    const resourceArn = item.resources[0] ?? store.resourceArn
    store.setState({
      identityId: match?.id ?? 'custom-role',
      customName: match ? '' : identityName,
      allowActions: item.actions,
      denyActions: item.deniedActions ?? [],
      resourceArn,
      resourceType: resourceArn.includes('dynamodb')
        ? 'dynamodb'
        : resourceArn.includes('lambda')
          ? 'lambda'
          : resourceArn.includes('bedrock')
            ? 'bedrock'
            : 's3',
      policy: (item.policy as never) ?? null,
      simulation: item.simulationResults[0] ?? null,
      risk: (item.riskAnalysis as never) ?? null,
    })
    nav('/playground')
  }

  return (
    <section className="page">
      <h1>Scenarios</h1>
      <p className="lede">Saved only for your Cognito user. Other users cannot see these records.</p>
      {error ? <p className="error">{error}</p> : null}
      <div className="card row" style={{ marginBottom: 16 }}>
        <input className="field" value={name} onChange={(e) => setName(e.target.value)} />
        <button className="btn" type="button" onClick={save} disabled={busy}>
          {busy ? 'Saving…' : 'Save current playground'}
        </button>
      </div>
      <div className="scenario-list">
        {items.length === 0 ? <p className="lede">No saved scenarios yet.</p> : null}
        {items.map((item) => (
          <article className="card scenario-item" key={item.scenarioId}>
            <div>
              <strong>{item.name}</strong>
              <div className="lede">
                {typeof item.identity === 'string' ? item.identity : item.identity.name} · updated {item.updatedAt}
              </div>
            </div>
            <div className="row">
              <button className="btn ghost" type="button" onClick={() => load(item)}>
                Open
              </button>
              <button
                className="btn danger"
                type="button"
                onClick={async () => {
                  await api.deleteScenario(item.scenarioId)
                  await refresh()
                }}
              >
                Delete
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
