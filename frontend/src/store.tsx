import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { catalog } from './data/catalog'
import type { AdvisorResult, Identity, PlaygroundState, PolicyDocument, RiskAnalysis, SimulationResult } from './types'

const STORAGE_KEY = 'accessforge.playground'

function demoState(): PlaygroundState {
  return {
    identityId: 'data-analyst',
    customName: '',
    resourceType: 's3',
    allowActions: ['s3:GetObject'],
    denyActions: ['s3:DeleteObject'],
    resourceArn: 'arn:aws:s3:::reports/*',
    policy: null,
    simulateAction: 's3:GetObject',
    simulateResource: 'arn:aws:s3:::reports/report.csv',
    simulation: null,
    risk: null,
    advisor: null,
  }
}

function loadState(): PlaygroundState {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (raw) return { ...demoState(), ...JSON.parse(raw) }
  } catch {
    /* ignore */
  }
  return demoState()
}

type Store = PlaygroundState & {
  identity: Identity
  setState: (patch: Partial<PlaygroundState>) => void
  resetDemo: () => void
  applyAdvisor: (result: AdvisorResult) => void
  setPolicy: (policy: PolicyDocument | null) => void
  setSimulation: (simulation: SimulationResult | null) => void
  setRisk: (risk: RiskAnalysis | null) => void
}

const Ctx = createContext<Store | null>(null)

export function PlaygroundProvider({ children }: { children: ReactNode }) {
  const [state, setFull] = useState<PlaygroundState>(loadState)

  const setState = (patch: Partial<PlaygroundState>) => {
    setFull((current) => {
      const next = { ...current, ...patch }
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }

  const identity = useMemo(() => {
    const found = catalog.identities.find((item) => item.id === state.identityId) ?? catalog.identities[0]
    if (found.id === 'custom-role' && state.customName.trim()) {
      return { ...found, name: state.customName.trim() }
    }
    return found
  }, [state.identityId, state.customName])

  const value: Store = {
    ...state,
    identity,
    setState,
    resetDemo: () => {
      const next = demoState()
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      setFull(next)
    },
    applyAdvisor: (result) => {
      const match = catalog.identities.find(
        (item) => item.name.toLowerCase() === result.identity.toLowerCase()
      )
      const resourceArn = result.resources[0] ?? state.resourceArn
      const resourceType = resourceArn.includes('dynamodb')
        ? 'dynamodb'
        : resourceArn.includes('lambda')
          ? 'lambda'
          : resourceArn.includes('bedrock')
            ? 'bedrock'
            : 's3'
      setState({
        identityId: match?.id ?? 'custom-role',
        customName: match ? '' : result.identity,
        allowActions: result.actions,
        denyActions: result.denied_actions,
        resourceArn,
        resourceType,
        policy: result.policy,
        simulateAction: result.actions[0] ?? state.simulateAction,
        simulateResource: resourceArn.replace('/*', '/report.csv'),
        advisor: result,
        risk: result.riskAnalysis ?? null,
        simulation: null,
      })
    },
    setPolicy: (policy) => setState({ policy }),
    setSimulation: (simulation) => setState({ simulation }),
    setRisk: (risk) => setState({ risk }),
  }

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function usePlayground() {
  const value = useContext(Ctx)
  if (!value) throw new Error('PlaygroundProvider missing')
  return value
}
