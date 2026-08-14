export const config = {
  apiUrl: (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? '',
  userPoolId: (import.meta.env.VITE_USER_POOL_ID as string | undefined) ?? '',
  userPoolClientId: (import.meta.env.VITE_USER_POOL_CLIENT_ID as string | undefined) ?? '',
  region: (import.meta.env.VITE_AWS_REGION as string | undefined) ?? 'us-east-1',
}

export function assertConfigured() {
  if (!config.apiUrl || !config.userPoolId || !config.userPoolClientId) {
    throw new Error(
      'AccessForge is missing Cognito or API configuration. Set VITE_API_URL, VITE_USER_POOL_ID, and VITE_USER_POOL_CLIENT_ID.'
    )
  }
}
