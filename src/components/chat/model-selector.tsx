'use client'

import { Badge } from '@/components/ui/badge'
import type { AIProvider } from '@/types/ai'

interface ModelSelectorProps {
  providers: AIProvider[]
  selectedProvider: string
  selectedModel: string
  onProviderChange: (provider: string) => void
  onModelChange: (model: string) => void
}

export function ModelSelector({
  providers,
  selectedProvider,
  selectedModel,
  onProviderChange,
  onModelChange,
}: ModelSelectorProps) {
  const provider = providers.find((p) => p.id === selectedProvider)

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {providers.map((p) => (
        <button
          key={p.id}
          onClick={() => {
            onProviderChange(p.id)
            onModelChange(p.defaultModel)
          }}
          className={`px-3 py-1 rounded-full text-sm font-medium border transition-colors ${
            selectedProvider === p.id
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-background text-muted-foreground border-border hover:border-primary/50'
          }`}
        >
          {p.name}
        </button>
      ))}

      {provider && (
        <select
          value={selectedModel}
          onChange={(e) => onModelChange(e.target.value)}
          className="ml-2 text-sm bg-background border border-border rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary"
        >
          {provider.models.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      )}

      {provider && (
        <Badge variant="secondary" className="text-xs">
          {provider.models.find((m) => m.id === selectedModel)?.description}
        </Badge>
      )}
    </div>
  )
}
