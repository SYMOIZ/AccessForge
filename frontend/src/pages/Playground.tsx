import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { AccessGraph } from '../components/AccessGraph'
import { catalog } from '../data/catalog'
import { usePlayground } from '../store'

export function PlaygroundPage() {
  const nav = useNavigate()
  const store = usePlayground()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')
  const resource = catalog.resources.find((item) => item.id === store.resourceType) ?? catalog.resources[0]

  async function currentPolicy() {
    const result = await api.generatePolicy({
      actions: store.allowActions,
      resources: [store.resourceArn],
      deniedActions: store.denyActions,
    })
    store.setPolicy(result.policy)
    return result.policy
  }

  async function generate() {
    setBusy('policy')
    setError('')
    try {
      await currentPolicy()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not generate policy.')
    } finally {
      setBusy('')
    }
  }

  async function simulate() {
    setBusy('sim')
    setError('')
    try {
      const policy = await currentPolicy()
      const result = await api.simulate({
        policy,
        action: store.simulateAction,
        resource: store.simulateResource,
      })
      store.setSimulation(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Simulation failed.')
    } finally {
      setBusy('')
    }
  }

  async function analyze() {
    setBusy('risk')
    setError('')
    try {
      const policy = await currentPolicy()
      store.setRisk(await api.analyze({ policy }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Risk analysis failed.')
    } finally {
      setBusy('')
    }
  }

  const denyChoices = useMemo(
    () => resource.actions.filter((item) => !store.allowActions.includes(item.action)),
    [resource, store.allowActions]
  )

  return (
    <section className="page">
      <h1>Playground</h1>
      <p className="lede">
        Simulated identities only. Selecting Data Analyst does not create an IAM user in AWS.
      </p>
      {error ? <p className="error">{error}</p> : null}

      <div className="playground">
        <div className="card stack">
          <div className="label">IDENTITY</div>
          {catalog.identities.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`choice ${store.identityId === item.id ? 'selected' : ''}`}
              onClick={() => store.setState({ identityId: item.id, policy: null, simulation: null })}
            >
              {item.name}
              <small>{item.description}</small>
            </button>
          ))}
          {store.identityId === 'custom-role' ? (
            <input
              className="field"
              placeholder="Custom identity name"
              value={store.customName}
              onChange={(e) => store.setState({ customName: e.target.value })}
            />
          ) : null}
          <button className="btn secondary" type="button" onClick={store.resetDemo}>
            Load Demo Scenario
          </button>
        </div>

        <div className="stack">
          <AccessGraph
            identity={store.identity.name}
            actions={store.allowActions}
            denyActions={store.denyActions}
            resource={store.resourceArn}
            decision={store.simulation?.decision}
            reason={store.simulation?.reason}
          />
          <div className="card stack">
            <div className="label">SIMULATE ACCESS</div>
            <select
              className="field"
              value={store.simulateAction}
              onChange={(e) => store.setState({ simulateAction: e.target.value, simulation: null })}
            >
              {resource.actions.map((item) => (
                <option key={item.action} value={item.action}>
                  {item.action}
                </option>
              ))}
            </select>
            <input
              className="field"
              value={store.simulateResource}
              onChange={(e) => store.setState({ simulateResource: e.target.value, simulation: null })}
            />
            <div className="row">
              <button className="btn" type="button" onClick={generate} disabled={!!busy || store.allowActions.length === 0}>
                {busy === 'policy' ? 'Generating…' : 'Generate policy'}
              </button>
              <button className="btn" type="button" onClick={simulate} disabled={!!busy || store.allowActions.length === 0}>
                {busy === 'sim' ? 'Simulating…' : 'Simulate access'}
              </button>
              <button className="btn ghost" type="button" onClick={analyze} disabled={!!busy || store.allowActions.length === 0}>
                Risk analyzer
              </button>
            </div>
            {store.risk ? (
              <p>
                <span className={`badge ${store.risk.level}`}>RISK {store.risk.level}</span> {store.risk.summary}
              </p>
            ) : null}
          </div>
        </div>

        <div className="card stack">
          <div className="label">RESOURCE</div>
          {catalog.resources.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`choice ${store.resourceType === item.id ? 'selected' : ''}`}
              onClick={() =>
                store.setState({
                  resourceType: item.id,
                  resourceArn: item.exampleArn,
                  allowActions: [item.actions[0].action],
                  denyActions: [],
                  simulateAction: item.actions[0].action,
                  simulateResource: item.exampleArn,
                  policy: null,
                  simulation: null,
                  risk: null,
                })
              }
            >
              {item.service}
            </button>
          ))}
          <div className="label">PERMISSION</div>
          {resource.actions.map((item) => (
            <label key={item.action} className="choice">
              <input
                type="checkbox"
                checked={store.allowActions.includes(item.action)}
                onChange={() => {
                  const exists = store.allowActions.includes(item.action)
                  const allowActions = exists
                    ? store.allowActions.filter((action) => action !== item.action)
                    : [...store.allowActions, item.action]
                  store.setState({
                    allowActions,
                    denyActions: store.denyActions.filter((action) => action !== item.action),
                    simulateAction: allowActions[0] ?? item.action,
                    policy: null,
                    simulation: null,
                  })
                }}
              />{' '}
              {item.action}
              <small>{item.description}</small>
            </label>
          ))}
          <div className="label">EXPLICIT DENY</div>
          {denyChoices.map((item) => (
            <label key={item.action} className="choice">
              <input
                type="checkbox"
                checked={store.denyActions.includes(item.action)}
                onChange={() => {
                  const exists = store.denyActions.includes(item.action)
                  store.setState({
                    denyActions: exists
                      ? store.denyActions.filter((action) => action !== item.action)
                      : [...store.denyActions, item.action],
                    policy: null,
                    simulation: null,
                  })
                }}
              />{' '}
              {item.action}
            </label>
          ))}
          <div className="label">RESOURCE ARN</div>
          <input
            className="field"
            value={store.resourceArn}
            onChange={(e) =>
              store.setState({
                resourceArn: e.target.value,
                simulateResource: e.target.value,
                policy: null,
                simulation: null,
              })
            }
          />
          <small>{resource.arnNote}</small>
          <button className="btn secondary" type="button" onClick={() => nav('/policy')}>
            Open policy panel
          </button>
        </div>
      </div>
    </section>
  )
}
