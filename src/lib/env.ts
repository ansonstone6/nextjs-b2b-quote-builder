/**
 * Type-safe environment variable access.
 * Validated at runtime so missing keys surface early.
 */

function requireEnv(key: string): string {
  const value = process.env[key]
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`)
  }
  return value
}

export const env = {
  openai: {
    get apiKey() {
      return requireEnv('OPENAI_API_KEY')
    },
  },
} as const
