import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import type { DashboardStats } from '../types'

const empty: DashboardStats = {
  scenarios: 0,
  simulations: 0,
  allowed: 0,
  denied: 0,
  highRisk: 0,
}

export function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>(empty)
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .dashboard()
      .then(setStats)
      .catch((err: Error) => setError(err.message))
  }, [])

  const cards = [
    ['SCENARIOS', stats.scenarios],
    ['SIMULATIONS', stats.simulations],
    ['ALLOWED', stats.allowed],
    ['DENIED', stats.denied],
    ['HIGH RISK', stats.highRisk],
  ] as const

  return (
    <section className="page">
      <p className="eyebrow">HOME</p>
      <h1>What AccessForge is</h1>
      <p className="lede">
        AccessForge is a visual AWS access-control playground. It helps you design, simulate, and
        understand IAM-style permissions without changing anything in a real AWS account.
      </p>
      <p className="banner">
        This playground simulates access decisions and does not modify your AWS account permissions.
      </p>

      <div className="home-grid">
        <article className="card">
          <h3>What it does</h3>
          <ul>
            <li>Lets you pick a simulated identity such as Data Analyst or Lambda Execution Role</li>
            <li>Attaches common actions for S3, DynamoDB, Lambda, and Bedrock</li>
            <li>Shows Identity → Action → Resource as a live access graph</li>
            <li>Generates an IAM-style policy JSON you can copy, download, or export to S3</li>
            <li>Simulates a request and returns ALLOWED, DENIED, or NEEDS REVIEW</li>
            <li>Flags simple risks such as wildcards and delete permissions</li>
            <li>Uses Amazon Bedrock Nova Lite to propose a policy from plain language</li>
            <li>Saves your scenarios in DynamoDB, visible only to your signed-in user</li>
          </ul>
        </article>
        <article className="card">
          <h3>How to use it</h3>
          <ol className="how-list">
            <li>Open Playground and load the Demo Scenario, or choose your own identity.</li>
            <li>Select a resource and permissions. Watch the access graph update.</li>
            <li>Click Generate policy, then Simulate access.</li>
            <li>Change the request to a denied action to see DENIED.</li>
            <li>Optional: ask the AI Advisor, review the recommendation, then save the scenario.</li>
          </ol>
          <p>
            <Link className="btn" to="/playground">
              Open Playground
            </Link>
          </p>
        </article>
      </div>

      <h2 className="home-stats-title">Your saved activity</h2>
      {error ? <p className="error">{error}</p> : null}
      <div className="grid-stats">
        {cards.map(([label, value]) => (
          <article className="stat" key={label}>
            <span>{label}</span>
            <b>{value}</b>
          </article>
        ))}
      </div>
      <p className="lede">These counts come from your saved scenarios. Empty accounts show zero.</p>
    </section>
  )
}
