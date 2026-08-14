import {
  AuthenticationDetails,
  CognitoUser,
  CognitoUserAttribute,
  CognitoUserPool,
} from 'amazon-cognito-identity-js'
import type { CognitoUserSession } from 'amazon-cognito-identity-js'
import { config } from './config'

function pool() {
  if (!config.userPoolId || !config.userPoolClientId) {
    throw new Error('Cognito is not configured.')
  }
  return new CognitoUserPool({
    UserPoolId: config.userPoolId,
    ClientId: config.userPoolClientId,
  })
}

function user(email: string) {
  return new CognitoUser({ Username: email, Pool: pool() })
}

export function currentUser() {
  return pool().getCurrentUser()
}

export function getSession(): Promise<CognitoUserSession | null> {
  const cognitoUser = currentUser()
  if (!cognitoUser) return Promise.resolve(null)
  return new Promise((resolve, reject) => {
    cognitoUser.getSession((error: Error | null, session: CognitoUserSession | null) => {
      if (error) reject(error)
      else resolve(session)
    })
  })
}

export async function getIdToken(): Promise<string> {
  const session = await getSession()
  if (!session || !session.isValid()) {
    throw new Error('Sign in required.')
  }
  return session.getIdToken().getJwtToken()
}

export function signIn(email: string, password: string): Promise<CognitoUserSession> {
  const cognitoUser = user(email)
  const details = new AuthenticationDetails({ Username: email, Password: password })
  return new Promise((resolve, reject) => {
    cognitoUser.authenticateUser(details, {
      onSuccess: (session) => resolve(session),
      onFailure: (error) => reject(error),
    })
  })
}

export function signUp(email: string, password: string): Promise<void> {
  return new Promise((resolve, reject) => {
    pool().signUp(
      email,
      password,
      [new CognitoUserAttribute({ Name: 'email', Value: email })],
      [],
      (error) => {
        if (error) reject(error)
        else resolve()
      }
    )
  })
}

export function signOut() {
  currentUser()?.signOut()
}

export function sessionEmail(session: CognitoUserSession | null): string {
  if (!session) return ''
  const payload = session.getIdToken().decodePayload() as Record<string, string>
  return payload.email || payload['cognito:username'] || ''
}
