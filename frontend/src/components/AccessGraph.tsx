import type { SimulationResult } from '../types'

export function AccessGraph({
  identity,
  actions,
  denyActions = [],
  resource,
  decision,
  reason,
}: {
  identity: string
  actions: string[]
  denyActions?: string[]
  resource: string
  decision?: SimulationResult['decision'] | null
  reason?: string
}) {
  const allow = actions.filter(Boolean)
  const deny = denyActions.filter(Boolean)
  const tone = decision ?? 'IDLE'

  return (
    <div className="card access-graph">
      <div className="label">ACCESS GRAPH</div>
      <p className="graph-caption">Identity → Action → Resource</p>

      <div className="graph-flow">
        <article className="graph-node">
          <div className="label">IDENTITY</div>
          <div className="graph-value">{identity || 'Select an identity'}</div>
          <small>Simulated identity — not a real IAM user or role</small>
        </article>

        <div className="graph-connector" aria-hidden="true">
          <span />
        </div>

        <article className="graph-node">
          <div className="label">ACTION</div>
          {allow.length === 0 && deny.length === 0 ? (
            <div className="graph-value mute">Select a permission</div>
          ) : (
            <div className="graph-chips">
              {allow.map((action) => (
                <span className="chip allow" key={`allow-${action}`}>
                  {action}
                </span>
              ))}
              {deny.map((action) => (
                <span className="chip deny" key={`deny-${action}`}>
                  DENY {action}
                </span>
              ))}
            </div>
          )}
        </article>

        <div className="graph-connector" aria-hidden="true">
          <span />
        </div>

        <article className="graph-node">
          <div className="label">RESOURCE</div>
          <div className="graph-value wrap">{resource || 'Select a resource'}</div>
        </article>

        <div className="graph-connector" aria-hidden="true">
          <span />
        </div>

        <article className={`graph-node decision ${tone}`}>
          <div className="label">DECISION</div>
          <div className={`badge ${decision ?? 'IDLE'}`}>{decision ?? 'NOT SIMULATED'}</div>
          {reason ? <p className="graph-reason">{reason}</p> : (
            <small>Run Simulate access to evaluate this path.</small>
          )}
        </article>
      </div>
    </div>
  )
}
