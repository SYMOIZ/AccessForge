import { getIdToken } from './auth'
import type {
  AdvisorResult,
  Catalog,
  DashboardStats,
  PolicyDocument,
  RiskAnalysis,
  Scenario,
  SimulationResult,
} from './types'
import { config } from './config'

class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function request<T>(path: string, init: RequestInit = {}, auth = true): Promise<T> {
  if (!config.apiUrl) {
    throw new ApiError(500, 'API URL is not configured.')
  }
  const headers = new Headers(init.headers)
  headers.set('Content-Type', 'application/json')
  if (auth) {
    headers.set('Authorization', `Bearer ${await getIdToken()}`)
  }
  const response = await fetch(`${config.apiUrl}${path}`, { ...init, headers })
  const text = await response.text()
  let body: { error?: string } & T
  try {
    body = text ? (JSON.parse(text) as { error?: string } & T) : ({} as { error?: string } & T)
  } catch {
    throw new ApiError(response.status, 'The API returned an unexpected response.')
  }
  if (!response.ok) {
    throw new ApiError(response.status, body.error || 'Request failed.')
  }
  return body
}

export const api = {
  catalog: () => request<Catalog>('/catalog', { method: 'GET' }, false),
  dashboard: () => request<DashboardStats>('/dashboard'),
  generatePolicy: (payload: {
    actions: string[]
    resources: string[]
    deniedActions?: string[]
  }) => request<{ policy: PolicyDocument }>('/generate-policy', { method: 'POST', body: JSON.stringify(payload) }),
  simulate: (payload: { policy: PolicyDocument; action: string; resource: string }) =>
    request<SimulationResult>('/simulate', { method: 'POST', body: JSON.stringify(payload) }),
  analyze: (payload: { policy: PolicyDocument }) =>
    request<RiskAnalysis>('/analyze', { method: 'POST', body: JSON.stringify(payload) }),
  exportPolicy: (payload: { policy: PolicyDocument }) =>
    request<{ url: string; key: string; expiresIn: number }>('/export-policy', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  advise: (prompt: string) =>
    request<AdvisorResult>('/ai-advisor', { method: 'POST', body: JSON.stringify({ prompt }) }),
  listScenarios: () => request<{ items: Scenario[] }>('/scenarios'),
  getScenario: (id: string) => request<Scenario>(`/scenarios/${id}`),
  saveScenario: (body: Partial<Scenario> & { name: string; identity: unknown }) =>
    request<Scenario>('/scenarios', { method: 'POST', body: JSON.stringify(body) }),
  updateScenario: (id: string, body: Partial<Scenario>) =>
    request<Scenario>(`/scenarios/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteScenario: (id: string) =>
    request<{ deleted: boolean }>(`/scenarios/${id}`, { method: 'DELETE' }),
}

export { ApiError }
