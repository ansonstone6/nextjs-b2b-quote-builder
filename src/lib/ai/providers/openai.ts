import { createOpenAI } from '@ai-sdk/openai'
import type { AIProviderAdapter } from '../registry'

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export const openaiProvider: AIProviderAdapter = {
  metadata: {
    id: 'openai',
    name: 'OpenAI',
    defaultModel: 'gpt-4o',
    models: [
      {
        id: 'gpt-4o',
        name: 'GPT-4o',
        description: 'Most capable multimodal model',
        maxTokens: 128000,
      },
      {
        id: 'gpt-4o-mini',
        name: 'GPT-4o Mini',
        description: 'Fast and affordable',
        maxTokens: 128000,
      },
      {
        id: 'o1',
        name: 'o1',
        description: 'Advanced reasoning model',
        maxTokens: 200000,
      },
      {
        id: 'o3-mini',
        name: 'o3-mini',
        description: 'Fast reasoning model',
        maxTokens: 200000,
      },
    ],
  },
  getModel(modelId: string) {
    return openai(modelId)
  },
}
