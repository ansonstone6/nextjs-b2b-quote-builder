# Next.js AI Boilerplate

Production-ready Next.js boilerplate with a pluggable AI provider registry, OpenAI integration, streaming chat, and shadcn/ui.

## Tech Stack

| Layer | Package |
|-------|---------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| UI Components | shadcn/ui + Radix UI |
| Icons | lucide-react |
| AI SDK | Vercel AI SDK (`ai`) |
| OpenAI | `@ai-sdk/openai` |
| Validation | Zod |

## Quick Start

```bash
# 1. Clone & install
npm install

# 2. Set up environment variables
cp .env.example .env.local
# Edit .env.local and add your OPENAI_API_KEY

# 3. Run
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
src/
├── app/
│   ├── api/chat/route.ts      # Streaming chat API route
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── chat/
│   │   ├── chat-window.tsx    # Main chat UI
│   │   ├── chat-input.tsx     # Textarea + send/stop buttons
│   │   ├── message-bubble.tsx # Individual message rendering
│   │   └── model-selector.tsx # Provider + model switcher
│   └── ui/                    # shadcn/ui primitives
├── lib/
│   ├── ai/
│   │   ├── registry.ts        # AIRegistry - central provider hub
│   │   ├── index.ts           # Provider registration entry point
│   │   └── providers/
│   │       └── openai.ts      # OpenAI adapter
│   ├── env.ts                 # Type-safe env access
│   └── utils.ts
└── types/
    └── ai.ts                  # Shared AI types
```

## Adding a New AI Provider

1. **Create a provider adapter** in `src/lib/ai/providers/<name>.ts`:

```ts
import { createAnthropic } from '@ai-sdk/anthropic'
import type { AIProviderAdapter } from '../registry'

const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export const anthropicProvider: AIProviderAdapter = {
  metadata: {
    id: 'anthropic',
    name: 'Anthropic',
    defaultModel: 'claude-sonnet-4-6',
    models: [
      { id: 'claude-opus-4-6', name: 'Claude Opus 4.6', maxTokens: 200000 },
      { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6', maxTokens: 200000 },
    ],
  },
  getModel(modelId) {
    return anthropic(modelId)
  },
}
```

2. **Register it** in `src/lib/ai/index.ts`:

```ts
import { anthropicProvider } from './providers/anthropic'
aiRegistry.register(anthropicProvider)
```

3. **Add the env var** to `.env.local` and `.env.example`.

That's it - the model selector and API route pick it up automatically.

## API

### `POST /api/chat`

Streams a chat response.

```json
{
  "messages": [{ "role": "user", "content": "Hello" }],
  "provider": "openai",
  "model": "gpt-4o",
  "system": "You are a helpful assistant.",
  "temperature": 0.7,
  "maxTokens": 2048
}
```

### `GET /api/chat`

Returns all registered providers and their models.
