export function AboutPage() {
  return (
    <section className="page">
      <h1>About</h1>
      <p>
        AccessForge is an educational and creative AWS access-control playground. It helps developers
        understand identity, action, resource, policy, and authorization concepts through visual simulation.
      </p>
      <p className="banner">It does not modify real AWS IAM permissions.</p>
      <div className="card">
        <h3>AWS services in this app</h3>
        <ul>
          <li>AWS Amplify Hosting — frontend</li>
          <li>AWS Lambda — API, policy engine, simulator, risk analyzer, Bedrock advisor</li>
          <li>Amazon DynamoDB — saved scenarios, scoped to your Cognito user</li>
          <li>Amazon S3 — exported policy JSON with a time-limited download URL</li>
          <li>Amazon Bedrock Nova Lite (`amazon.nova-lite-v1:0`) — natural-language policy recommendations</li>
        </ul>
      </div>
      <div className="card">
        <h3>How simulation works</h3>
        <ul>
          <li>Explicit Deny matching action and resource → DENIED</li>
          <li>Matching Allow and no matching Deny → ALLOWED</li>
          <li>No matching Allow → DENIED</li>
          <li>Condition / NotAction / NotResource → NEEDS REVIEW</li>
        </ul>
        <p className="lede">
          This is a deterministic AccessForge rule set, not a reproduction of the complete AWS IAM engine.
        </p>
      </div>
    </section>
  )
}
