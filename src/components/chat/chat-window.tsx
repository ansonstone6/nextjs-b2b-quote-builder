'use client'

import { useEffect, useRef, useState, useMemo } from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { MessageBubble } from './message-bubble'
import { ChatInput } from './chat-input'
import { ModelSelector } from './model-selector'
import type { AIProvider } from '@/types/ai'

interface ChatWindowProps {
  providers: AIProvider[]
}

export function ChatWindow({ providers }: ChatWindowProps) {
  const defaultProvider = providers[0]
  const [selectedProvider, setSelectedProvider] = useState(defaultProvider?.id ?? 'openai')
  const [selectedModel, setSelectedModel] = useState(defaultProvider?.defaultModel ?? 'gpt-4o')
  const [input, setInput] = useState('')

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: '/api/chat',
        body: { provider: selectedProvider, model: selectedModel },
      }),
    // Recreate transport when provider/model changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedProvider, selectedModel]
  )

  const { messages, sendMessage, stop, setMessages, status } = useChat({ transport })

  const isLoading = status === 'submitted' || status === 'streaming'
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleProviderChange = (provider: string) => {
    setSelectedProvider(provider)
    setMessages([])
  }

  const handleSubmit = () => {
    const text = input.trim()
    if (!text || isLoading) return
    setInput('')
    sendMessage({ text })
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b">
        <h1 className="text-lg font-semibold mb-2">AI Chat</h1>
        <ModelSelector
          providers={providers}
          selectedProvider={selectedProvider}
          selectedModel={selectedModel}
          onProviderChange={handleProviderChange}
          onModelChange={setSelectedModel}
        />
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 px-4">
        <div className="py-4 space-y-4">
          {messages.length === 0 && (
            <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
              Start a conversation
            </div>
          )}
          {messages.map((m) => {
            const text = m.parts
              .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
              .map((p) => p.text)
              .join('')
            return (
              <MessageBubble
                key={m.id}
                message={{ id: m.id, role: m.role, content: text }}
              />
            )
          })}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      <Separator />

      {/* Input */}
      <div className="px-4 py-3">
        <ChatInput
          value={input}
          onChange={setInput}
          onSubmit={handleSubmit}
          onStop={stop}
          isLoading={isLoading}
        />
        <p className="text-xs text-muted-foreground mt-2 text-center">
          AI can make mistakes. Verify important information.
        </p>
      </div>
    </div>
  )
}
