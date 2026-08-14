export type Identity = {
  id: string
  name: string
  description: string
}

export type CatalogAction = {
  action: string
  description: string
}

export type CatalogResource = {
  id: string
  service: string
  arnTemplate: string
  exampleArn: string
  arnNote: string
  docs: string
  actions: CatalogAction[]
}

export type Catalog = {
  version: string
  source: string
  identities: Identity[]
  resources: CatalogResource[]
}

export type PolicyDocument = {
  Version: string
  Statement: Array<Record<string, unknown>>
}

export type SimulationResult = {
  decision: 'ALLOWED' | 'DENIED' | 'NEEDS_REVIEW'
  reason: string
  matchedAllow?: unknown[]
  matchedDeny?: unknown[]
  engine?: string
}

export type RiskFinding = {
  level: 'HIGH' | 'MEDIUM' | 'LOW'
  code: string
  reason: string
  recommendation: string
}

export type RiskAnalysis = {
  level: 'HIGH' | 'MEDIUM' | 'LOW'
  findings: RiskFinding[]
  summary: string
  disclaimer?: string
}

export type Scenario = {
  scenarioId: string
  userId: string
  name: string
  identity: Identity | string
  resources: string[]
  actions: string[]
  deniedActions?: string[]
  policy: PolicyDocument | Record<string, unknown>
  simulationResults: Array<SimulationResult & { action?: string; resource?: string }>
  riskAnalysis: RiskAnalysis | Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export type AdvisorResult = {
  identity: string
  resources: string[]
  actions: string[]
  denied_actions: string[]
  policy: PolicyDocument
  explanation: string
  risks: unknown[]
  riskAnalysis?: RiskAnalysis
  disclaimer?: string
}

export type DashboardStats = {
  scenarios: number
  simulations: number
  allowed: number
  denied: number
  highRisk: number
}

export type PlaygroundState = {
  identityId: string
  customName: string
  resourceType: string
  allowActions: string[]
  denyActions: string[]
  resourceArn: string
  policy: PolicyDocument | null
  simulateAction: string
  simulateResource: string
  simulation: SimulationResult | null
  risk: RiskAnalysis | null
  advisor: AdvisorResult | null
}
