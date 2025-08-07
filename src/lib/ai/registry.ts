/**
 * AI Provider Registry
 *
 * Central registry for all AI providers. To add a new provider:
 * 1. Create a file in `src/lib/ai/providers/<name>.ts` implementing `AIProviderAdapter`
 * 2. Import and register it here with `registry.register(...)`
 */

import type { LanguageModel } from 'ai'
import type { AIProvider } from '@/types/ai'

export interface AIProviderAdapter {
  metadata: AIProvider
  getModel(modelId: string): LanguageModel
}

class AIRegistry {
  private providers = new Map<string, AIProviderAdapter>()

  register(adapter: AIProviderAdapter): void {
    this.providers.set(adapter.metadata.id, adapter)
  }

  get(providerId: string): AIProviderAdapter {
    const adapter = this.providers.get(providerId)
    if (!adapter) {
      throw new Error(
        `AI provider "${providerId}" not found. Registered providers: ${[...this.providers.keys()].join(', ')}`
      )
    }
    return adapter
  }

  getModel(providerId: string, modelId?: string): LanguageModel {
    const adapter = this.get(providerId)
    const resolvedModel = modelId ?? adapter.metadata.defaultModel
    return adapter.getModel(resolvedModel)
  }

  list(): AIProvider[] {
    return [...this.providers.values()].map((a) => a.metadata)
  }

  has(providerId: string): boolean {
    return this.providers.has(providerId)
  }

  get defaultProviderId(): string {
    const first = this.providers.keys().next().value
    if (!first) throw new Error('No AI providers registered')
    return first
  }
}

export const aiRegistry = new AIRegistry()
