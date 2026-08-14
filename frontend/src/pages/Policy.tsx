import { useState } from 'react'
import { downloadJson, JsonViewer, copyText } from '../components/JsonViewer'
import { api } from '../api'
import { usePlayground } from '../store'

export function PolicyPage() {
  const store = usePlayground()
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [exportUrl, setExportUrl] = useState('')

  async function generate() {
    setError('')
    try {
      const result = await api.generatePolicy({
        actions: store.allowActions,
        resources: [store.resourceArn],
        deniedActions: store.denyActions,
      })
      store.setPolicy(result.policy)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not generate policy.')
    }
  }

  const json = store.policy ? JSON.stringify(store.policy, null, 2) : ''

  return (
    <section className="page">
      <h1>Policy</h1>
      <p className="lede">IAM-style JSON generated from the playground. Example ARNs are labeled as simulated.</p>
      {error ? <p className="error">{error}</p> : null}
      <div className="row" style={{ marginBottom: 16 }}>
        <button className="btn" type="button" onClick={generate}>
          Generate policy
        </button>
        <button
          className="btn ghost"
          type="button"
          disabled={!json}
          onClick={async () => {
            await copyText(json)
            setCopied(true)
            setTimeout(() => setCopied(false), 1200)
          }}
        >
          {copied ? 'Copied' : 'Copy JSON'}
        </button>
        <button
          className="btn secondary"
          type="button"
          disabled={!store.policy}
          onClick={() => store.policy && downloadJson('accessforge-policy.json', store.policy)}
        >
          Download JSON
        </button>
        <button
          className="btn ghost"
          type="button"
          disabled={!store.policy}
          onClick={async () => {
            if (!store.policy) return
            try {
              const result = await api.exportPolicy({ policy: store.policy })
              setExportUrl(result.url)
            } catch (err) {
              setError(err instanceof Error ? err.message : 'S3 export failed.')
            }
          }}
        >
          Export to S3
        </button>
      </div>
      {exportUrl ? (
        <p>
          <a href={exportUrl} target="_blank" rel="noreferrer">
            Open exported policy (presigned S3 URL, 15 minutes)
          </a>
        </p>
      ) : null}
      {store.policy ? <JsonViewer value={store.policy} /> : <p className="lede">Generate a policy from the playground first.</p>}
    </section>
  )
}
