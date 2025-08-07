export type AIModel = {
  id: string
  name: string
  description?: string
  maxTokens?: number
}

export type AIProvider = {
  id: string
  name: string
  models: AIModel[]
  defaultModel: string
}

export type ChatMessage = {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  createdAt?: Date
}

export type ChatRequest = {
  messages: ChatMessage[]
  model?: string
  provider?: string
  system?: string
  temperature?: number
  maxTokens?: number
}
