/**
 * AI module entry point.
 * Registers all providers into the central registry.
 */

import { aiRegistry } from './registry'
import { openaiProvider } from './providers/openai'

// Register providers - add more here as needed
aiRegistry.register(openaiProvider)

export { aiRegistry }
export type { AIProviderAdapter } from './registry'
